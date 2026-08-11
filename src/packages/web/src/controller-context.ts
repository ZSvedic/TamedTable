// #WebUI
// The shared seam between WebController and its composed domain managers.
//
// WebController owns every *observable* field (the React components and the
// Cucumber web profile read these directly), plus the notification hub
// (notify/pushToast/pushMessage). Each manager owns the *behavior* and the
// private infra for one responsibility, and reaches shared state and its
// siblings through this `ControllerHost` interface — so no manager imports
// the WebController class, and the public surface stays on one object.
import type { RequestDebugInfo } from '@tamedtable/headless';
import type { Row, TablePlan } from '@tamedtable/core';
import type { Provider, ResolvedConfig } from '@tamedtable/model-config';
import type { ProviderProbe } from '@tamedtable/model-config/storage';
import type { FilePort } from '@tamedtable/file-io';
import type { EngineManager } from './controller-engine.ts';
import type { PatchManager } from './controller-patch.ts';
import type { FilesManager, SaveGateState } from './controller-files.ts';
import type { VoiceManager } from './controller-voice.ts';
import type { ConfigManager } from './controller-config.ts';
import type { TutorialManager } from './controller-tutorial.ts';
import type { DiagnosticsManager } from './controller-diagnostics.ts';
import type { LazyManager, RunAllDialogState } from './controller-lazy.ts';
import type { ViewManager } from './controller-view.ts';
import type {
  CellRef,
  ChatMessage,
  ContinuousStatus,
  DialogKind,
  RunProgress,
  VoiceStatus,
  WebControllerOptions,
} from './controller-types.ts';

export interface ControllerHost {
  // ── Construction-time infra ───────────────────────────────────────────────
  readonly opts: WebControllerOptions;
  readonly file: FilePort;

  // ── Observable state (declared on WebController, mutated by managers) ──────
  config: ResolvedConfig;
  loaded: boolean;
  sourcePath: string;
  messages: ChatMessage[];
  streaming: boolean;
  selection: CellRef | null;
  dialog: DialogKind;
  /** Live progress of the streaming run, or null — the chat progress block. */
  runProgress: RunProgress | null;
  urlDialogOpen: boolean;
  sampleDialogOpen: boolean;
  errorDialog: string | null;
  settingsOpen: boolean;
  keyInput: string;
  keyError: string;
  keyBusy: boolean;
  /** The connect in flight is the Puter sign-in, so its button can say so.
   *  A click that opens a window in front of the panel needs to leave a mark
   *  on the panel too, or coming back looks like nothing happened. */
  puterBusy: boolean;
  probes: Partial<Record<Provider, ProviderProbe>>;
  measuring: Partial<Record<Provider, boolean>>;
  voiceStatus: VoiceStatus;
  continuousStatus: ContinuousStatus;
  lastDebug: RequestDebugInfo | undefined;
  tutorialOpen: boolean;
  goldenRows: Row[] | null;
  tutorialPrefill: string | null;
  pageNum: number;
  /** Rows per table page — re-derived from the provider on config changes. */
  pageSize: number;
  // #LazyExec
  /** The large-file dialog (Load shuffled / original order), or null. */
  largeFileDialog: { name: string; rowCount: number } | null;
  /** The run-on-all estimate/confirmation dialog, or null. */
  runAllDialog: RunAllDialogState | null;
  // #SaveGate
  /** The save waiting on a fresh click, or null when none is. */
  saveGate: SaveGateState | null;
  // #FileIO
  /** The replace-table confirmation a drop with a table loaded raises, or
   *  null. Names the dropped file; the bytes wait in FilesManager. */
  replaceDialog: { name: string } | null;
  /** Column the grid should scroll into view (a new seq re-triggers), or null. */
  reveal: { column: string; seq: number } | null;
  // #LookupJoin
  /** The lookup file a waiting join needs, or null. A null `name` is a join
   *  the model emitted without a filename (the user named none). */
  lookupDialog: { name: string | null } | null;

  // ── Notification hub + chat/toast services ────────────────────────────────
  notify(): void;
  /** Point the grid at a column (the reveal scroll), or clear the target. */
  setReveal(column: string | null): void;
  pushToast(kind: 'info' | 'error', message: string, action?: string): void;
  pushMessage(role: ChatMessage['role'], text: string, debug?: RequestDebugInfo, reportable?: boolean, historyId?: number): number;
  updateMessage(id: number, text: string): void;
  /** Drop the whole thread — a new table starts a new conversation. */
  clearMessages(): void;
  fail(message: string, debug?: RequestDebugInfo, reportable?: boolean): void;
  /** Send a chat request (used by tutorial prefill-chat steps). */
  sendChat(text: string): Promise<void>;

  // ── Composed managers (siblings reach each other through the host) ────────
  readonly engine: EngineManager;
  readonly patch: PatchManager;
  readonly files: FilesManager;
  readonly voice: VoiceManager;
  readonly settingsMgr: ConfigManager;
  readonly tutorial: TutorialManager;
  readonly diagnostics: DiagnosticsManager;
  readonly lazy: LazyManager;
  readonly view: ViewManager;
}
