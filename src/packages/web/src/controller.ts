// #WebUI
// WebController — the framework-agnostic core of the web shell.
//
// It mirrors the CLI's relationship to the engine: it wraps a headless
// Runner, drives the onChunk/onDebug callbacks, owns an undo/redo journal,
// and exposes the surface the React components render. It contains no DOM
// and no JSX, so the Cucumber suite drives the very same code the browser
// runs.
//
// This file is a composition shell: it owns every observable field (the React
// components and the Cucumber web profile read these directly) plus the
// notification hub, and delegates each responsibility to a domain manager
// (engine, patch, files, voice, config, tutorial) through `ControllerHost` —
// see controller-context.ts. The delegating methods keep the public surface on
// one object; each method's contract is documented on the manager it calls.

import { DEFAULT_BATCH_SIZE, DEFAULT_CHUNK_SIZE } from '@tamedtable/headless';
import type { ChunkUpdate, RequestAudio, RequestDebugInfo, TimelineStep } from '@tamedtable/headless';
import type { Row, TablePlan } from '@tamedtable/core';
import { resolveConfig, defaultBatchSize, type Provider, type ResolvedConfig } from '@tamedtable/model-config';
import { detectFormat, type FilePort, type FormatId } from '@tamedtable/file-io';
import { clampPage, pageCountFor, pageSlice } from '@tamedtable/table-view';
import { readStoredConfig } from '@tamedtable/model-config/storage';
import { describeError, userFacingMessage, summarizeDebug, missingTextKeyMessage } from './controller-messages.ts';
import type { ControllerHost } from './controller-context.ts';
import { EngineManager } from './controller-engine.ts';
import { PatchManager } from './controller-patch.ts';
import { FilesManager } from './controller-files.ts';
import type { RecentEntry } from './recents.ts';
import { VoiceManager } from './controller-voice.ts';
import { ConfigManager } from './controller-config.ts';
import { TutorialManager } from './controller-tutorial.ts';
import { DiagnosticsManager, type DiagEvent } from './controller-diagnostics.ts';
import { LazyManager, type RunAllDialogState, type RunAllReason, type RunEstimate } from './controller-lazy.ts';
import { ViewManager, type ViewSort } from './controller-view.ts';
import type {
  CellRef,
  ChatMessage,
  ContinuousStatus,
  DialogKind,
  RunProgress,
  Toast,
  TutorialManifestEntry,
  TutorialSources,
  VoiceStatus,
  WebControllerOptions,
  WebSettings,
} from './controller-types.ts';

// Public surface re-exports — keep existing imports through this module
// working without forcing every component to update its import path.
export { detectFormat, userFacingMessage, summarizeDebug };
export type { DiagEvent, RunAllDialogState, RunAllReason, RunEstimate, ViewSort };
export type {
  CellRef,
  ChatMessage,
  ContinuousStatus,
  DialogKind,
  ResolvedConfig,
  RunProgress,
  Toast,
  TutorialManifestEntry,
  TutorialSources,
  VoiceStatus,
  WebControllerOptions,
  WebSettings,
};

/** The page size for a provider: one AI-cell concurrency wave — rows per
 *  batch × batches in flight. Host opts win; otherwise the provider's pinned
 *  cell batch (openrouter: 5 × 5 = 25) or the engine default (20 × 5 = 100). */
export function pageSizeFor(provider: Provider, opts: WebControllerOptions): number {
  if (opts.pageSize) return opts.pageSize;
  const batch = opts.batchSize ?? defaultBatchSize(provider) ?? DEFAULT_BATCH_SIZE;
  return batch * (opts.chunkSize ?? DEFAULT_CHUNK_SIZE);
}


// #WebShell
export class WebController implements ControllerHost {
  readonly opts: WebControllerOptions;
  readonly file: FilePort;

  // ── Composed domain managers ──────────────────────────────────────────────
  readonly engine: EngineManager;
  readonly patch: PatchManager;
  readonly files: FilesManager;
  readonly voice: VoiceManager;
  readonly settingsMgr: ConfigManager;
  readonly tutorial: TutorialManager;
  readonly diagnostics: DiagnosticsManager;
  readonly lazy: LazyManager;
  readonly view: ViewManager;

  private readonly listeners = new Set<() => void>();
  private revision = 0;
  private toastSeq = 0;
  private messageSeq = 0;

  // ── Public observable state (read directly by the React components) ───────
  config: ResolvedConfig;
  loaded = false;
  sourcePath = '';
  settingsOpen = false;
  /** Provider card expanded in the settings panel, or null when none is. */
  expandedProvider: Provider | null = null;
  /** Provider whose config most recently saved while the panel is open — its
   *  card header shows the "✓ Saved" badge. Cleared on panel open. */
  savedProvider: Provider | null = null;
  /** Bumped on every settings save; keys the badge so each save restarts its
   *  green phase. */
  savedSeq = 0;
  /** Tracks an in-flight native picker handshake (distinct from urlDialogOpen). */
  dialog: DialogKind = null;
  /** Live progress of the streaming run (flow replay or chat request), or
   *  null — the chat panel's inline progress block. */
  runProgress: RunProgress | null = null; // #OpenFlow
  /** Whether the Open URL modal dialog is showing. */
  urlDialogOpen = false;
  /** Whether the Open-sample picker dialog is showing. */
  sampleDialogOpen = false;
  /** A modal error message (the flow error dialog), or null when hidden —
   *  used for failures a fading toast could miss. */
  errorDialog: string | null = null;
  streaming = false;
  toasts: Toast[] = [];
  messages: ChatMessage[] = [];
  lastDebug: RequestDebugInfo | undefined;
  /** Rows per table page — a view setting the controller owns (the spec
   *  never carries a page size), sized to one AI-cell concurrency wave so a
   *  streaming page fills in as each wave of concurrent batches lands.
   *  Re-derived on config changes: the wave shrinks with the provider's
   *  pinned cell batch size. */
  pageSize: number;
  /** The selected cell, or null — tints the cell and feeds the voice prompt. */
  selection: CellRef | null = null;
  /** Microphone state — drives the MicButton's red ring and spinner. */
  voiceStatus: VoiceStatus = 'idle';
  /** Continuous voice state — drives the WaveButton's pulse and spinner. */
  continuousStatus: ContinuousStatus = 'idle';
  /** 1-based page index over the derived rows, clamped on read. */
  pageNum = 1;
  tutorialOpen = false;
  /** Rows loaded for a show-golden step, or null when not in a golden step. */
  goldenRows: Row[] | null = null;
  /** Text pre-filled into the chat input by a prefill-chat step, or null. */
  tutorialPrefill: string | null = null;
  // #LazyExec
  /** The large-file dialog (Load shuffled / Load in original order), or null. */
  largeFileDialog: { name: string; rowCount: number } | null = null;
  /** The run-on-all estimate/confirmation dialog, or null. */
  runAllDialog: RunAllDialogState | null = null;
  /** The post-run save confirmation — a save picker needs a fresh click. */
  saveReadyDialog = false;

  constructor(opts: WebControllerOptions) {
    this.opts = opts;
    this.file = opts.file;
    // In the browser we avoid importing process.env — guard with typeof check.
    // Tests pass opts.env = {} to suppress real API keys from the shell.
    const envVars: Record<string, string | undefined> =
      opts.env ?? (typeof process !== 'undefined' ? process.env : {});
    // Precedence: env vars > opts.config > stored config > defaults.
    this.config = resolveConfig(envVars, { ...readStoredConfig(), ...opts.config });
    // One concurrency wave per page (100 with the defaults, 25 on openrouter),
    // so a streaming page fills wave by wave.
    this.pageSize = pageSizeFor(this.config.provider, opts);

    // Built first so pushToast can record every toast from the moment the
    // controller exists.
    this.diagnostics = new DiagnosticsManager(this);
    this.engine = new EngineManager(this);
    this.patch = new PatchManager(this);
    this.files = new FilesManager(this);
    this.voice = new VoiceManager(this);
    this.settingsMgr = new ConfigManager(this);
    this.tutorial = new TutorialManager(this);
    this.view = new ViewManager(this);
    this.lazy = new LazyManager(this);
  }

  // ── Subscription (for React's useSyncExternalStore) ──────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getRevision = (): number => this.revision;

  notify(): void {
    this.revision++;
    for (const listener of this.listeners) listener();
  }

  // ── Notification hub: chat messages + toasts ──────────────────────────────

  pushToast(kind: Toast['kind'], message: string, action?: string): void {
    this.toasts = [...this.toasts, { id: ++this.toastSeq, kind, message, action }];
    // Every toast is a diagnostics event — the user-visible signal that
    // something happened, captured with whatever context is available.
    this.diagnostics.recordToast(kind, message);
    this.notify();
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  pushMessage(role: ChatMessage['role'], text: string, debug?: RequestDebugInfo, reportable?: boolean): number {
    this.messages = [...this.messages, { id: ++this.messageSeq, role, text, debug, reportable }];
    this.notify();
    return this.messageSeq;
  }

  /** Rewrite the text of an existing chat message (voice transcript swap). */
  updateMessage(id: number, text: string): void {
    this.messages = this.messages.map((m) => (m.id === id ? { ...m, text } : m));
    this.notify();
  }

  fail(message: string, debug?: RequestDebugInfo, reportable = true): void {
    // Every error toast offers a one-click diagnostics report, so a user who
    // hits a bug can grab the redacted, pasteable report on the spot. The
    // durable Report bug action lives on the chat message — only for app
    // errors (`reportable` defaults to true so an unclassified error is never
    // silently unreportable); guidance errors pass false.
    this.pushToast('error', message, 'Copy report');
    this.pushMessage('assistant', `Error: ${message}`, debug, reportable);
  }

  // ── Runner interface (drives the shared, surface-agnostic scenarios) ─────

  loadInput(path: string): Promise<void> { return this.engine.loadInput(path); }

  request(
    text: string,
    opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; audio?: RequestAudio; label?: string; onTranscript?: (text: string) => void },
  ): Promise<void> {
    return this.engine.request(text, opts);
  }

  currentRows(): Row[] { return this.engine.currentRows(); }
  currentSpec(): TablePlan { return this.engine.currentSpec(); }
  exportAs(path: string): Promise<void> { return this.engine.exportAs(path); }

  // ── Chat ─────────────────────────────────────────────────────────────────

  /** Send a natural-language request from the chat sidebar. Errors become
   *  toasts rather than exceptions — the table is left untouched. */
  async sendChat(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Staying in a finished tour: the engine still replays from the tour's
    // cassette, which cannot answer a request it never recorded. The UI
    // disables the input (with the STAY_REPLAY_HINT placeholder), so this
    // guard is only reachable programmatically — ignore silently, before any
    // bubble or toast.
    if (this.tutorial.isTutorialStayed()) return;
    this.pushMessage('user', trimmed);
    if (!this.loaded) {
      this.fail('Open a CSV or JSONL file before sending a request.', undefined, false);
      return;
    }
    // Text requests route through the selected provider, so a missing key for
    // that provider fails fast — before any network call — leaving the table
    // untouched. A key for a different provider does not count. A playing
    // tutorial is the exception: it replays from a cassette and needs no key.
    // See spec/behavior.md § Web UI / settings.
    if (!this.tutorial.isReplaying() && !this.settingsMgr.activeApiKey()?.trim()) {
      this.fail(missingTextKeyMessage(this.config.provider), undefined, false);
      return;
    }
    try {
      await this.engine.request(trimmed);
      const debug = this.lastDebug;
      // A wrong answer is a bug even when nothing turned red — every reply to
      // a completed request carries the Report bug action.
      const reply = debug ? summarizeDebug(debug) : 'Done.';
      this.pushMessage('assistant', reply, debug, true);
      // #Diagnostics — a completed request fires no toast, so log it explicitly
      // (with the request in recentMessages) — else a report copied after a
      // query would have no trace of it.
      this.diagnostics.recordActivity(reply);
    } catch (e) {
      // A cassette replay miss means the guided replay went off-script — end
      // the tour cleanly (toast + full cancel), never surface the raw
      // fingerprint-mismatch error.
      if (this.tutorial.consumeReplayMiss()) {
        this.pushToast('info', 'Tour ended — the guided replay went off-script.');
        this.cancelTutorial();
        return;
      }
      const debug = (e as { debug?: RequestDebugInfo }).debug;
      const { message, reportable } = describeError(e, this.config.provider);
      this.fail(message, debug, reportable);
    }
  }

  /** Cancel the in-flight request or flow replay, if any — the chat Stop
   *  button and the mobile banner's stop icon. */
  cancelRequest(): void { this.engine.cancelActive(); }

  // ── View accessors (never throw — safe before a file is loaded) ───────────

  isLoaded(): boolean { return this.loaded; }
  displaySpec(): TablePlan { return this.engine.displaySpec(); }
  /** Current rows with any in-flight streaming chunks painted on top. */
  displayRows(): Row[] { return this.engine.displayRows(); }

  // ── Pagination + view pipeline (view state — never touches the spec) ──────
  // #LazyExec — displayed rows run derived → shuffle → filters → sort → page;
  // view positions map back to derived indices through viewOrder.

  totalRows(): number { return this.viewRows().length; }
  pageCount(): number { return pageCountFor(this.totalRows(), this.pageSize); }

  /** The current 1-based page, clamped — so a request that shortens the table
   *  pulls the page back into range with no extra bookkeeping. */
  currentPage(): number { return clampPage(this.pageNum, this.pageCount()); }

  /** All display rows in view order (shuffle/filter/sort applied). */
  viewRows(): Row[] {
    const rows = this.displayRows();
    const order = this.view.viewOrder(this.engine.rawRows());
    if (order.length === rows.length && order.every((v, i) => v === i)) return rows;
    return order.map((i) => rows[i]!);
  }

  /** The slice of view rows shown on the current page. */
  pageRows(): Row[] { return pageSlice(this.viewRows(), this.currentPage(), this.pageSize); }

  /** Original (derived) row numbers for the current page — the Row # column
   *  keeps them while the view is shuffled. 1-based. */
  pageRowNumbers(): number[] {
    const order = this.view.viewOrder(this.engine.rawRows());
    const start = (this.currentPage() - 1) * this.pageSize;
    return order.slice(start, start + this.pageSize).map((i) => i + 1);
  }

  /** Row status marks for the current page ('pending' | 'failed' | undefined). */
  pageRowStatus(): Array<'pending' | 'failed' | undefined> {
    const order = this.view.viewOrder(this.engine.rawRows());
    const start = (this.currentPage() - 1) * this.pageSize;
    return order.slice(start, start + this.pageSize).map((i) => {
      const s = this.lazy.rowStatus(i);
      return s === 'evaluated' ? undefined : s;
    });
  }

  /** Map a view-absolute row position to its derived row index. */
  viewToDerived(viewIndex: number): number {
    const order = this.view.viewOrder(this.engine.rawRows());
    return order[viewIndex] ?? viewIndex;
  }

  /** Cells the last step changed on the current page, keyed
   *  "<viewAbsRow>:<column>" → previous value (the hover tooltip). */
  pageChangedCells(): Record<string, unknown> {
    if (this.engine.changedCells.size === 0) return {};
    const order = this.view.viewOrder(this.engine.rawRows());
    const start = (this.currentPage() - 1) * this.pageSize;
    const out: Record<string, unknown> = {};
    for (let pos = start; pos < Math.min(order.length, start + this.pageSize); pos++) {
      const derived = order[pos]!;
      for (const [key, before] of this.engine.changedCells) {
        const sep = key.indexOf(':');
        if (Number(key.slice(0, sep)) !== derived) continue;
        out[`${pos}:${key.slice(sep + 1)}`] = before;
      }
    }
    return out;
  }

  /** Jump to a page; out-of-range values clamp to the nearest edge. Opening
   *  a page with lagging rows queues exactly those rows for evaluation
   *  (#LazyExec) — await the returned promise to observe the filled page. */
  goToPage(page: number): Promise<void> {
    this.pageNum = clampPage(page, this.pageCount());
    this.notify();
    this.lazy.scheduleVisible();
    return this.lazy.settle();
  }

  // ── Lazy execution surface (#LazyExec) ────────────────────────────────────

  /** The pagination-bar readout ("N of M rows evaluated"), or null. */
  evaluatedReadout(): { done: number; total: number; failed: number } | null {
    return this.lazy.evaluatedReadout();
  }
  /** 1-based pages carrying pending rows — the pager dots. */
  pendingPages(): number[] { return this.lazy.pendingPages(); }
  /** The run-on-all estimate, or null when nothing is pending. */
  runEstimate(): RunEstimate | null { return this.lazy.runEstimate(); }
  /** Run every pending/failed row, behind the estimate dialog when more than
   *  one page remains. */
  runOnAllRows(): Promise<boolean> { return this.lazy.runOnAllRows('run-all'); }
  /** The readout's "Retry N failed rows". */
  retryFailedRows(): Promise<void> { return this.lazy.retryFailedRows(); }
  /** Confirm / decline the run-all estimate dialog; `applyEvaluatedOnly` is
   *  the column-menu gates' middle choice. */
  confirmRunAll(): void { this.lazy.confirmRunAll(); }
  applyEvaluatedOnly(): void { this.lazy.applyEvaluatedOnly(); }
  declineRunAll(): void { this.lazy.declineRunAll(); }
  /** The post-run save confirmation (a save picker needs a fresh click). */
  confirmSaveReady(): Promise<void> { return this.files.confirmSaveReady(); }
  dismissSaveReady(): void { this.files.dismissSaveReady(); }
  /** Cancel the in-flight run-all — finished rows are kept. */
  cancelRunAll(): void { this.lazy.cancelRun(); }
  /** Await any queued lazy evaluation (tests). */
  lazySettle(): Promise<void> { return this.lazy.settle(); }
  /** Total cell-model calls so far (tests assert redo makes none). */
  cellCallCount(): number { return this.lazy.cellCallCount(); }
  /** Load the table stashed behind the large-file dialog. */
  loadShuffled(): Promise<void> { return this.files.resolveLargeFile(true); }
  loadOriginalOrder(): Promise<void> { return this.files.resolveLargeFile(false); }

  // ── Column-menu view state (#LazyExec — view, never the spec) ─────────────

  /** The active view sort, or null. */
  viewSort(): ViewSort | null { return this.view.sort; }
  /** Per-column contains-match filters. */
  viewFilters(): Record<string, string> { return { ...this.view.filters }; }
  /** Sort from the column menu. On an AI-made column with pending rows the
   *  dependency rule shows the run-all confirmation first — with a middle
   *  "Sort evaluated rows" choice (missing values sink to the end);
   *  declining leaves the view unchanged. */
  async setViewSort(column: string, dir: 'asc' | 'desc' | null): Promise<void> {
    if (dir !== null && (await this.lazy.gateViewApply(column, 'sort')) === 'skip') return;
    this.view.setSort(column, dir);
  }
  /** Filter from the column menu — same gate as sort ("Filter evaluated
   *  rows" hides unevaluated rows from the narrowed view). */
  async setViewFilter(column: string, text: string): Promise<void> {
    if (text.trim() !== '' && (await this.lazy.gateViewApply(column, 'filter')) === 'skip') return;
    this.view.setFilter(column, text);
  }
  /** Delete a column — a spec step, exactly what the chat patch would do. */
  deleteColumn(column: string): Promise<void> { return this.patch.deleteColumn(column); }

  // ── Selection (view state — tints the cell) ───────────────────────────────

  /** Select a cell by 0-based view-absolute row index and column id. */
  selectCell(row: number, column: string): void {
    this.selection = { row, column };
    this.notify();
  }

  // ── Undo / redo + browser gestures (→ patch) ───────────────────────────────

  canUndo(): boolean { return this.patch.canUndo(); }
  canRedo(): boolean { return this.patch.canRedo(); }
  /** The undo journal, oldest first — one entry per spec-changing turn. */
  history(): Array<{ label: string }> { return this.patch.history(); }
  /** The full history timeline (done + undone) plus the current cursor. */
  historyTimeline(): { steps: TimelineStep[]; cursor: number } { return this.patch.timeline(); }
  /** Jump straight to a timeline step (mobile History sheet tap-to-jump). */
  jumpToHistory(index: number): Promise<void> { return this.patch.jumpTo(index); }
  undo(): Promise<void> { return this.patch.undo(); }
  redo(): Promise<void> { return this.patch.redo(); }
  editCell(rowIndex: number, column: string, value: string): Promise<void> {
    // The grid reports view-absolute positions; the patch keys on the
    // derived row index (which the Row # column shows).
    return this.patch.editCell(this.viewToDerived(rowIndex), column, value);
  }
  reorderColumns(order: string[]): Promise<void> { return this.patch.reorderColumns(order); }

  /** Whether closing the tab would lose work: a loaded table with any
   *  committed transformation or an undoable step. The browser shell wires
   *  this to `beforeunload` — a stray refresh must not silently discard
   *  evaluated rows or edits. */
  hasUnsavedWork(): boolean {
    if (!this.loaded) return false;
    return this.displaySpec().transformations.length > 0 || this.canUndo();
  }

  // ── File dialogs (→ files) ─────────────────────────────────────────────────

  openCsv(): Promise<void> { return this.files.openCsv(); }
  /** "Open .flow & run on current data…" — pick a saved flow and replay it
   *  onto the currently-loaded table. */
  openFlow(): Promise<void> { return this.files.openFlow(); }
  /** Hide the modal error dialog. */
  dismissErrorDialog(): void { this.errorDialog = null; this.notify(); }
  /** The Open menu's Recent entries — newest first, at most 5. */
  recents(): RecentEntry[] { return this.files.recents(); }
  /** Re-open a Recent entry (reload a URL/sample, or re-raise a picker). */
  openRecent(entry: RecentEntry): Promise<void> { return this.files.openRecent(entry); }
  /** Load a file dropped onto the empty page (drag-and-drop open). */
  openDropped(name: string, bytes: Uint8Array): Promise<void> { return this.files.openDropped(name, bytes); }
  openUrlDialog(): void { this.files.openUrlDialog(); }
  closeUrlDialog(): void { this.files.closeUrlDialog(); }
  openSampleDialog(): void { this.files.openSampleDialog(); }
  closeSampleDialog(): void { this.files.closeSampleDialog(); }
  loadFromUrl(url: string, kind: 'url' | 'sample' = 'url'): Promise<void> { return this.files.loadFromUrl(url, kind); }
  saveFlow(): Promise<void> { return this.files.saveFlow(); }
  savePython(): Promise<void> { return this.files.savePython(); }
  saveData(): Promise<void> { return this.files.saveData(); }
  saveDataAs(format: FormatId): Promise<void> { return this.files.saveDataAs(format); }
  /** Public file-load helper (also used by tutorial load-file steps). */
  loadFromText(name: string, text: string): Promise<void> { return this.files.loadFromText(name, text); }
  /** Byte-level sibling — the @web test profile's `load "<file>"` seam. */
  loadFromBytes(name: string, bytes: Uint8Array): Promise<void> { return this.files.loadFromBytes(name, bytes); }

  // ── Voice input (→ voice) ──────────────────────────────────────────────────

  voiceAvailable(): boolean { return this.voice.voiceAvailable(); }
  startVoice(): Promise<void> { return this.voice.startVoice(); }
  latchVoice(): void { this.voice.latchVoice(); }
  stopVoice(): Promise<void> { return this.voice.stopVoice(); }
  cancelVoice(): void { this.voice.cancelVoice(); }
  continuousAvailable(): boolean { return this.voice.continuousAvailable(); }
  toggleContinuous(): Promise<void> { return this.voice.toggleContinuous(); }

  // ── Settings / config (→ config) ───────────────────────────────────────────

  openSettings(): void { this.settingsMgr.openSettings(); }
  closeSettings(): void { this.settingsMgr.closeSettings(); }
  clickProviderCard(provider: Provider): Promise<void> { return this.settingsMgr.clickProviderCard(provider); }
  getConfig(): ResolvedConfig { return this.config; }
  setConfig(partial: Partial<ResolvedConfig>): Promise<void> { return this.settingsMgr.setConfig(partial); }
  /** @deprecated Use getConfig() instead. */
  getSettings(): WebSettings { return this.config; }
  /** @deprecated Use getConfig().model instead. */
  get settings(): WebSettings { return this.config; }
  /** @deprecated Use setConfig({ anthropicKey: key }) instead. */
  setApiKey(key: string): void { this.settingsMgr.setApiKey(key); }
  /** @deprecated Use setConfig({ anthropicKey: null }) instead. */
  clearApiKey(): void { this.settingsMgr.clearApiKey(); }
  /** @deprecated Use setConfig({ model }) instead. */
  setModel(model: string): Promise<void> { return this.settingsMgr.setModel(model); }

  // ── Tutorial panel (→ tutorial) ────────────────────────────────────────────

  openTutorial(): void { this.tutorial.openTutorial(); }
  closeTutorial(): void { this.tutorial.closeTutorial(); }
  tutorialScenarioNames(): string[] { return this.tutorial.tutorialScenarioNames(); }
  tutorialGroups(): { title: string; names: string[] }[] { return this.tutorial.tutorialGroups(); }
  isTourCompleted(name: string): boolean { return this.tutorial.isTourCompleted(name); }
  devScenarioNames(): string[] { return this.tutorial.devScenarioNames(); }
  selectTutorialScenario(name: string): void { this.tutorial.selectTutorialScenario(name); }
  /** Deep link: open, select by (feature, scenario), and play from step 1. */
  openTutorialFromLink(feature: string | null, scenario: string | null): Promise<boolean> {
    return this.tutorial.openTutorialFromLink(feature, scenario);
  }
  playTutorial(): Promise<void> { return this.tutorial.playTutorial(); }
  /** Await any in-flight tutorial prefill-chat request (used by tests). */
  tutorialSettle(): Promise<void> { return this.tutorial.settle(); }
  nextStep(): Promise<void> { return this.tutorial.nextStep(); }
  cancelTutorial(): void { this.tutorial.cancelTutorial(); }
  /** Cancel the active tour and reopen the Tutorial panel at the chooser. */
  finishTutorial(): void { this.tutorial.finishTutorial(); }
  /** Dismiss the terminal stop but keep the finished tour on screen. */
  stayTutorial(): void { this.tutorial.stayTutorial(); }
  /** True while the user is staying in a finished tour. */
  isTutorialStayed(): boolean { return this.tutorial.isTutorialStayed(); }
  isTutorialActive(): boolean { return this.tutorial.isTutorialActive(); }
  /** True once all steps have been executed and the tour awaits the Finish action. */
  isTutorialDone(): boolean { return this.tutorial.isTutorialDone(); }
  currentTutorialStepNumber(): number | null { return this.tutorial.currentTutorialStepNumber(); }
  tutorialStepCount(): number { return this.tutorial.tutorialStepCount(); }
  /** Name of the currently selected tour, or empty string. */
  selectedTourName(): string { return this.tutorial.selectedTourName(); }
  /** Keyword and text of the current step, or null when no tour is active. */
  currentStepDetail(): { keyword: string; text: string } | null { return this.tutorial.currentStepDetail(); }
  /** Driver.js element id for the current step's UI focus target. */
  currentStepElementId(): string | null { return this.tutorial.currentStepElementId(); }

  // ── Diagnostics log (→ diagnostics) ─────────────────────────────────────────

  /** The diagnostics log, chronological (newest last). */
  diagnosticsEvents(): DiagEvent[] { return this.diagnostics.list(); }
  /** The redacted, pasteable markdown report (newest event first). */
  diagnosticsReport(): string { return this.diagnostics.report(); }
  copyDiagnosticsReport(): Promise<void> { return this.diagnostics.copyReport(); }
  /** The prefilled GitHub new-issue URL with the redacted report. */
  bugReportUrl(): string { return this.diagnostics.bugReportUrl(); }
  /** Copy the report and open a prefilled GitHub issue for the maintainers. */
  sendBugReport(): Promise<void> { return this.diagnostics.sendBugReport(); }
  /** Report bug from the chat: record the flagged reply (and the request that
   *  produced it) as a diagnostics event, then run the send-bug-report flow —
   *  so the prefilled issue leads with the exchange being reported. */
  reportMessageBug(id: number): Promise<void> {
    const idx = this.messages.findIndex((m) => m.id === id);
    if (idx >= 0) {
      const message = this.messages[idx]!;
      // The request that produced the reply: the debug info's request text
      // when present, else the nearest user message above (an error reply
      // without debug still names what the user asked for).
      const userRequest =
        message.debug?.userRequest ??
        this.messages.slice(0, idx).reverse().find((m) => m.role === 'user')?.text;
      this.diagnostics.recordUserReport(message.text, userRequest);
    }
    return this.diagnostics.sendBugReport();
  }
  clearDiagnostics(): void { this.diagnostics.clear(); }
}

export function createWebController(opts: WebControllerOptions): WebController {
  return new WebController(opts);
}
