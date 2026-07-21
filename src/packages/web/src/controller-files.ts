// #FileIO
// File open/save/url handlers. Drives the FilePort dialogs, parses picked or
// fetched content through the file-io codec registry and loads the rows
// directly into the engine (no filesystem), and reports each save into the
// status footer. App copy and the sample list live toolbar-side; this owns
// only the load/save plumbing.
import {
  fetchTable,
  formatForExtension,
  loadCodec,
  parseFlow,
  parseTable,
  serializeFlow,
  type FormatId,
  type PickedFile,
  type SaveOutcome,
} from '@tamedtable/file-io';
import type { Row, TablePlan, Transformation } from '@tamedtable/core';
import { checkFlowInputColumns, describeStep, isCancelled, specHasLlmCell } from '@tamedtable/headless';
import { missingProviderKeyMessage } from './controller-messages.ts';
import type { ControllerHost } from './controller-context.ts';
import { RecentsStore, type RecentEntry } from './recents.ts';

/** The data formats the Open picker accepts. */
const OPEN_EXTENSIONS = ['.csv', '.jsonl', '.parquet', '.arrow'];

export class FilesManager {
  private readonly host: ControllerHost;
  private readonly recentsStore = new RecentsStore();
  constructor(host: ControllerHost) {
    this.host = host;
  }

  /** The Open menu's Recent entries — newest first, at most 5. */
  recents(): RecentEntry[] {
    return this.recentsStore.list();
  }

  /** Re-open a Recent entry: samples and URLs reload their address; local
   *  files and flows re-open the matching picker (the browser cannot reopen
   *  a local file silently — the entry's name is the reminder). */
  async openRecent(entry: RecentEntry): Promise<void> {
    if ((entry.kind === 'sample' || entry.kind === 'url') && entry.url) {
      try {
        await this.loadFromUrl(entry.url, entry.kind);
      } catch (e) {
        this.host.pushToast('error', `Could not open ${entry.label}: ${(e as Error).message}`);
      }
      return;
    }
    if (entry.kind === 'flow') return this.openFlow();
    return this.openCsv();
  }

  /** Open the file Open dialog and load the picked file (CSV, JSONL, Parquet,
   *  or Arrow). */
  async openCsv(): Promise<void> {
    this.host.dialog = 'open';
    this.host.notify();
    try {
      const picked = await this.host.file.pickOpen(OPEN_EXTENSIONS);
      if (picked) {
        await this.loadFromPicked(picked);
        this.recentsStore.record({ kind: 'local', label: picked.name });
      }
    } catch (e) {
      this.host.pushToast('error', `Could not open file: ${(e as Error).message}`);
    } finally {
      this.host.dialog = null;
      this.host.notify();
    }
  }

  // #OpenFlow
  /** "Open .flow & run on current data…" — pick a saved `.flow` and replay
   *  its transformations onto the currently-loaded table's source as one
   *  history entry (a single undo restores the previous spec). The run posts
   *  a `Run <flow>` user bubble, then replays behind the chat's live run
   *  progress (engine.applySpec): step/row progress, an event log, and the
   *  Stop button, which leaves the table untouched. Failures — an unreadable
   *  flow, a flow reading columns the table lacks, AI cells with no provider
   *  key — raise the modal error dialog, not a fading toast. */
  async openFlow(): Promise<void> {
    if (!this.host.loaded) {
      this.host.pushToast('error', 'Load a file before running a flow.');
      return;
    }
    this.host.dialog = 'open';
    this.host.notify();
    let started: string | null = null;
    try {
      const picked = await this.host.file.pickOpen(['.flow']);
      if (!picked) return;
      const spec = FilesManager.parseFlowFile(picked);
      const mismatch = checkFlowInputColumns(spec, this.host.engine.sourceColumns());
      if (mismatch) {
        this.host.errorDialog = `${picked.name} does not fit the current table. ${mismatch}`;
        return;
      }
      if (specHasLlmCell(spec) && !this.host.settingsMgr.activeApiKey()?.trim()) {
        this.host.errorDialog = missingProviderKeyMessage(
          this.host.config.provider,
          'Running a flow with AI cells requires',
        );
        return;
      }
      const prevSpec = structuredClone(this.host.engine.currentSpec());
      started = picked.name;
      this.host.pushMessage('user', `Run ${picked.name}`);
      await this.host.engine.applySpec(spec);
      this.host.patch.record({
        label: `Ran ${picked.name}`,
        prevSpec,
        nextSpec: structuredClone(this.host.engine.currentSpec()),
      });
      this.recentsStore.record({ kind: 'flow', label: picked.name });
      // A numbered line per step (the same labels the live progress showed),
      // then the summary — the reply mirrors a chat request's per-step reply.
      this.host.pushMessage('assistant', [
        'Executed steps:',
        ...spec.transformations.map((t, i) => `${i + 1}. ${describeStep(t as Transformation)}`),
        `Ran ${picked.name} — ${this.host.engine.currentRows().length} rows, ${this.host.engine.currentSpec().columns.length} columns.`,
      ].join('\n'));
    } catch (e) {
      // Stop is a deliberate cancel, not a failure — the replay left the
      // table untouched, so a quiet toast plus a chat line closing the
      // `Run <flow>` bubble is enough.
      if (isCancelled(e)) {
        this.host.pushToast('info', 'Flow cancelled — table unchanged.');
        this.host.pushMessage('assistant', 'Flow cancelled — table unchanged.');
      } else {
        this.host.errorDialog = `Could not run flow: ${(e as Error).message}`;
        // A run that had already started leaves its `Run <flow>` bubble in
        // the thread — close it with the same error the dialog shows.
        if (started) this.host.pushMessage('assistant', `Error: Could not run flow: ${(e as Error).message}`);
      }
    } finally {
      this.host.dialog = null;
      this.host.notify();
    }
  }

  /** Parse and validate a picked `.flow` file through file-io's parseFlow
   *  (JSON, version 1 or 2, the one TablePlan schema), prefixing errors
   *  with the file's name. */
  private static parseFlowFile(picked: PickedFile): TablePlan {
    try {
      return parseFlow(new TextDecoder().decode(picked.bytes)).spec;
    } catch (e) {
      throw new Error(`${picked.name}: ${(e as Error).message}`);
    }
  }

  /** Load a file dropped onto the empty page — the drag-and-drop counterpart
   *  of openCsv, minus the picker dialog. Same formats, same toasts. */
  async openDropped(name: string, bytes: Uint8Array): Promise<void> {
    try {
      await this.loadFromPicked({ name, bytes });
      this.recentsStore.record({ kind: 'local', label: name });
    } catch (e) {
      this.host.pushToast('error', `Could not open file: ${(e as Error).message}`);
    } finally {
      this.host.notify();
    }
  }

  // #LazyExec — the table parsed but not yet committed while the large-file
  // dialog awaits its one-click choice.
  private pendingLargeFile: { name: string; rows: Row[]; spec: TablePlan } | null = null;

  private async loadFromPicked(picked: PickedFile): Promise<void> {
    // Parse the raw bytes through the file-io codec registry and load the rows
    // directly — no filesystem, no path round-trip.
    const { rows, spec } = await parseTable(picked.name, picked.bytes);
    // #LazyExec — a file bigger than one page raises the large-file dialog:
    // one click on "Load shuffled" (the primary default) or "Load in
    // original order". A one-page file loads exactly as today.
    if (rows.length > this.host.pageSize) {
      this.pendingLargeFile = { name: picked.name, rows, spec };
      this.host.largeFileDialog = { name: picked.name, rowCount: rows.length };
      this.host.notify();
      return;
    }
    await this.commitParsed(picked.name, rows, spec);
  }

  /** Dismiss the large-file dialog without loading (tour cleanup). */
  dismissLargeFile(): void {
    if (!this.pendingLargeFile && !this.host.largeFileDialog) return;
    this.pendingLargeFile = null;
    this.host.largeFileDialog = null;
    this.host.notify();
  }

  /** Resolve the large-file dialog: commit the stashed table, shuffled (a
   *  seeded view — saving keeps original order) or in original order. */
  async resolveLargeFile(shuffled: boolean): Promise<void> {
    const pending = this.pendingLargeFile;
    if (!pending) return;
    this.pendingLargeFile = null;
    this.host.largeFileDialog = null;
    await this.commitParsed(pending.name, pending.rows, pending.spec);
    if (shuffled) this.host.view.shuffle(pending.name, pending.rows.length);
    this.host.notify();
  }

  private async commitParsed(name: string, rows: Row[], spec: TablePlan): Promise<void> {
    await this.host.engine.loadParsed(rows, spec);
    const loaded = `Loaded ${name} — ${this.host.engine.currentRows().length} rows, ${this.host.engine.currentSpec().columns.length} columns.`;
    this.host.pushMessage('assistant', loaded);
    // #Diagnostics — a load fires no toast; log it so a report names the file
    // the user was working on.
    this.host.diagnostics.recordActivity(loaded);
  }

  /** Show the Open URL modal dialog. */
  openUrlDialog(): void {
    this.host.urlDialogOpen = true;
    this.host.notify();
  }

  /** Hide the Open URL modal dialog. */
  closeUrlDialog(): void {
    this.host.urlDialogOpen = false;
    this.host.notify();
  }

  /** Show the Open-sample picker dialog. */
  openSampleDialog(): void {
    this.host.sampleDialogOpen = true;
    this.host.notify();
  }

  /** Hide the Open-sample picker dialog. */
  closeSampleDialog(): void {
    this.host.sampleDialogOpen = false;
    this.host.notify();
  }

  /** Fetch a CSV or JSONL from `url` and render it like a local-file open.
   *  Throws on any failure so the dialog can keep itself open with an
   *  inline error; success closes the dialog at the caller. `kind` labels
   *  the Recent entry — the sample picker passes 'sample'. */
  async loadFromUrl(url: string, kind: 'url' | 'sample' = 'url'): Promise<void> {
    const { name, bytes } = await fetchTable(url, this.host.opts.fetch);
    await this.loadFromPicked({ name, bytes });
    this.recentsStore.record({ kind, label: name, url });
  }

  /** Save the current flow (replayable spec) via the Save dialog. */
  async saveFlow(): Promise<void> {
    if (!this.host.loaded) {
      this.host.pushToast('error', 'Load a file before saving a flow.');
      return;
    }
    this.host.dialog = 'save-flow';
    this.host.notify();
    try {
      const flow = new TextEncoder().encode(serializeFlow(this.host.engine.currentSpec()));
      this.reportSave(await this.host.file.pickSave('flow.flow', ['.flow'], flow));
    } catch (e) {
      this.host.pushToast('error', `Could not save flow: ${(e as Error).message}`);
    } finally {
      this.host.dialog = null;
      this.host.notify();
    }
  }

  /** Export the current flow as a standalone Python script — the "Save as
   *  Python…" entry. Unlike the other saves this is model-backed (the selected
   *  provider's primary model translates the flow), so it mirrors :save-py: it
   *  needs that provider's key and refuses a flow with an {llm} cell, which has
   *  no deterministic Python form. */
  async savePython(): Promise<void> {
    if (!this.host.loaded) {
      this.host.pushToast('error', 'Load a file before saving a flow.');
      return;
    }
    if (!this.host.settingsMgr.activeApiKey()?.trim()) {
      this.host.pushToast(
        'error',
        missingProviderKeyMessage(this.host.config.provider, 'Exporting to Python requires'),
      );
      return;
    }
    if (specHasLlmCell(this.host.engine.currentSpec())) {
      this.host.pushToast(
        'error',
        'This flow has AI cells, which have no Python form — save it as a flow instead.',
      );
      return;
    }
    this.host.dialog = 'save-flow';
    this.host.notify();
    try {
      const script = new TextEncoder().encode(await this.host.engine.exportPython());
      const base = (this.host.sourcePath || '').split('/').pop() || '';
      const suggested = `${base.replace(/\.[^.]*$/, '') || 'flow'}.py`;
      this.reportSave(await this.host.file.pickSave(suggested, ['.py'], script));
    } catch (e) {
      this.host.pushToast('error', `Could not export to Python: ${(e as Error).message}`);
    } finally {
      this.host.dialog = null;
      this.host.notify();
    }
  }

  /** Save the current rows via the Save dialog, in the format the table was
   *  loaded as — CSV, JSONL, Parquet, or Arrow — so you get back what you
   *  opened. Falls back to JSONL when the source format is unknown. */
  // #LazyExec — a save that had to run rows first parks here: the run
  // consumed the click's user gesture, and the browser refuses a save picker
  // outside one, so the save-ready dialog asks for one more click.
  private pendingSave: { format: FormatId; keepSourceName: boolean } | null = null;

  async saveData(): Promise<void> {
    if (!this.host.loaded) {
      this.host.pushToast('error', 'Load a file before saving data.');
      return;
    }
    const format = formatForExtension(this.host.sourcePath || '') ?? 'jsonl';
    await this.saveGated(format, { keepSourceName: true });
  }

  /** #LazyExec — the evaluated-rows gate shared by Save and Save as: rows
   *  still pending raise the estimate/confirmation flow first (one page or
   *  less just runs); declining cancels the save. When a run happened, the
   *  file picker would fall outside the original click's user gesture — the
   *  save-ready dialog collects a fresh click instead of erroring. With
   *  nothing pending, Save skips straight to writing the file. */
  private async saveGated(format: FormatId, opts: { keepSourceName: boolean }): Promise<void> {
    const hadWork =
      this.host.lazy.pendingCount() + this.host.lazy.failedCount() > 0;
    if (!(await this.host.lazy.runOnAllRows('save'))) return;
    if (hadWork) {
      this.pendingSave = { format, ...opts };
      this.host.saveReadyDialog = true;
      this.host.notify();
      return;
    }
    await this.writeData(format, opts);
  }

  /** The save-ready dialog's "Save file…" click — a fresh user gesture. */
  async confirmSaveReady(): Promise<void> {
    const pending = this.pendingSave;
    this.pendingSave = null;
    this.host.saveReadyDialog = false;
    this.host.notify();
    if (pending) await this.writeData(pending.format, { keepSourceName: pending.keepSourceName });
  }

  dismissSaveReady(): void {
    this.pendingSave = null;
    this.host.saveReadyDialog = false;
    this.host.notify();
  }

  /** Save a copy of the current rows in a chosen format — the "Save as <format>"
   *  menu. Same dialog, but the format is the caller's pick, not the source's,
   *  and the suggested name carries that format's extension so the user gets a
   *  sensible default they can still rename. */
  async saveDataAs(format: FormatId): Promise<void> {
    if (!this.host.loaded) {
      this.host.pushToast('error', 'Load a file before saving data.');
      return;
    }
    // #LazyExec — same evaluated-rows gate as the default Save.
    await this.saveGated(format, { keepSourceName: false });
  }

  /** Shared save path: serialize the rows in `format` and open the Save dialog.
   *  `keepSourceName` reuses the opened file's name when it already matches the
   *  format (the default save); otherwise the suggested name is the source's
   *  stem with the format's extension (Save as). */
  private async writeData(format: FormatId, opts: { keepSourceName: boolean }): Promise<void> {
    this.host.dialog = 'save-data';
    this.host.notify();
    try {
      const codec = await loadCodec(format);
      const ext = codec.extensions[0] ?? '.jsonl';
      const base = (this.host.sourcePath || '').split('/').pop() || '';
      const suggested =
        opts.keepSourceName && formatForExtension(base)
          ? base
          : `${base.replace(/\.[^.]*$/, '') || 'data'}${ext}`;
      const rows = this.host.engine.currentRows();
      const columns = this.host.engine.currentSpec().columns.map((c) => c.id);
      const content = await codec.serialize(rows, columns);
      this.reportSave(await this.host.file.pickSave(suggested, [ext], content));
    } catch (e) {
      this.host.pushToast('error', `Could not save data: ${(e as Error).message}`);
    } finally {
      this.host.dialog = null;
      this.host.notify();
    }
  }

  private reportSave(outcome: SaveOutcome): void {
    if (outcome.status === 'cancelled') return;
    this.host.pushToast(
      'info',
      outcome.status === 'downloaded'
        ? `Downloaded ${outcome.name}.`
        : `Saved ${outcome.name}.`,
    );
  }

  /** Public file-load helper (also used by tutorial load-file steps). */
  async loadFromText(name: string, text: string): Promise<void> {
    await this.loadFromPicked({ name, bytes: new TextEncoder().encode(text) });
  }
}
