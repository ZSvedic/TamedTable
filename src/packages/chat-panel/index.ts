// #ChatPanel
// Message shapes the chat panel renders. This entry is React-free; the
// components live in ./components. Spec: spec/packages/chat-panel/behavior.md.

/** What an expandable "request detail" panel shows — a structural subset of
 *  the engine's RequestDebugInfo, so the app's debug objects fit without a
 *  headless dependency. */
export interface ChatRequestDetail {
  userRequest: string;
  modelCalls: Array<{ model: string; calls: number }>;
  inputTokens: number;
  outputTokens: number;
  elapsedMs: number;
  turns: Array<{ outcome: string; ops: unknown }>;
  cellSamples: Array<{ column: string; samples: Array<{ in: unknown; out: unknown }> }>;
}

/** One chat message. Assistant text starting with `Error:` renders in error
 *  style with the prefix stripped. `reportable: true` marks a message the user
 *  can flag as a bug — the host classifies (app error vs guidance error); the
 *  panel only renders the Report bug action. */
export interface ChatPanelMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  debug?: ChatRequestDetail;
  reportable?: boolean;
}

/** Mic button state — drives the red ring (recording while held), the
 *  cancel/send controls (`latched`, after a quick tap), and the spinner
 *  (sending). */
export type VoiceButtonStatus = 'idle' | 'recording' | 'latched' | 'sending';

/** Continuous (hands-free) voice button state — drives the pulsing bars
 *  (listening) and spinner (a detected turn is being sent). */
export type ContinuousButtonStatus = 'idle' | 'listening' | 'sending';
