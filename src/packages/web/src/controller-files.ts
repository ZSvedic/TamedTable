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
  parseTable,
  serializeFlow,
  type FormatId,
  type PickedFile,
  type SaveOutcome,
} from '@tamedtable/file-io';
import { specHasLlmCell } from '@tamedtable/headless';
import { missingProviderKeyMessage } from './controller-messages.ts';
import type { ControllerHost } from './controller-context.ts';

export class FilesManager {
  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
  }

  /** Open the file Open dialog and load the picked file (CSV, JSONL, Parquet,
   *  or Arrow). */
  async openCsv(): Promise<void> {
    this.host.dialog = 'open';
    this.host.notify();
    try {
      const picked = await this.host.file.pickOpen(['.csv', '.jsonl', '.parquet', '.arrow']);
      if (picked) await this.loadFromPicked(picked);
    } catch (e) {
      this.host.pushToast('error', `Could not open file: ${(e as Error).message}`);
    } finally {
      this.host.dialog = null;
      this.host.notify();
    }
  }

  private async loadFromPicked(picked: PickedFile): Promise<void> {
    // Parse the raw bytes through the file-io codec registry and load the rows
    // directly — no filesystem, no path round-trip.
    const { rows, spec } = await parseTable(picked.name, picked.bytes);
    await this.host.engine.loadParsed(rows, spec);
    this.host.pushMessage(
      'assistant',
      `Loaded ${picked.name} — ${this.host.engine.currentRows().length} rows, ${this.host.engine.currentSpec().columns.length} columns.`,
    );
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
   *  inline error; success closes the dialog at the caller. */
  async loadFromUrl(url: string): Promise<void> {
    const { name, bytes } = await fetchTable(url, this.host.opts.fetch);
    await this.loadFromPicked({ name, bytes });
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
  async saveData(): Promise<void> {
    if (!this.host.loaded) {
      this.host.pushToast('error', 'Load a file before saving data.');
      return;
    }
    const format = formatForExtension(this.host.sourcePath || '') ?? 'jsonl';
    await this.writeData(format, { keepSourceName: true });
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
    await this.writeData(format, { keepSourceName: false });
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
    this.host.savedLabel = outcome.name;
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
