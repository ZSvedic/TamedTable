// Public shapes carried on the controller's surface — interfaces and string
// unions only, no values. Extracted from controller.ts to keep that file
// focused on the class itself. The class re-exports these so existing
// imports through ./controller.ts keep working.

import type { RequestDebugInfo } from '@tamedtable/headless';
import type { FetchLike, FilePort } from '@tamedtable/file-io';
import type { VoicePort, ContinuousVoicePort } from '@tamedtable/voice-input';
import type { ResolvedConfig } from '@tamedtable/model-config';

export type { ResolvedConfig };

/** One scenario in the tutorial manifest: enough to render the panel's
 *  clickable list and the Dev dropdown without fetching anything. The heavy
 *  assets (feature source, fixtures, goldens, cassettes) load lazily when a
 *  tour is opened. `feature` is the source `.feature` file name, which
 *  disambiguates a deep link when two files share a scenario name. */
export interface TutorialManifestEntry {
  name: string;
  feature: string;
  tags: string[];
}

/** The tutorial panel's data source. Only the lightweight `manifest` ships in
 *  the JS bundle; everything heavy is fetched same-origin on demand (in the
 *  browser) or read from disk (in tests). See spec/code-contract.md § Tutorial
 *  mode. */
export interface TutorialSources {
  /** Lightweight scenario index — drives the clickable list and Dev dropdown
   *  with no fetch. */
  manifest: TutorialManifestEntry[];
  /** Raw text of a `.feature` file, parsed lazily when a tour is opened. */
  loadFeature(name: string): Promise<string>;
  /** Raw text of an input or golden fixture (CSV/JSONL), served same-origin
   *  from the deployed `/samples/` directory. */
  loadFixture(name: string): Promise<string>;
  /** Raw JSON text of a feature's recorded cassette, for key-free playback —
   *  `feature` is the feature base name without extension (e.g. `validate`). */
  loadCassette(feature: string): Promise<string>;
  /** Raw bytes of a voice clip, for a `play-audio` step — served same-origin
   *  from the deployed `/samples/` directory alongside the CSV/JSONL fixtures. */
  loadAudio(name: string): Promise<Uint8Array>;
}

export interface WebControllerOptions {
  /** File input/output port (browser dialogs, or a test stub). */
  file: FilePort;
  /** Custom fetch — the Cucumber cassette recorder in tests; unset in the browser. */
  fetch?: FetchLike;
  /** Microphone recording port. The browser passes browserVoicePort(); tests
   *  inject a stub returning a fixed Blob. Voice input is disabled when unset. */
  voice?: VoicePort;
  /** Continuous (hands-free) voice port. The browser passes
   *  browserContinuousPort(); tests inject a stub that emits a fixture clip.
   *  The waveform button is hidden when unset. */
  continuousVoice?: ContinuousVoicePort;
  /** Test seam for the 30 s recording auto-stop: schedule `fn` after `ms` and
   *  return a cancel. Defaults to setTimeout; the Cucumber web profile injects
   *  a capture so a scenario can fire the timeout without waiting. */
  voiceSchedule?: (fn: () => Promise<void>, ms: number) => () => void;
  /** Initial config (tests inject keys; the browser leaves it for the settings panel). */
  config?: Partial<ResolvedConfig>;
  /** Environment variables used to resolve the initial config. When omitted
   *  the controller reads from `process.env` (browser/CLI behaviour). Tests
   *  pass `{}` here so real API keys in the shell do not bleed into scenarios. */
  env?: Record<string, string | undefined>;
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
  /** Optional inline action label (e.g. "Copy report" on an error toast). */
  action?: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  debug?: RequestDebugInfo;
  /** True when the chat offers a Report bug action on this message: every
   *  reply to a completed request, plus app-error replies. Guidance errors
   *  (no file, missing/invalid key, rate limit, network, cancelled) stay
   *  unset. See spec/behavior.md § Web UI. */
  reportable?: boolean;
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

/** Microphone state — drives the MicButton's ring, controls, and spinner.
 *  `recording` while the button is held (push-to-talk); `latched` after a quick
 *  tap turned recording on hands-free, showing the cancel (✕) / send (✓)
 *  controls until the user chooses. */
export type VoiceStatus = 'idle' | 'recording' | 'latched' | 'sending';

/** Continuous (hands-free) voice state — drives the WaveButton's pulse and
 *  spinner. `listening` while the VAD is open, `sending` while a detected turn
 *  is being applied. */
export type ContinuousStatus = 'idle' | 'listening' | 'sending';

export type DialogKind = 'open' | 'save-flow' | 'save-data' | null;

// #OpenFlow
/** Live progress of a running flow replay — drives the flow-run dialog.
 *  Mutated in place by the engine's step/chunk callbacks; the notification
 *  hub's revision bump tells React to re-read it. */
export interface FlowRunState {
  /** The opened .flow file's name — the dialog title. */
  name: string;
  /** 1-based index of the running transformation (0 until the first starts). */
  step: number;
  totalSteps: number;
  /** The running transformation's describeStep label ("mutate EventGroup (AI)"). */
  label: string;
  /** Rows streamed so far in the running step (AI-cell steps only). */
  rowsDone: number;
  /** Rows entering the running step. */
  rowsTotal: number;
  /** Newest-last event feed, capped at the newest 500 lines. */
  log: string[];
}
