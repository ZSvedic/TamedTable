// Public shapes carried on the controller's surface — interfaces and string
// unions only, no values. Extracted from controller.ts to keep that file
// focused on the class itself. The class re-exports these so existing
// imports through ./controller.ts keep working.

import type { RequestDebugInfo } from '@tamedtable/headless';
import type { TourScenario } from '@tamedtable/gherkin-tour';
import type { FetchLike, FilePort } from './lib/ports.ts';
import type { ResolvedConfig } from '@tamedtable/model-config';

export type { ResolvedConfig };

/** Bundled sources the tutorial panel needs. In the browser these come from
 *  Vite's import.meta.glob at build time; in tests they are injected directly. */
export interface TutorialSources {
  /** All @tutorial-tagged scenarios, parsed from every bundled feature file. */
  tours: TourScenario[];
  /** Fixture content keyed by filename, e.g. 'filter-input.csv'. */
  inputs: Record<string, string>;
  /** Golden content keyed by filename, e.g. 'filter-expected.jsonl'. */
  goldens: Record<string, string>;
}

export interface WebControllerOptions {
  /** File input/output port (browser dialogs, or a test stub). */
  file: FilePort;
  /** Custom fetch — the Cucumber cassette recorder in tests; unset in the browser. */
  fetch?: FetchLike;
  /** Initial config (tests inject keys; the browser leaves it for the settings panel). */
  config?: Partial<ResolvedConfig>;
  /** Directory used to materialize picked files for the engine to read. */
  workDir?: string;
  batchSize?: number;
  chunkSize?: number;
  /** Bundled feature + fixture sources for the Tutorial panel. When omitted,
   *  the Tutorial button is present but shows no scenarios. */
  tutorialSources?: TutorialSources;
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

/** @deprecated Use ResolvedConfig from @tamedtable/model-config instead. */
export type WebSettings = ResolvedConfig;

/** A cell coordinate: a 0-based row index and a column id. */
export interface CellRef {
  row: number;
  column: string;
}

/** What the engine is doing, for the status footer. */
export type ActivityStatus = 'idle' | 'running' | 'saved';

export type DialogKind = 'open' | 'save-flow' | 'save-data' | null;
