// Public shapes carried on the controller's surface — interfaces and string
// unions only, no values. Extracted from controller.ts to keep that file
// focused on the class itself. The class re-exports these so existing
// imports through ./controller.ts keep working.

import type { RequestDebugInfo } from '@tamedtable/headless';
import type { FetchLike, FilePort } from './lib/ports.ts';

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
