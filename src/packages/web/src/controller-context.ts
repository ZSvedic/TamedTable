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
import type { FilePort } from '@tamedtable/file-io';
import type { EngineManager } from './controller-engine.ts';
import type { PatchManager } from './controller-patch.ts';
import type { FilesManager } from './controller-files.ts';
import type { VoiceManager } from './controller-voice.ts';
import type { ConfigManager } from './controller-config.ts';
import type { TutorialManager } from './controller-tutorial.ts';
import type { DiagnosticsManager } from './controller-diagnostics.ts';
import type {
  CellRef,
  ChatMessage,
  ContinuousStatus,
  DialogKind,
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
  savedLabel: string | null;
  dialog: DialogKind;
  urlDialogOpen: boolean;
  settingsOpen: boolean;
  expandedProvider: Provider | null;
  voiceStatus: VoiceStatus;
  continuousStatus: ContinuousStatus;
  lastDebug: RequestDebugInfo | undefined;
  tutorialOpen: boolean;
  goldenRows: Row[] | null;
  tutorialPrefill: string | null;
  pageNum: number;

  // ── Notification hub + chat/toast services ────────────────────────────────
  notify(): void;
  pushToast(kind: 'info' | 'error', message: string, action?: string): void;
  pushMessage(role: ChatMessage['role'], text: string, debug?: RequestDebugInfo): number;
  updateMessage(id: number, text: string): void;
  fail(message: string, debug?: RequestDebugInfo): void;
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
}
