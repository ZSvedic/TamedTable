// Test infrastructure for the @web Cucumber profile.
//
// A controllable FilePort stand-in for the browser's File System Access API:
// open/save dialogs resolve only when a step explicitly drives them, so the
// two-phase Gherkin handshake ("user says Load CSV file" … "user selects X")
// maps cleanly onto the controller's async dialog calls.

import type { FilePort, PickedFile, SaveOutcome, VoicePort } from '@tamedtable/web';

export interface WebScenarioCtx {
  /** Set by the "without File System Access support" Given before the runner builds. */
  noFsa: boolean;
  /** Stub microphone, set before the controller builds (#VoiceInput scenarios). */
  voicePort?: VoicePort;
  /** The port the runner factory built for this scenario. */
  filePort?: WebTestFilePort;
  /** An in-flight dialog action (openCsv / saveFlow / saveData) awaiting a step. */
  pending?: Promise<unknown>;
  /** URL → CSV/JSONL body, served by the per-scenario fetch stub when a
   *  URL-load step targets it. Anthropic API calls still flow through the
   *  cassette recorder above. */
  readonly urlFixtures: Map<string, string>;
  /** Last error raised by a `loadFromUrl` step that expected failure. */
  lastUrlError?: Error;
  /** When set, intercepts all non-fixture fetch calls to simulate LLM API errors. */
  mockLlmFetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

/** Per-World scenario context, shared between the @web hook and step defs. */
export const webScenarios = new WeakMap<object, WebScenarioCtx>();

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

  constructor(hasFileSystemAccess: boolean) {
    this.hasFileSystemAccess = hasFileSystemAccess;
  }

  pickOpen(_accept: string[]): Promise<PickedFile | null> {
    this.openCalled = true;
    return new Promise((resolve) => {
      this.openResolve = resolve;
    });
  }

  pickSave(suggestedName: string, _accept: string[], content: string): Promise<SaveOutcome> {
    this.saveCalled = true;
    this.lastSaveSuggestedName = suggestedName;
    this.saveContent = content;
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
