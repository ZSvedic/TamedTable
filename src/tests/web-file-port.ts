// Test infrastructure for the @web Cucumber profile.
//
// A controllable FilePort stand-in for the browser's File System Access API:
// open/save dialogs resolve only when a step explicitly drives them, so the
// two-phase Gherkin handshake ("user says Load CSV file" … "user selects X")
// maps cleanly onto the controller's async dialog calls.

import type {
  FilePort,
  PickedFile,
  SaveOutcome,
  VoicePort,
  ContinuousVoicePort,
  WebController,
} from '@tamedtable/web';
import type { TamedTableWorld } from './world.ts';

export interface WebScenarioCtx {
  /** Peak run-all progress captured by the watching confirm step (#LazyExec). */
  runPeak?: { done: number; total: number };
  /** Set by the "without File System Access support" Given before the runner builds. */
  noFsa: boolean;
  /** Stub microphone, set before the controller builds (#VoiceInput scenarios). */
  voicePort?: VoicePort;
  /** Stub continuous (hands-free) voice port, set before the controller builds. */
  continuousPort?: ContinuousVoicePort;
  /** Emits one detected turn into the running continuous session. Set by the
   *  stub port's start(), cleared on stop(), so a step can fire a turn. */
  continuousEmit?: () => Promise<void>;
  /** The pending 30 s recording auto-stop, captured by the injected
   *  voiceSchedule so the "30 seconds pass" step can fire it without waiting. */
  voiceAutoStop?: { fn: () => Promise<void>; ms: number };
  /** The port the runner factory built for this scenario. */
  filePort?: WebTestFilePort;
  /** An in-flight dialog action (openCsv / saveFlow / saveData) awaiting a step. */
  pending?: Promise<unknown>;
  /** URL → CSV/JSONL body, served by the per-scenario fetch stub when a
   *  URL-load step targets it; null marks a URL that stopped serving (404).
   *  Anthropic API calls still flow through the cassette recorder above. */
  readonly urlFixtures: Map<string, string | null>;
  /** Sample name → the running deployment's address, backing the injected
   *  `resolveSampleUrl`: the recents re-resolve seam. */
  readonly sampleUrls: Map<string, string>;
  /** Last error raised by a `loadFromUrl` step that expected failure. */
  lastUrlError?: Error;
  /** When set, intercepts all non-fixture fetch calls to simulate LLM API errors. */
  mockLlmFetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  /** The API key the newest model call carried, however the provider sends it.
   *  Recorded by the composite fetch: proves a key edit reached the engine. */
  lastCallApiKey?: string;
  /** Model calls this scenario has made: proves a key test does not retry. */
  llmCallCount?: number;
  /** #PuterGateway: what the injected sign-in port does. Unset resolves a
   *  token (the happy path); `closed` is the user dismissing the window;
   *  `error` is any real failure, which must reach the banner. */
  puterSignInClosed?: boolean;
  puterSignInError?: string;
  /** Set by the injected sign-out port: deleting the Puter card must end the
   *  session, and deleting any other card must not. */
  puterSignedOut?: boolean;
  /** #LookupJoin: background tasks that answer the lookup dialog through the
   *  public `chooseLookupFile()` seam when a join later raises it, so a @web
   *  `load the lookup table …` Given never reaches into the controller engine. */
  lookupResponders?: Promise<void>[];
}

/** Dig the API key out of an outgoing model call: Google sends
 *  `x-goog-api-key` (or a `?key=` query), Anthropic `x-api-key`, and
 *  OpenAI/OpenRouter an `Authorization: Bearer` header. */
export function apiKeyOfCall(input: string | URL | Request, init?: RequestInit): string | undefined {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const bearer = headers.get('authorization');
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  return (
    headers.get('x-goog-api-key') ??
    headers.get('x-api-key') ??
    (bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : undefined) ??
    new URL(url, 'http://localhost').searchParams.get('key') ??
    undefined
  );
}

/** Per-World scenario context, shared between the @web hook and step defs. */
export const webScenarios = new WeakMap<object, WebScenarioCtx>();

/** The world's runner viewed as the web controller (@web scenarios only). */
export function webController(world: TamedTableWorld): WebController {
  return world.ensureRunner() as unknown as WebController;
}

/** This world's scenario context; throws if the @web Before hook didn't run. */
export function webCtx(world: TamedTableWorld): WebScenarioCtx {
  const ctx = webScenarios.get(world);
  if (!ctx) throw new Error('web scenario context missing: is the @web Before hook wired?');
  return ctx;
}

export class WebTestFilePort implements FilePort {
  readonly hasFileSystemAccess: boolean;
  openCalled = false;
  saveCalled = false;
  lastSaveSuggestedName: string | undefined;
  readonly saved = new Map<string, string>();
  readonly outcomes: SaveOutcome[] = [];

  private openResolve: ((f: PickedFile | null) => void) | undefined;
  private saveResolve: ((o: SaveOutcome) => void) | undefined;
  private saveContent = '';

  private static decode(content: Uint8Array): string {
    return new TextDecoder().decode(content);
  }

  constructor(hasFileSystemAccess: boolean) {
    this.hasFileSystemAccess = hasFileSystemAccess;
  }

  pickOpen(_accept: string[]): Promise<PickedFile | null> {
    this.openCalled = true;
    return new Promise((resolve) => {
      this.openResolve = resolve;
    });
  }

  pickSave(suggestedName: string, _accept: string[], content: Uint8Array): Promise<SaveOutcome> {
    this.saveCalled = true;
    this.lastSaveSuggestedName = suggestedName;
    // The seam carries bytes; decode to text so saved-content assertions stay simple.
    this.saveContent = WebTestFilePort.decode(content);
    return new Promise((resolve) => {
      this.saveResolve = resolve;
    });
  }

  /** Resolve a pending Open dialog with the given file (or null to cancel). */
  async resolveOpen(file: PickedFile | null): Promise<void> {
    await this.waitFor(() => this.openResolve !== undefined);
    this.openResolve!(file);
    this.openResolve = undefined;
  }

  /** Resolve a pending Save dialog, recording the written content under `name`. */
  async resolveSave(name: string): Promise<void> {
    await this.waitFor(() => this.saveResolve !== undefined);
    this.saved.set(name, this.saveContent);
    const outcome: SaveOutcome = {
      status: this.hasFileSystemAccess ? 'saved' : 'downloaded',
      name,
    };
    this.outcomes.push(outcome);
    this.saveResolve!(outcome);
    this.saveResolve = undefined;
  }

  private async waitFor(ready: () => boolean): Promise<void> {
    const start = Date.now();
    while (!ready()) {
      if (Date.now() - start > 5_000) throw new Error('timed out waiting for a file dialog');
      await new Promise((r) => setTimeout(r, 5));
    }
  }
}
