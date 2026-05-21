import {
  setWorldConstructor,
  World as CucumberWorld,
  type IWorldOptions,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { join, basename } from 'node:path';
import type { Row, Spec } from '@tamedtable/core';
import { cassetteFetch, type FetchLike } from './cassette.ts';

// Path anchors, resolved from this file's location so they hold regardless of cwd.
// This file lives at src/tests/world.ts.
export const SRC_DIR = join(import.meta.dirname, '..');
export const REPO_ROOT = join(SRC_DIR, '..');
export const SPEC_TC_DIR = join(REPO_ROOT, 'spec/test-cases');
export const TEMP_DIR = join(REPO_ROOT, 'temp');
export const CASSETTE_DIR = join(import.meta.dirname, '__cassettes__');

export type RunnerKind = 'headless' | 'cli' | 'web';

export interface Runner {
  loadInput(path: string): Promise<void>;
  request(text: string): Promise<void>;
  currentRows(): Row[];
  currentSpec(): Spec;
  exportAs(path: string): Promise<void>;
}

export interface CapturedInvocation {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface RequestOutcome {
  ok: boolean;
  error?: Error;
  specBefore: Spec;
  specAfter?: Spec;
}

export class TamedTableWorld extends CucumberWorld {
  surface?: RunnerKind;
  inputPath?: string;
  goldenPath?: string;
  runnerKind?: RunnerKind;
  runner?: Runner;
  runnerFactory?: () => Runner;
  runnerOpts?: RunnerOpts;
  lastInvocation?: CapturedInvocation;
  lastRequestOutcome?: RequestOutcome;

  constructor(options: IWorldOptions) {
    super(options);
    const surface = (options.parameters as { surface?: unknown } | undefined)?.surface;
    if (surface === 'headless' || surface === 'cli' || surface === 'web') {
      this.surface = surface;
    }
  }

  ensureRunner(): Runner {
    if (this.runner) return this.runner;
    if (!this.runnerFactory) {
      throw new Error('No runner factory bound — did a per-tag Before hook run?');
    }
    this.runner = this.runnerFactory();
    return this.runner;
  }
}

setWorldConstructor(TamedTableWorld);

interface RunnerOpts {
  batchSize?: number;
  chunkSize?: number;
  fetch?: FetchLike;
  apiKey?: string;
}

/**
 * Per-scenario runner options derived from tags and env. `@cancel` scenarios
 * run with a tiny batch/chunk size so the 20-row fixture yields many chunks —
 * otherwise it produces a single chunk and an abort has no mid-flight window to
 * land in. When `TAMEDTABLE_CASSETTE` is `record` or `replay`, the model's HTTP
 * calls go through a cassette recorder bound to the scenario's feature file.
 */
export function runnerOptsFor(scenario: ITestCaseHookParameter): RunnerOpts {
  const tags = scenario.pickle.tags.map((t) => t.name);
  const opts: RunnerOpts = tags.includes('@cancel') ? { batchSize: 2, chunkSize: 1 } : {};

  const mode = process.env.TAMEDTABLE_CASSETTE;
  if (mode === 'record' || mode === 'replay') {
    const feature = basename(scenario.pickle.uri, '.feature');
    opts.fetch = cassetteFetch({ mode, file: join(CASSETTE_DIR, `${feature}.json`) });
    if (mode === 'replay') {
      // The runner needs a non-empty key to build its provider; the recorder
      // serves every call from disk, so a placeholder is enough. (cucumber.js
      // lifts TAMEDTABLE_RPM for replay so the rate limiter adds no delay.)
      opts.apiKey = process.env.ANTHROPIC_API_KEY ?? 'cassette-replay-placeholder';
    }
  }
  return opts;
}
