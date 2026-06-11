// #FileIO
// File open/save/url handlers. Drives the FilePort dialogs, materializes
// picked or fetched content through the work dir so the engine's path-based
// loadInput seam works unchanged, and reports each save into the status
// footer. App copy and the sample list live toolbar-side; this owns only the
// load/save plumbing.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  fetchTable,
  serializeFlow,
  type PickedFile,
  type SaveOutcome,
} from '@tamedtable/file-io';
import type { ControllerHost } from './controller-context.ts';

export class FilesManager {
  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
  }

  /** Open the CSV/JSONL Open dialog and load the picked file. */
  async openCsv(): Promise<void> {
    this.host.dialog = 'open';
    this.host.notify();
    try {
      const picked = await this.host.file.pickOpen(['.csv', '.jsonl']);
      if (picked) await this.loadFromPicked(picked);
    } catch (e) {
      this.host.pushToast('error', `Could not open file: ${(e as Error).message}`);
    } finally {
      this.host.dialog = null;
      this.host.notify();
    }
  }

  private async loadFromPicked(picked: PickedFile): Promise<void> {
    // The engine reads input by path; materialize the picked content so the
    // existing Runner.loadInput seam works unchanged. In the browser this
    // path resolves through an in-memory fs shim.
    await mkdir(this.host.workDir, { recursive: true });
    const path = join(this.host.workDir, picked.name);
    await writeFile(path, picked.text, 'utf8');
    await this.host.engine.loadInput(path);
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

  /** Fetch a CSV or JSONL from `url` and render it like a local-file open.
   *  Throws on any failure so the dialog can keep itself open with an
   *  inline error; success closes the dialog at the caller. */
  async loadFromUrl(url: string): Promise<void> {
    const { name, text } = await fetchTable(url, this.host.opts.fetch);
    await this.loadFromPicked({ name, text });
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
      const flow = serializeFlow(this.host.engine.currentSpec());
      this.reportSave(await this.host.file.pickSave('flow.flow', ['.flow'], flow));
    } catch (e) {
      this.host.pushToast('error', `Could not save flow: ${(e as Error).message}`);
    } finally {
      this.host.dialog = null;
      this.host.notify();
    }
  }

  /** Save the current rows as JSONL via the Save dialog. */
  async saveData(): Promise<void> {
    if (!this.host.loaded) {
      this.host.pushToast('error', 'Load a file before saving data.');
      return;
    }
    this.host.dialog = 'save-data';
    this.host.notify();
    try {
      await mkdir(this.host.workDir, { recursive: true });
      const tmp = join(this.host.workDir, '__tamedtable_export.jsonl');
      await this.host.engine.exportAs(tmp);
      const content = await readFile(tmp, 'utf8');
      this.reportSave(await this.host.file.pickSave('data.jsonl', ['.jsonl'], content));
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
    await this.loadFromPicked({ name, text });
  }
}
