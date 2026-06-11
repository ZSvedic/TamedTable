// #WebUI
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
  type RequestAudio,
  type RequestDebugInfo,
} from '@tamedtable/headless';
import type { Row, Spec } from '@tamedtable/core';
import {
  ALL_MODELS,
  resolveConfig,
  type Provider,
  type ResolvedConfig,
} from '@tamedtable/model-config';
import {
  detectFormat,
  fetchTable,
  serializeFlow,
  type FetchLike,
  type FilePort,
  type PickedFile,
  type SaveOutcome,
} from '@tamedtable/file-io';
import { buildVoicePrompt, type VoiceContext, type VoicePort } from './lib/voice.ts';
import { clampPage } from './lib/pagination.ts';
import {
  readStoredConfig,
  writeStoredConfig,
} from '@tamedtable/model-config/storage';
import { userFacingMessage, summarizeDebug } from './controller-messages.ts';
import type {
  ActivityStatus,
  CellRef,
  ChatMessage,
  DialogKind,
  Toast,
  TutorialSources,
  VoiceStatus,
  WebControllerOptions,
  WebSettings,
} from './controller-types.ts';

// Public surface re-exports — keep existing imports through this module
// working without forcing every component to update its import path.
export { detectFormat, userFacingMessage, summarizeDebug };
export type {
  ActivityStatus,
  CellRef,
  ChatMessage,
  DialogKind,
  ResolvedConfig,
  Toast,
  TutorialSources,
  VoiceStatus,
  WebControllerOptions,
  WebSettings,
};

interface JournalEntry {
  label: string;
  prevSpec: Spec;
  nextSpec: Spec;
}

const PLACEHOLDER_KEY = 'tamedtable-web';

/** Placeholder chat-bubble/history label for a voice turn, replaced by
 *  `\u{1F399} <transcript>` once the model returns the transcript. */
const VOICE_REQUEST_LABEL = '\u{1F399} Voice request';

/** Rows shown per table page. Paging is a view concern — it never enters
 *  the spec — so this lives on the controller, not the spec. */
const PAGE_SIZE = 20;

// #WebServer
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

  // Voice input — recording port (browser MediaRecorder or a test stub), the
  // current mic state, and the 30 s auto-stop timer.
  private readonly voice: VoicePort | undefined;
  private voiceAbort: AbortController | null = null;
  private voiceTimer: ReturnType<typeof setTimeout> | undefined;

  // Pagination — 1-based page index over the derived rows, clamped on read.
  private pageNum = 1;
  // Filename of the most recent save, cleared by the next state change;
  // drives the status footer's "saved" reading.
  private savedLabel: string | null = null;

  // ── Public observable state (read directly by the React components) ───────
  config: ResolvedConfig;
  settingsOpen = false;
  /** Which provider card is currently expanded in the settings panel, or null
   *  when the panel is closed or no card is open. */
  expandedProvider: Provider | null = null;
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
  /** Microphone state — drives the MicButton's red ring and spinner. */
  voiceStatus: VoiceStatus = 'idle';

  // ── Tutorial panel state ─────────────────────────────────────────────────
  tutorialOpen = false;
  /** Rows loaded for a show-golden step, or null when not in a golden step. */
  goldenRows: Row[] | null = null;
  /** Text pre-filled into the chat input by a prefill-chat step, or null. */
  tutorialPrefill: string | null = null;

  private readonly tutorialSrc: TutorialSources | null;
  private activeTourIndex: number | null = null;
  private tutorialStepIndex: number | null = null;

  constructor(opts: WebControllerOptions) {
    this.opts = opts;
    this.file = opts.file;
    this.voice = opts.voice;
    this.workDir = opts.workDir ?? 'tamedtable-web-work';
    // In the browser we avoid importing process.env — guard with typeof check.
    // Tests pass opts.env = {} to suppress real API keys from the shell.
    const envVars: Record<string, string | undefined> =
      opts.env ?? (typeof process !== 'undefined' ? process.env : {});
    // Precedence: env vars > opts.config > stored config > defaults.
    this.config = resolveConfig(envVars, { ...readStoredConfig(), ...opts.config });
    this.tutorialSrc = opts.tutorialSources ?? null;
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

  /** Returns the API key for the currently-selected provider. */
  private activeApiKey(): string | undefined {
    const { provider, anthropicKey, geminiKey, openaiKey } = this.config;
    if (provider === 'gemini') return geminiKey;
    if (provider === 'openai') return openaiKey;
    return anthropicKey;
  }

  /** Build the fetch the engine uses. Tests inject the cassette recorder; the
   *  browser gets a wrapper that injects provider-specific auth headers.
   *  Anthropic requires an extra header for direct browser-to-API calls;
   *  Gemini and OpenAI handle auth through the SDK's own mechanisms. */
  private makeFetch(): FetchLike | undefined {
    if (this.opts.fetch) return this.opts.fetch;
    return (input, init) => {
      const headers = new Headers(init?.headers);
      const apiKey = this.activeApiKey();
      const provider = this.config.provider;
      if (provider === 'anthropic') {
        if (apiKey) headers.set('x-api-key', apiKey);
        headers.set('anthropic-dangerous-direct-browser-access', 'true');
      }
      // Gemini and OpenAI: the SDK sets auth headers itself from the apiKey
      // passed to createGoogleGenerativeAI / createOpenAI; no override needed.
      return fetch(input, { ...init, headers });
    };
  }

  private ensureHeadless(): HeadlessRunner {
    if (!this.headless) {
      this.headless = createHeadlessRunner({
        // Pass the active provider's key; a non-empty fallback lets the SDK
        // initialise even when no key is set yet (the real error surfaces from
        // the API response, which userFacingMessage then describes clearly).
        apiKey: this.activeApiKey() ?? PLACEHOLDER_KEY,
        model: this.config.model,
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
    opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; audio?: RequestAudio; label?: string; onTranscript?: (text: string) => void },
  ): Promise<void> {
    if (!this.loaded) throw new Error('Runner: no input loaded; call loadInput first.');
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
      await runner.request(text, { signal, onChunk, audio: opts?.audio, onTranscript: opts?.onTranscript });
      this.journal.push({
        label: opts?.label ?? text,
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
      const debug = (e as { debug?: RequestDebugInfo }).debug;
      this.fail(userFacingMessage(e, this.config.provider), debug);
    }
  }

  /** Cancel the in-flight request, if any. */
  cancelRequest(): void {
    this.activeAbort?.abort();
  }

  // ── Voice input ────────────────────────────────────────────────────────────
  // #VoiceInput

  /** True when the mic button should show: the selected model accepts voice
   *  input (catalogue voiceInput flag), the selected provider has a key, and
   *  a recording port is wired. */
  voiceAvailable(): boolean {
    if (this.voice === undefined) return false;
    const model = ALL_MODELS.find((m) => m.id === this.config.model);
    return !!model?.voiceInput && !!this.activeApiKey();
  }

  /** Press-and-hold start: begin recording, auto-stopping after 30 s. */
  async startVoice(): Promise<void> {
    if (!this.voice || this.voiceStatus !== 'idle') return;
    if (!this.voiceAvailable()) return;
    try {
      await this.voice.startRecording();
    } catch (e) {
      this.pushToast('error', `Could not start recording: ${(e as Error).message}`);
      return;
    }
    this.voiceStatus = 'recording';
    this.voiceTimer = setTimeout(() => void this.stopVoice(), 30_000);
    this.notify();
  }

  /** Release: stop recording and run the ordinary patch turn with the audio
   *  riding along as a file part — one model call, no transcription step. */
  async stopVoice(): Promise<void> {
    if (!this.voice || this.voiceStatus !== 'recording') return;
    this.clearVoiceTimer();
    this.voiceStatus = 'sending';
    this.voiceAbort = new AbortController();
    this.notify();

    let audio: RequestAudio;
    try {
      const blob = await this.voice.stopRecording();
      audio = {
        data: new Uint8Array(await blob.arrayBuffer()),
        mediaType: blob.type || 'audio/webm',
      };
    } catch (e) {
      this.pushToast('error', `Voice input failed: ${(e as Error).message}`);
      this.voiceStatus = 'idle';
      this.voiceAbort = null;
      this.notify();
      return;
    }

    // Placeholder bubble; the same model call that patches the spec also
    // returns a transcript, which replaces it the moment the call lands.
    const bubbleId = this.pushMessage('user', VOICE_REQUEST_LABEL);
    let heard: string | undefined;
    try {
      await this.request(buildVoicePrompt(this.buildVoiceContext()), {
        signal: this.voiceAbort.signal,
        audio,
        label: VOICE_REQUEST_LABEL,
        onTranscript: (t) => {
          heard = `\u{1F399} ${t}`;
          this.updateMessage(bubbleId, heard);
        },
      });
      if (heard && this.journal.length > 0) {
        this.journal[this.journal.length - 1]!.label = heard;
      }
      const debug = this.lastDebug;
      this.pushMessage('assistant', debug ? summarizeDebug(debug) : 'Done.', debug);
    } catch (e) {
      // Same failure surface as a typed request: error toast plus an
      // assistant message carrying the per-attempt debug info.
      const debug = (e as { debug?: RequestDebugInfo }).debug;
      this.fail(`Voice input failed: ${userFacingMessage(e, this.config.provider)}`, debug);
    } finally {
      this.voiceStatus = 'idle';
      this.voiceAbort = null;
      this.notify();
    }
  }

  /** Escape: discard the recording without sending anything. */
  cancelVoice(): void {
    if (this.voiceStatus === 'idle') return;
    this.clearVoiceTimer();
    this.voiceAbort?.abort();
    this.voiceAbort = null;
    try {
      this.voice?.cancelRecording();
    } catch {
      // A teardown failure must not strand the UI in a recording state.
    }
    this.voiceStatus = 'idle';
    this.notify();
  }

  private clearVoiceTimer(): void {
    if (this.voiceTimer) {
      clearTimeout(this.voiceTimer);
      this.voiceTimer = undefined;
    }
  }

  /** Snapshot the current table view for the voice instruction text. */
  private buildVoiceContext(): VoiceContext {
    const spec = this.currentSpec();
    const filename = spec.table ? basename(spec.table) : basename(this.sourcePath) || 'table';
    const columns = spec.columns.map((c) => c.id);
    const ctx: VoiceContext = { filename, columns };
    if (this.selection) {
      const value = this.displayRows()[this.selection.row]?.[this.selection.column];
      ctx.selectedCell = {
        col: this.selection.column,
        row: this.selection.row,
        value: value === undefined || value === null ? '' : String(value),
      };
    }
    return ctx;
  }

  private fail(message: string, debug?: RequestDebugInfo): void {
    this.pushToast('error', message);
    this.pushMessage('assistant', `Error: ${message}`, debug);
  }

  private pushMessage(role: ChatMessage['role'], text: string, debug?: RequestDebugInfo): number {
    this.messages = [...this.messages, { id: ++this.messageSeq, role, text, debug }];
    this.notify();
    return this.messageSeq;
  }

  /** Rewrite the text of an existing chat message (voice transcript swap). */
  private updateMessage(id: number, text: string): void {
    this.messages = this.messages.map((m) => (m.id === id ? { ...m, text } : m));
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

  /** Toggle an accordion provider card. Expanding a card also selects that
   *  provider; collapsing the already-open card does not change the provider. */
  async clickProviderCard(provider: Provider): Promise<void> {
    if (this.expandedProvider === provider) {
      // Toggle: collapse without changing provider
      this.expandedProvider = null;
    } else {
      this.expandedProvider = provider;
      // Selecting a card selects the provider and resets the model to that
      // provider's default only if the current model doesn't match the provider.
      await this.setConfig({ provider });
    }
    this.notify();
  }

  getConfig(): ResolvedConfig {
    return this.config;
  }

  /** @deprecated Use getConfig() instead. */
  getSettings(): WebSettings {
    return this.config;
  }

  /** Merge partial config, persist to storage, and rebuild the engine if the
   *  model changed and a file is loaded. */
  async setConfig(partial: Partial<ResolvedConfig>): Promise<void> {
    const next = resolveConfig({}, { ...this.config, ...partial });
    const modelChanged = next.model !== this.config.model;
    this.config = next;
    writeStoredConfig(next);
    this.savedLabel = null;

    if (modelChanged && this.headless && this.loaded) {
      const spec = structuredClone(this.currentSpec());
      try {
        this.headless = undefined;
        const runner = this.ensureHeadless();
        await runner.loadInput(this.sourcePath);
        await runner.setSpec(spec);
      } catch (e) {
        this.pushToast(
          'error',
          `Could not switch model: ${userFacingMessage(e, this.config.provider)}`,
        );
      }
    } else if (modelChanged) {
      // No engine built yet — the next ensureHeadless() picks up the model.
      this.headless = undefined;
    }

    this.notify();
  }

  /** @deprecated Use setConfig({ anthropicKey: key }) instead. */
  setApiKey(key: string): void {
    const trimmed = key.trim();
    void this.setConfig({ anthropicKey: trimmed === '' ? null : trimmed });
  }

  /** @deprecated Use setConfig({ anthropicKey: null }) instead. */
  clearApiKey(): void {
    void this.setConfig({ anthropicKey: null });
  }

  /** @deprecated Use setConfig({ model }) instead. */
  async setModel(model: string): Promise<void> {
    const next = model.trim();
    if (next === '' || next === this.config.model) return;
    await this.setConfig({ model: next });
  }

  /** @deprecated Use getConfig().model instead. */
  get settings(): WebSettings {
    return this.config;
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
    const { name, text } = await fetchTable(url, this.opts.fetch);
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
      const flow = serializeFlow(this.currentSpec());
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

  // #Patch
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

  // ── Public file-load helper (also used by tutorial load-file steps) ───────

  async loadFromText(name: string, text: string): Promise<void> {
    await this.loadFromPicked({ name, text });
  }

  // ── Tutorial panel ────────────────────────────────────────────────────────

  openTutorial(): void {
    this.tutorialOpen = true;
    this.notify();
  }

  closeTutorial(): void {
    this.tutorialOpen = false;
    this.cancelTutorial();
  }

  /** Names of `@tutorial` tours — the clickable list in the panel. */
  tutorialScenarioNames(): string[] {
    return (this.tutorialSrc?.tours ?? [])
      .filter((t) => t.tags.includes('@tutorial'))
      .map((t) => t.name);
  }

  /** Names of `@web` scenarios that are not `@tutorial` — the trailing "Dev"
   *  dropdown for smoke-testing a scenario without opening the .feature file. */
  devScenarioNames(): string[] {
    return (this.tutorialSrc?.tours ?? [])
      .filter((t) => t.tags.includes('@web') && !t.tags.includes('@tutorial'))
      .map((t) => t.name);
  }

  selectTutorialScenario(name: string): void {
    const idx = this.tutorialSrc?.tours.findIndex((t) => t.name === name) ?? -1;
    this.activeTourIndex = idx >= 0 ? idx : null;
    this.tutorialStepIndex = null;
    this.goldenRows = null;
    this.tutorialPrefill = null;
    this.notify();
  }

  async playTutorial(): Promise<void> {
    if (this.activeTourIndex === null) return;
    const tour = this.tutorialSrc?.tours[this.activeTourIndex];
    if (!tour || tour.steps.length === 0) return;
    this.tutorialStepIndex = 0;
    this.goldenRows = null;
    this.tutorialPrefill = null;
    await this.executeTutorialStep(this.tutorialStepIndex);
    this.notify();
  }

  async nextStep(): Promise<void> {
    if (this.tutorialStepIndex === null || this.activeTourIndex === null) return;
    const tour = this.tutorialSrc?.tours[this.activeTourIndex];
    if (!tour) return;
    if (this.tutorialStepIndex < tour.steps.length - 1) {
      this.tutorialStepIndex++;
      await this.executeTutorialStep(this.tutorialStepIndex);
      this.notify();
    }
  }

  prevStep(): void {
    if (this.tutorialStepIndex === null || this.tutorialStepIndex === 0) return;
    this.tutorialStepIndex--;
    this.notify();
  }

  cancelTutorial(): void {
    this.tutorialStepIndex = null;
    this.goldenRows = null;
    this.tutorialPrefill = null;
    this.notify();
  }

  isTutorialActive(): boolean {
    return this.tutorialStepIndex !== null;
  }

  currentTutorialStepNumber(): number | null {
    return this.tutorialStepIndex !== null ? this.tutorialStepIndex + 1 : null;
  }

  tutorialStepCount(): number {
    if (this.activeTourIndex === null || !this.tutorialSrc) return 0;
    return this.tutorialSrc.tours[this.activeTourIndex]?.steps.length ?? 0;
  }

  /** Name of the currently selected tour, or empty string. */
  selectedTourName(): string {
    if (this.activeTourIndex === null || !this.tutorialSrc) return '';
    return this.tutorialSrc.tours[this.activeTourIndex]?.name ?? '';
  }

  /** Keyword and text of the current step, or null when no tour is active. */
  currentStepDetail(): { keyword: string; text: string } | null {
    if (this.activeTourIndex === null || this.tutorialStepIndex === null || !this.tutorialSrc) return null;
    const step = this.tutorialSrc.tours[this.activeTourIndex]?.steps[this.tutorialStepIndex];
    return step ? { keyword: step.keyword, text: step.text } : null;
  }

  /** Driver.js element id for the current step's UI focus target. */
  currentStepElementId(): string | null {
    if (this.activeTourIndex === null || this.tutorialStepIndex === null || !this.tutorialSrc) return null;
    const step = this.tutorialSrc.tours[this.activeTourIndex]?.steps[this.tutorialStepIndex];
    if (!step) return null;
    switch (step.action.kind) {
      case 'load-file':
      case 'load-lookup': return 'tutorial-open-btn';
      case 'prefill-chat': return 'tutorial-chat-input';
      case 'show-golden':
      case 'golden-source':
      case 'display': return 'tutorial-table-view';
    }
  }

  private async executeTutorialStep(index: number): Promise<void> {
    if (this.activeTourIndex === null || !this.tutorialSrc) return;
    const tour = this.tutorialSrc.tours[this.activeTourIndex];
    const step = tour?.steps[index];
    if (!step) return;
    const { action } = step;
    switch (action.kind) {
      case 'load-file': {
        const text = this.tutorialSrc.inputs[action.filename];
        if (text !== undefined) await this.loadFromText(action.filename, text);
        break;
      }
      case 'load-lookup': {
        // Write the lookup file into the in-memory store so the engine can
        // read it by path when executing the join transformation.
        const text = this.tutorialSrc.inputs[action.filename];
        if (text !== undefined) {
          await mkdir(this.workDir, { recursive: true });
          await writeFile(join(this.workDir, action.filename), text, 'utf8');
        }
        break;
      }
      case 'prefill-chat':
        this.tutorialPrefill = action.text;
        if (!this.streaming) void this.sendChat(action.text);
        break;
      case 'show-golden': {
        // The golden filename is lifted onto the scenario by the parser (from
        // the `the expected output is "X"` step), so no step scan is needed.
        const goldenFile = tour?.golden;
        if (goldenFile) {
          const raw = this.tutorialSrc.goldens[goldenFile];
          if (raw) {
            this.goldenRows = raw.trim().split('\n').filter(Boolean)
              .map((l) => JSON.parse(l) as Row);
          }
        }
        break;
      }
      case 'golden-source':
      case 'display':
        break;
    }
  }
}

export function createWebController(opts: WebControllerOptions): WebController {
  return new WebController(opts);
}
