// #FileIO
// File open/save/url handlers. Drives the FilePort dialogs, parses picked or
// fetched content through the file-io codec registry and loads the rows
// directly into the engine (no filesystem), and confirms each save with a
// toast. App copy and the sample list live toolbar-side; this owns
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
import { missingProviderKeyMessage, numberedStepLines } from './controller-messages.ts';
import type { ControllerHost } from './controller-context.ts';
import { RecentsStore, type RecentEntry } from './recents.ts';

/** The data formats the Open picker accepts. */
const OPEN_EXTENSIONS = ['.csv', '.jsonl', '.parquet', '.arrow'];

// #LookupJoin
/** A join `spec` cannot run without asking: its step index, and the file it
 *  names — or null for a join the model emitted without a filename (the user
 *  named none; the picked file's name is written into the step). */
export type MissingLookup = { index: number; name: string | null };

/** The lookup files `spec` joins against and the session has not staged, in
 *  step order, each name asked once (every null join is its own ask). Every
 *  join is checked, not only a new one: each request replays the whole spec
 *  from the source, so any unstaged join would stop the run — and a join that
 *  ran before was staged to get that far, so it never asks twice. */
export function missingLookups(spec: TablePlan, staged: ReadonlySet<string>): MissingLookup[] {
  const missing: MissingLookup[] = [];
  const asked = new Set<string>();
  (spec.transformations as Transformation[]).forEach((t, index) => {
    if (t.kind !== 'join') return;
    if (t.with === null) {
      missing.push({ index, name: null });
      return;
    }
    if (staged.has(t.with) || asked.has(t.with)) return;
    asked.add(t.with);
    missing.push({ index, name: t.with });
  });
  return missing;
}

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
      // #LookupJoin — cancelling leaves before the run posts anything.
      if (!(await this.ensureLookups(spec))) return;
      const prevSpec = structuredClone(this.host.engine.currentSpec());
      started = picked.name;
      this.host.pushMessage('user', `Run ${picked.name}`);
      await this.host.engine.applySpec(spec);
      const historyId = this.host.patch.record({
        label: `Ran ${picked.name}`,
        prevSpec,
        nextSpec: structuredClone(this.host.engine.currentSpec()),
      });
      this.recentsStore.record({ kind: 'flow', label: picked.name });
      // A numbered line per step (the same labels the live progress showed),
      // then the summary — the reply mirrors a chat request's per-step reply,
      // linked to its journal entry so it tracks undo state. A replay is a
      // completed request, so the reply carries Report bug like a chat reply
      // does; it makes no model call, so there is no debug detail to expand.
      this.host.pushMessage('assistant', [
        'Executed steps:',
        ...numberedStepLines(spec.transformations.map((t) => describeStep(t as Transformation))),
        `Ran ${picked.name} — ${this.host.engine.currentRows().length} rows, ${this.host.engine.currentSpec().columns.length} columns.`,
      ].join('\n'), undefined, true, historyId);
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
        // the thread — close it with the same error the dialog shows. An
        // unclassified mid-run failure is an app error, so the reply carries
        // Report bug like any other app-error reply.
        if (started) this.host.pushMessage('assistant', `Error: Could not run flow: ${(e as Error).message}`, undefined, true);
      }
    } finally {
      this.host.dialog = null;
      this.host.notify();
    }
  }

  // #LookupJoin — the lookup gate, shared by the two paths that can introduce
  // a join: a chat request's patch (through the runner's confirmSpec hook) and
  // a replayed flow. Each missing file raises the dialog in turn and blocks
  // until the user picks it or cancels; cancelling answers false, and the
  // caller drops the step whole rather than half-running it.
  private lookupResolve: ((staged: boolean) => void) | null = null;
  private pendingLookup: (MissingLookup & { spec: TablePlan }) | null = null;

  async ensureLookups(spec: TablePlan): Promise<boolean> {
    for (const missing of missingLookups(spec, this.host.engine.stagedLookupNames())) {
      this.pendingLookup = { ...missing, spec };
      this.host.lookupDialog = { name: missing.name };
      this.host.notify();
      const staged = await new Promise<boolean>((resolve) => { this.lookupResolve = resolve; });
      if (!staged) return false;
    }
    return true;
  }

  /** The dialog's "Choose file…" click — a fresh user gesture, which is the
   *  only thing a file picker opens from. The picked rows stage under the name
   *  the join asked for, so a file renamed on disk still satisfies the step.
   *  A join that named no file (`with: null`) takes the picked file's own
   *  name instead — written into the step, so the executed-steps reply and a
   *  saved flow show the real file. */
  async chooseLookupFile(): Promise<void> {
    const pending = this.pendingLookup;
    if (!pending) return;
    try {
      // A null join takes the picked file's name into `with`, and the schema
      // only admits .csv/.jsonl there — so offer only those. A named join
      // keeps its own (already valid) name whatever format stands in for it.
      const picked = await this.host.file.pickOpen(pending.name === null ? ['.csv', '.jsonl'] : OPEN_EXTENSIONS);
      if (!picked) return; // picker dismissed — the dialog stays up
      const { rows } = await parseTable(picked.name, picked.bytes);
      if (pending.name === null) {
        // The runner replays and commits this same spec object, so the name
        // lands in the executed-steps labels, the stamp, and a saved flow.
        (pending.spec.transformations[pending.index] as Extract<Transformation, { kind: 'join' }>).with = picked.name;
        this.host.engine.registerLookup(picked.name, rows);
      } else {
        this.host.engine.registerLookup(pending.name, rows);
      }
      this.settleLookup(true);
    } catch (e) {
      this.host.pushToast('error', `Could not open lookup table: ${(e as Error).message}`);
    }
  }

  /** Cancel: the join has no rows to work from, so the step is dropped. */
  dismissLookupDialog(): void {
    this.settleLookup(false);
  }

  private settleLookup(staged: boolean): void {
    const resolve = this.lookupResolve;
    this.lookupResolve = null;
    this.pendingLookup = null;
    this.host.lookupDialog = null;
    this.host.notify();
    resolve?.(staged);
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

  private async loadFromPicked(picked: PickedFile, format?: FormatId): Promise<void> {
    // Opening a file is one of the two exits from a stayed tour (behavior.md
    // § Staying in the tour): leave replay mode first, so the new table gets
    // a live engine instead of the tour's cassette. Every open path — picker,
    // drop, URL, sample, scripted load — funnels through here. A *playing*
    // tour's own load-file steps also pass through, but those run while the
    // tour is active, never while stayed, so this guard cannot fire on them.
    if (this.host.tutorial.isTutorialStayed()) this.host.tutorial.cancelTutorial();
    // Parse the raw bytes through the file-io codec registry and load the rows
    // directly — no filesystem, no path round-trip. `format`, when set, is a
    // fetch's Content-Type fallback for an extension-less URL.
    const { rows, spec } = await parseTable(picked.name, picked.bytes, format);
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
    // A new table is a new conversation: loadParsed just cleared the undo
    // journal, and the thread's replies point at those entries — left in place
    // they would read as undone steps against a table they never touched. The
    // "Loaded …" line below starts the fresh thread. Running a .flow keeps the
    // thread: it transforms the table already open, it does not replace it.
    this.host.clearMessages();
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
    const { name, bytes, format } = await fetchTable(url, this.host.opts.fetch);
    await this.loadFromPicked({ name, bytes }, format);
    this.recentsStore.record({ kind, label: name, url });
    // The record lands after loadFromPicked fired its last notify, so the menu
    // needs one more render to list it — the sample picker calls this
    // fire-and-forget and closes before the record, so it has none of its own.
    this.host.notify();
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
      // Rows are keyed by column id; the CSV header uses `label` when set,
      // otherwise id (spec/behavior.md § CSV output). Other formats keep ids.
      const specColumns = this.host.engine.currentSpec().columns;
      const columns = specColumns.map((c) => c.id);
      const headers = specColumns.map((c) => c.label ?? c.id);
      const content = await codec.serialize(rows, columns, headers);
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
    await this.loadFromBytes(name, new TextEncoder().encode(text));
  }

  /** Byte-level sibling of loadFromText — the seam the @web test profile's
   *  `load "<file>"` step uses, so every scripted load takes the same
   *  loadFromPicked path (and large-file gate) a picked or dropped file does. */
  async loadFromBytes(name: string, bytes: Uint8Array): Promise<void> {
    await this.loadFromPicked({ name, bytes });
  }
}
