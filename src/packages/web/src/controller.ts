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

import type { ChunkUpdate, RequestAudio, RequestDebugInfo, TimelineStep } from '@tamedtable/headless';
import type { Row, TablePlan } from '@tamedtable/core';
import { resolveConfig, type Provider, type ResolvedConfig } from '@tamedtable/model-config';
import { detectFormat, type FilePort, type FormatId } from '@tamedtable/file-io';
import { clampPage, pageCountFor, pageSlice } from '@tamedtable/table-view';
import { readStoredConfig } from '@tamedtable/model-config/storage';
import { userFacingMessage, summarizeDebug, missingTextKeyMessage, STAY_TOUR_MESSAGE } from './controller-messages.ts';
import type { ControllerHost } from './controller-context.ts';
import { EngineManager } from './controller-engine.ts';
import { PatchManager } from './controller-patch.ts';
import { FilesManager } from './controller-files.ts';
import { VoiceManager } from './controller-voice.ts';
import { ConfigManager } from './controller-config.ts';
import { TutorialManager } from './controller-tutorial.ts';
import { DiagnosticsManager, type DiagEvent } from './controller-diagnostics.ts';
import type {
  ActivityStatus,
  CellRef,
  ChatMessage,
  ContinuousStatus,
  DialogKind,
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
export type { DiagEvent };
export type {
  ActivityStatus,
  CellRef,
  ChatMessage,
  ContinuousStatus,
  DialogKind,
  ResolvedConfig,
  Toast,
  TutorialManifestEntry,
  TutorialSources,
  VoiceStatus,
  WebControllerOptions,
  WebSettings,
};

/** Rows shown per table page. Paging is a view concern — it never enters the
 *  spec — so this lives on the controller, not the spec. */
const PAGE_SIZE = 20;

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
  /** Tracks an in-flight native picker handshake (distinct from urlDialogOpen). */
  dialog: DialogKind = null;
  /** Whether the Open URL modal dialog is showing. */
  urlDialogOpen = false;
  /** Whether the Open-sample picker dialog is showing. */
  sampleDialogOpen = false;
  streaming = false;
  toasts: Toast[] = [];
  messages: ChatMessage[] = [];
  lastDebug: RequestDebugInfo | undefined;
  /** Rows per table page — the spec's `page` view op wins when set (a
   *  "top 10" request patches /page), the fixed default otherwise. */
  get pageSize(): number {
    const size = this.displaySpec().page?.size;
    return size && size > 0 ? Math.floor(size) : PAGE_SIZE;
  }
  /** The selected cell, or null — drives the status footer. */
  selection: CellRef | null = null;
  /** Microphone state — drives the MicButton's red ring and spinner. */
  voiceStatus: VoiceStatus = 'idle';
  /** Continuous voice state — drives the WaveButton's pulse and spinner. */
  continuousStatus: ContinuousStatus = 'idle';
  /** 1-based page index over the derived rows, clamped on read. */
  pageNum = 1;
  /** Filename of the most recent save, cleared by the next state change. */
  savedLabel: string | null = null;
  tutorialOpen = false;
  /** Rows loaded for a show-golden step, or null when not in a golden step. */
  goldenRows: Row[] | null = null;
  /** Text pre-filled into the chat input by a prefill-chat step, or null. */
  tutorialPrefill: string | null = null;

  constructor(opts: WebControllerOptions) {
    this.opts = opts;
    this.file = opts.file;
    // In the browser we avoid importing process.env — guard with typeof check.
    // Tests pass opts.env = {} to suppress real API keys from the shell.
    const envVars: Record<string, string | undefined> =
      opts.env ?? (typeof process !== 'undefined' ? process.env : {});
    // Precedence: env vars > opts.config > stored config > defaults.
    this.config = resolveConfig(envVars, { ...readStoredConfig(), ...opts.config });

    // Built first so pushToast can record every toast from the moment the
    // controller exists.
    this.diagnostics = new DiagnosticsManager(this);
    this.engine = new EngineManager(this);
    this.patch = new PatchManager(this);
    this.files = new FilesManager(this);
    this.voice = new VoiceManager(this);
    this.settingsMgr = new ConfigManager(this);
    this.tutorial = new TutorialManager(this);
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

  pushMessage(role: ChatMessage['role'], text: string, debug?: RequestDebugInfo): number {
    this.messages = [...this.messages, { id: ++this.messageSeq, role, text, debug }];
    this.notify();
    return this.messageSeq;
  }

  /** Rewrite the text of an existing chat message (voice transcript swap). */
  updateMessage(id: number, text: string): void {
    this.messages = this.messages.map((m) => (m.id === id ? { ...m, text } : m));
    this.notify();
  }

  fail(message: string, debug?: RequestDebugInfo): void {
    // Every error toast offers a one-click diagnostics report, so a user who
    // hits a bug can grab the redacted, pasteable report on the spot.
    this.pushToast('error', message, 'Copy report');
    this.pushMessage('assistant', `Error: ${message}`, debug);
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
    this.pushMessage('user', trimmed);
    if (!this.loaded) {
      this.fail('Open a CSV or JSONL file before sending a request.');
      return;
    }
    // Staying in a finished tour: the engine still replays from the tour's
    // cassette, which cannot answer a request it never recorded — refuse
    // instead of surfacing a cassette miss. Undo/redo replay fine and stay on.
    if (this.tutorial.isTutorialStayed()) {
      this.fail(STAY_TOUR_MESSAGE);
      return;
    }
    // Text requests route through the selected provider, so a missing key for
    // that provider fails fast — before any network call — leaving the table
    // untouched. A key for a different provider does not count. A playing
    // tutorial is the exception: it replays from a cassette and needs no key.
    // See spec/behavior.md § Web UI / settings.
    if (!this.tutorial.isReplaying() && !this.settingsMgr.activeApiKey()?.trim()) {
      this.fail(missingTextKeyMessage(this.config.provider));
      return;
    }
    try {
      await this.engine.request(trimmed);
      const debug = this.lastDebug;
      this.pushMessage('assistant', debug ? summarizeDebug(debug) : 'Done.', debug);
    } catch (e) {
      const debug = (e as { debug?: RequestDebugInfo }).debug;
      this.fail(userFacingMessage(e, this.config.provider), debug);
    }
  }

  /** Cancel the in-flight request, if any. */
  cancelRequest(): void { this.engine.cancelActive(); }

  // ── View accessors (never throw — safe before a file is loaded) ───────────

  isLoaded(): boolean { return this.loaded; }
  displaySpec(): TablePlan { return this.engine.displaySpec(); }
  /** Current rows with any in-flight streaming chunks painted on top. */
  displayRows(): Row[] { return this.engine.displayRows(); }

  // ── Pagination (view state — never touches the spec) ──────────────────────

  totalRows(): number { return this.displayRows().length; }
  pageCount(): number { return pageCountFor(this.totalRows(), this.pageSize); }

  /** The current 1-based page, clamped — so a request that shortens the table
   *  pulls the page back into range with no extra bookkeeping. */
  currentPage(): number { return clampPage(this.pageNum, this.pageCount()); }

  /** The slice of derived rows shown on the current page. */
  pageRows(): Row[] { return pageSlice(this.displayRows(), this.currentPage(), this.pageSize); }

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
    return this.patch.editCell(rowIndex, column, value);
  }
  reorderColumns(order: string[]): Promise<void> { return this.patch.reorderColumns(order); }

  // ── File dialogs (→ files) ─────────────────────────────────────────────────

  openCsv(): Promise<void> { return this.files.openCsv(); }
  /** Load a file dropped onto the empty page (drag-and-drop open). */
  openDropped(name: string, bytes: Uint8Array): Promise<void> { return this.files.openDropped(name, bytes); }
  openUrlDialog(): void { this.files.openUrlDialog(); }
  closeUrlDialog(): void { this.files.closeUrlDialog(); }
  openSampleDialog(): void { this.files.openSampleDialog(); }
  closeSampleDialog(): void { this.files.closeSampleDialog(); }
  loadFromUrl(url: string): Promise<void> { return this.files.loadFromUrl(url); }
  saveFlow(): Promise<void> { return this.files.saveFlow(); }
  savePython(): Promise<void> { return this.files.savePython(); }
  saveData(): Promise<void> { return this.files.saveData(); }
  saveDataAs(format: FormatId): Promise<void> { return this.files.saveDataAs(format); }
  /** Public file-load helper (also used by tutorial load-file steps). */
  loadFromText(name: string, text: string): Promise<void> { return this.files.loadFromText(name, text); }

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
  clearDiagnostics(): void { this.diagnostics.clear(); }
}

export function createWebController(opts: WebControllerOptions): WebController {
  return new WebController(opts);
}
