// WebController — the framework-agnostic core of the web shell.
//
// It mirrors the CLI's relationship to the engine: it wraps a headless
// Runner, drives the onChunk/onDebug callbacks, owns an undo/redo journal,
// and exposes the surface the React components render. It contains no DOM
// and no JSX, so the Cucumber suite drives the very same code the browser
// runs. Browser gestures (cell edit, column reorder) are translated here
// into ordinary spec patches — the same shape the LLM produces — so undo,
// history, and replay against the source all keep working.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  createHeadlessRunner,
  type ChunkUpdate,
  type HeadlessRunner,
  type RequestDebugInfo,
} from '@tamedtable/headless';
import type { Row, Spec } from '@tamedtable/core';
import type { FetchLike, FilePort, PickedFile, SaveOutcome } from './ports.ts';
import { clampPage } from './pagination.ts';

export interface WebControllerOptions {
  /** File input/output port (browser dialogs, or a test stub). */
  file: FilePort;
  /** Custom fetch — the Cucumber cassette recorder in tests; unset in the browser. */
  fetch?: FetchLike;
  /** Initial API key (tests inject one; the browser leaves it for the panel). */
  apiKey?: string;
  /** Patch-turn model the engine uses; defaults to claude-sonnet-4-6. */
  model?: string;
  /** Directory used to materialize picked files for the engine to read. */
  workDir?: string;
  batchSize?: number;
  chunkSize?: number;
}

export interface Toast {
  id: number;
  kind: 'error' | 'info';
  message: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  debug?: RequestDebugInfo;
}

export interface WebSettings {
  apiKey: string | null;
  model: string;
}

/** A cell coordinate: a 0-based row index and a column id. */
export interface CellRef {
  row: number;
  column: string;
}

/** What the engine is doing, for the status footer. */
export type ActivityStatus = 'idle' | 'running' | 'saved';

export type DialogKind = 'open' | 'save-flow' | 'save-data' | null;

interface JournalEntry {
  label: string;
  prevSpec: Spec;
  nextSpec: Spec;
}

const PLACEHOLDER_KEY = 'tamedtable-web';

/** Patch-turn model used when the caller picks none. Matches the engine's
 *  own default so recorded test cassettes keep matching. */
const DEFAULT_WEB_MODEL = 'claude-sonnet-4-6';

/** Rows shown per table page. Paging is a view concern — it never enters
 *  the spec — so this lives on the controller, not the spec. */
const PAGE_SIZE = 20;

/** Detect the file format from a URL path and (optionally) a Content-Type
 *  header. The path's extension wins; Content-Type only matters when the
 *  URL has no .csv/.jsonl ending (think query-style download URLs). */
export function detectFormat(
  pathname: string,
  contentType: string | null,
): 'csv' | 'jsonl' | null {
  const lower = pathname.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.jsonl') || lower.endsWith('.ndjson')) return 'jsonl';
  const ct = contentType?.toLowerCase() ?? '';
  if (ct.includes('csv')) return 'csv';
  if (ct.includes('jsonl') || ct.includes('ndjson')) return 'jsonl';
  return null;
}

/** Derive a friendly file name from a URL — the last path segment, or a
 *  fallback `download.<ext>` for URLs that don't expose one. */
function sampleNameFromUrl(url: URL, format: 'csv' | 'jsonl'): string {
  const segment = url.pathname.split('/').filter(Boolean).pop() ?? '';
  if (segment) return segment;
  return `download.${format}`;
}

/** Map an engine error string to a sentence a non-technical user can act on. */
export function userFacingMessage(message: string): string {
  if (message.startsWith('Runner: recovery budget exhausted'))
    return "Couldn't apply that change after 3 attempts. Try rephrasing or breaking it into smaller steps.";
  if (message === 'Runner: cancelled') return 'Request cancelled.';
  if (message === 'Runner: a request is already in progress.')
    return 'A request is already running.';
  return message;
}

/** A one-line-per-expression summary of a committed request, for the chat. */
export function summarizeDebug(info: RequestDebugInfo): string {
  const calls = info.modelCalls.map((m) => `${m.model} ×${m.calls}`).join(', ');
  const total = info.inputTokens + info.outputTokens;
  const head = info.expressions.map((e) => `${e.label}: ${e.body}`);
  const tail = `${calls} · ${total.toLocaleString('en-US')} tokens · ${(info.elapsedMs / 1000).toFixed(1)}s`;
  return [...head, tail].join('\n');
}

export class WebController {
  private readonly opts: WebControllerOptions;
  private readonly file: FilePort;
  private readonly workDir: string;

  private headless: HeadlessRunner | undefined;
  private sourcePath = '';
  private loaded = false;

  private journal: JournalEntry[] = [];
  private redoStack: JournalEntry[] = [];

  private readonly listeners = new Set<() => void>();
  private revision = 0;

  private toastSeq = 0;
  private messageSeq = 0;

  // Streaming overlay: chunk updates painted onto the displayed table while a
  // long LLM transformation runs (the engine commits only when it finishes).
  private readonly overlay = new Map<string, unknown>();
  private overlayTimer: ReturnType<typeof setTimeout> | undefined;

  private activeAbort: AbortController | null = null;

  // Pagination — 1-based page index over the derived rows, clamped on read.
  private pageNum = 1;
  // Filename of the most recent save, cleared by the next state change;
  // drives the status footer's "saved" reading.
  private savedLabel: string | null = null;

  // ── Public observable state (read directly by the React components) ───────
  settings: WebSettings;
  settingsOpen = false;
  dialog: DialogKind = null;
  /** Whether the Open URL modal dialog is showing. Independent of `dialog`,
   *  which tracks an in-flight native picker handshake. */
  urlDialogOpen = false;
  streaming = false;
  toasts: Toast[] = [];
  messages: ChatMessage[] = [];
  lastDebug: RequestDebugInfo | undefined;

  /** Rows per table page. */
  readonly pageSize = PAGE_SIZE;
  /** The selected cell, or null — drives the status footer. */
  selection: CellRef | null = null;

  constructor(opts: WebControllerOptions) {
    this.opts = opts;
    this.file = opts.file;
    this.workDir = opts.workDir ?? 'tamedtable-web-work';
    this.settings = { apiKey: opts.apiKey ?? null, model: opts.model ?? DEFAULT_WEB_MODEL };
  }

  // ── Subscription (for React's useSyncExternalStore) ──────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getRevision = (): number => this.revision;

  private notify(): void {
    this.revision++;
    for (const listener of this.listeners) listener();
  }

  // ── Engine wiring ────────────────────────────────────────────────────────

  /** Build the fetch the engine uses. Tests inject the cassette recorder; the
   *  browser gets a wrapper that injects the per-tab API key and the header
   *  Anthropic requires for direct browser-to-API calls. */
  private makeFetch(): FetchLike | undefined {
    if (this.opts.fetch) return this.opts.fetch;
    return (input, init) => {
      const headers = new Headers(init?.headers);
      if (this.settings.apiKey) headers.set('x-api-key', this.settings.apiKey);
      headers.set('anthropic-dangerous-direct-browser-access', 'true');
      return fetch(input, { ...init, headers });
    };
  }

  private ensureHeadless(): HeadlessRunner {
    if (!this.headless) {
      this.headless = createHeadlessRunner({
        // A non-empty key lets the provider build; the real key is injected
        // per-request by makeFetch() (browser) or is irrelevant (cassette).
        apiKey: this.opts.apiKey ?? PLACEHOLDER_KEY,
        model: this.settings.model,
        fetch: this.makeFetch(),
        batchSize: this.opts.batchSize,
        chunkSize: this.opts.chunkSize,
        onDebug: (info) => {
          this.lastDebug = info;
        },
      });
    }
    return this.headless;
  }

  // ── Runner interface (drives the shared, surface-agnostic scenarios) ─────

  async loadInput(path: string): Promise<void> {
    const runner = this.ensureHeadless();
    await runner.loadInput(path);
    this.sourcePath = path;
    this.loaded = true;
    this.journal = [];
    this.redoStack = [];
    this.overlay.clear();
    this.pageNum = 1;
    this.selection = null;
    this.savedLabel = null;
    this.notify();
  }

  async request(
    text: string,
    opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void },
  ): Promise<void> {
    if (!this.loaded) throw new Error('Runner: no input loaded; call loadInput first.');
    if (!this.settings.apiKey) {
      throw new Error('API key required. Open the Settings panel to add your Anthropic API key.');
    }
    const runner = this.ensureHeadless();
    const prevSpec = structuredClone(runner.currentSpec());

    const ownAbort = opts?.signal ? null : new AbortController();
    const signal = opts?.signal ?? ownAbort!.signal;
    this.activeAbort = ownAbort;
    this.streaming = true;
    this.overlay.clear();
    this.selection = null;
    this.savedLabel = null;
    this.notify();

    const onChunk = (u: ChunkUpdate): void => {
      opts?.onChunk?.(u);
      this.overlay.set(`${u.rowIndex} ${u.column}`, u.after);
      this.scheduleOverlayFlush();
    };

    try {
      await runner.request(text, { signal, onChunk });
      this.journal.push({
        label: text,
        prevSpec,
        nextSpec: structuredClone(runner.currentSpec()),
      });
      this.redoStack = [];
    } finally {
      this.activeAbort = null;
      this.streaming = false;
      this.overlay.clear();
      if (this.overlayTimer) {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = undefined;
      }
      this.notify();
    }
  }

  currentRows(): Row[] {
    return this.ensureHeadless().currentRows();
  }

  currentSpec(): Spec {
    return this.ensureHeadless().currentSpec();
  }

  async exportAs(path: string): Promise<void> {
    await this.ensureHeadless().exportAs(path);
  }

  // ── Streaming overlay ────────────────────────────────────────────────────

  private scheduleOverlayFlush(): void {
    if (this.overlayTimer) return;
    this.overlayTimer = setTimeout(() => {
      this.overlayTimer = undefined;
      this.notify();
    }, 80);
  }

  // ── View accessors (never throw — safe before a file is loaded) ───────────

  isLoaded(): boolean {
    return this.loaded;
  }

  displaySpec(): Spec {
    if (!this.loaded) return { columns: [], transformations: [] };
    return this.ensureHeadless().currentSpec();
  }

  /** The current rows with any in-flight streaming chunks painted on top. */
  displayRows(): Row[] {
    if (!this.loaded) return [];
    const rows = this.ensureHeadless().currentRows();
    if (this.overlay.size === 0) return rows;
    return rows.map((row, i) => {
      let patched: Row | undefined;
      for (const [key, value] of this.overlay) {
        const sep = key.indexOf(' ');
        if (Number(key.slice(0, sep)) !== i) continue;
        patched = patched ?? { ...row };
        patched[key.slice(sep + 1)] = value;
      }
      return patched ?? row;
    });
  }

  // ── Pagination (view state — never touches the spec) ──────────────────────

  /** Total derived rows, across every page. */
  totalRows(): number {
    return this.displayRows().length;
  }

  /** Number of pages at the fixed page size; always at least 1. */
  pageCount(): number {
    return Math.max(1, Math.ceil(this.totalRows() / this.pageSize));
  }

  /** The current 1-based page, clamped — so a request that shortens the
   *  table pulls the page back into range with no extra bookkeeping. */
  currentPage(): number {
    return clampPage(this.pageNum, this.pageCount());
  }

  /** The slice of derived rows shown on the current page. */
  pageRows(): Row[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.displayRows().slice(start, start + this.pageSize);
  }

  /** Jump to a page; out-of-range values clamp to the nearest edge. */
  goToPage(page: number): void {
    this.pageNum = clampPage(page, this.pageCount());
    this.notify();
  }

  // ── Selection + activity (the status footer) ──────────────────────────────

  /** Select a cell by 0-based row index and column id. */
  selectCell(row: number, column: string): void {
    this.selection = { row, column };
    this.notify();
  }

  /** What the engine is doing, for the status footer. */
  activityStatus(): ActivityStatus {
    if (this.streaming) return 'running';
    if (this.savedLabel) return 'saved';
    return 'idle';
  }

  canUndo(): boolean {
    return this.journal.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** The undo journal, oldest first — one entry per spec-changing turn. */
  history(): Array<{ label: string }> {
    return this.journal.map((e) => ({ label: e.label }));
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  /** Send a natural-language request from the chat sidebar. Errors become
   *  toasts rather than exceptions — the table is left untouched. */
  async sendChat(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.pushMessage('user', trimmed);
    if (!this.loaded) {
      this.fail('Open a CSV or JSONL file before sending a request.');
      return;
    }
    try {
      await this.request(trimmed);
      const debug = this.lastDebug;
      this.pushMessage('assistant', debug ? summarizeDebug(debug) : 'Done.', debug);
    } catch (e) {
      this.fail(userFacingMessage((e as Error).message));
    }
  }

  /** Cancel the in-flight request, if any. */
  cancelRequest(): void {
    this.activeAbort?.abort();
  }

  private fail(message: string): void {
    this.pushToast('error', message);
    this.pushMessage('assistant', `Error: ${message}`);
  }

  private pushMessage(role: ChatMessage['role'], text: string, debug?: RequestDebugInfo): void {
    this.messages = [...this.messages, { id: ++this.messageSeq, role, text, debug }];
    this.notify();
  }

  // ── Toasts ───────────────────────────────────────────────────────────────

  private pushToast(kind: Toast['kind'], message: string): void {
    this.toasts = [...this.toasts, { id: ++this.toastSeq, kind, message }];
    this.notify();
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  // ── Settings panel ───────────────────────────────────────────────────────

  openSettings(): void {
    this.settingsOpen = true;
    this.notify();
  }

  closeSettings(): void {
    this.settingsOpen = false;
    this.notify();
  }

  setApiKey(key: string): void {
    this.settings = { ...this.settings, apiKey: key.trim() === '' ? null : key.trim() };
    this.notify();
  }

  clearApiKey(): void {
    this.settings = { ...this.settings, apiKey: null };
    this.notify();
  }

  getSettings(): WebSettings {
    return this.settings;
  }

  /** Pick the patch-turn model. With a file loaded this rebuilds the engine
   *  with the new model and replays the current spec against the source, so
   *  the table on screen is preserved; the new model drives the next request. */
  async setModel(model: string): Promise<void> {
    const next = model.trim();
    if (next === '' || next === this.settings.model) return;
    this.settings = { ...this.settings, model: next };
    this.savedLabel = null;
    if (this.headless && this.loaded) {
      const spec = structuredClone(this.currentSpec());
      try {
        this.headless = undefined;
        const runner = this.ensureHeadless();
        await runner.loadInput(this.sourcePath);
        await runner.setSpec(spec);
      } catch (e) {
        this.pushToast(
          'error',
          `Could not switch model: ${userFacingMessage((e as Error).message)}`,
        );
      }
    } else {
      // No engine built yet — the next ensureHeadless() picks up the model.
      this.headless = undefined;
    }
    this.notify();
  }

  // ── File dialogs ─────────────────────────────────────────────────────────

  /** Open the CSV/JSONL Open dialog and load the picked file. */
  async openCsv(): Promise<void> {
    this.dialog = 'open';
    this.notify();
    try {
      const picked = await this.file.pickOpen(['.csv', '.jsonl']);
      if (picked) await this.loadFromPicked(picked);
    } catch (e) {
      this.pushToast('error', `Could not open file: ${(e as Error).message}`);
    } finally {
      this.dialog = null;
      this.notify();
    }
  }

  private async loadFromPicked(picked: PickedFile): Promise<void> {
    // The engine reads input by path; materialize the picked content so the
    // existing Runner.loadInput seam works unchanged. In the browser this
    // path resolves through an in-memory fs shim.
    await mkdir(this.workDir, { recursive: true });
    const path = join(this.workDir, picked.name);
    await writeFile(path, picked.text, 'utf8');
    await this.loadInput(path);
    this.pushMessage(
      'assistant',
      `Loaded ${picked.name} — ${this.currentRows().length} rows, ${this.currentSpec().columns.length} columns.`,
    );
  }

  /** Show the Open URL modal dialog. */
  openUrlDialog(): void {
    this.urlDialogOpen = true;
    this.notify();
  }

  /** Hide the Open URL modal dialog. */
  closeUrlDialog(): void {
    this.urlDialogOpen = false;
    this.notify();
  }

  /** Fetch a CSV or JSONL from `url` and render it like a local-file open.
   *  Throws on any failure so the dialog can keep itself open with an
   *  inline error; success closes the dialog at the caller. */
  async loadFromUrl(url: string): Promise<void> {
    const trimmed = url.trim();
    if (!trimmed) throw new Error('Enter a URL.');
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error('That doesn’t look like a valid URL.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only http:// and https:// URLs are supported.');
    }

    let response: Response;
    try {
      response = await fetch(parsed.toString(), { redirect: 'follow' });
    } catch (e) {
      // A network/CORS failure surfaces as a TypeError with no useful
      // detail in the browser. Rewrite to something the user can act on.
      throw new Error(
        `Couldn’t fetch ${parsed.hostname} — network error or CORS blocked. (${(e as Error).message})`,
      );
    }
    if (!response.ok) {
      throw new Error(`Fetch failed: HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const format = detectFormat(parsed.pathname, contentType);
    if (!format) {
      throw new Error('Could not detect format. URL must end in .csv or .jsonl.');
    }

    const text = await response.text();
    const name = sampleNameFromUrl(parsed, format);
    await this.loadFromPicked({ name, text });
  }

  /** Save the current flow (replayable spec) via the Save dialog. */
  async saveFlow(): Promise<void> {
    if (!this.loaded) {
      this.pushToast('error', 'Load a file before saving a flow.');
      return;
    }
    this.dialog = 'save-flow';
    this.notify();
    try {
      const spec = this.currentSpec();
      const source = spec.table ? basename(spec.table) : 'input.csv';
      const flow = JSON.stringify({ version: 2, source, spec }, null, 2) + '\n';
      this.reportSave(await this.file.pickSave('flow.flow', ['.flow'], flow));
    } catch (e) {
      this.pushToast('error', `Could not save flow: ${(e as Error).message}`);
    } finally {
      this.dialog = null;
      this.notify();
    }
  }

  /** Save the current rows as JSONL via the Save dialog. */
  async saveData(): Promise<void> {
    if (!this.loaded) {
      this.pushToast('error', 'Load a file before saving data.');
      return;
    }
    this.dialog = 'save-data';
    this.notify();
    try {
      await mkdir(this.workDir, { recursive: true });
      const tmp = join(this.workDir, '__tamedtable_export.jsonl');
      await this.exportAs(tmp);
      const content = await readFile(tmp, 'utf8');
      this.reportSave(await this.file.pickSave('data.jsonl', ['.jsonl'], content));
    } catch (e) {
      this.pushToast('error', `Could not save data: ${(e as Error).message}`);
    } finally {
      this.dialog = null;
      this.notify();
    }
  }

  private reportSave(outcome: SaveOutcome): void {
    if (outcome.status === 'cancelled') return;
    this.savedLabel = outcome.name;
    this.pushToast(
      'info',
      outcome.status === 'downloaded'
        ? `Downloaded ${outcome.name}.`
        : `Saved ${outcome.name}.`,
    );
  }

  // ── Browser gestures → spec patches ──────────────────────────────────────

  /** A cell edit becomes a `mutate` keyed by row index — an ordinary,
   *  undoable spec patch that replays against the source. */
  async editCell(rowIndex: number, column: string, value: string): Promise<void> {
    await this.applySpecChange(`edit ${column} row ${rowIndex + 1}`, (spec) => ({
      ...spec,
      transformations: [
        ...spec.transformations,
        {
          kind: 'mutate' as const,
          columns: column,
          value: {
            js: `i === ${rowIndex} ? ${JSON.stringify(value)} : row[${JSON.stringify(column)}]`,
          },
        },
      ],
    }));
  }

  /** A column-reorder gesture: the named columns move to the front, in order;
   *  the rest keep their relative order. Recorded so undo reverses it. */
  async reorderColumns(order: string[]): Promise<void> {
    await this.applySpecChange('reorder columns', (spec) => {
      const byId = new Map(spec.columns.map((c) => [c.id, c]));
      const named = new Set(order);
      const moved = order.map((id) => byId.get(id)).filter((c): c is Spec['columns'][number] => !!c);
      const rest = spec.columns.filter((c) => !named.has(c.id));
      return { ...spec, columns: [...moved, ...rest] };
    });
  }

  private async applySpecChange(label: string, build: (spec: Spec) => Spec): Promise<void> {
    const runner = this.ensureHeadless();
    if (!this.loaded) throw new Error('Runner: no input loaded; call loadInput first.');
    const prevSpec = structuredClone(runner.currentSpec());
    await runner.setSpec(build(prevSpec));
    this.journal.push({
      label,
      prevSpec,
      nextSpec: structuredClone(runner.currentSpec()),
    });
    this.redoStack = [];
    this.savedLabel = null;
    this.notify();
  }

  // ── Undo / redo ──────────────────────────────────────────────────────────

  async undo(): Promise<void> {
    const entry = this.journal.pop();
    if (!entry) {
      this.pushToast('info', 'Nothing to undo.');
      return;
    }
    await this.ensureHeadless().setSpec(entry.prevSpec);
    this.redoStack.push(entry);
    this.savedLabel = null;
    this.selection = null;
    this.notify();
  }

  async redo(): Promise<void> {
    const entry = this.redoStack.pop();
    if (!entry) {
      this.pushToast('info', 'Nothing to redo.');
      return;
    }
    await this.ensureHeadless().setSpec(entry.nextSpec);
    this.journal.push(entry);
    this.savedLabel = null;
    this.selection = null;
    this.notify();
  }
}

export function createWebController(opts: WebControllerOptions): WebController {
  return new WebController(opts);
}
