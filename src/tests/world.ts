import {
  setWorldConstructor,
  World as CucumberWorld,
  type IWorldOptions,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { join, basename } from 'node:path';
import type { Row, TablePlan } from '@tamedtable/core';
import { cassetteFetch, type FetchLike } from './cassette.ts';

// Path anchors, resolved from this file's location so they hold regardless of cwd.
// This file lives at src/tests/world.ts.
export const SRC_DIR = join(import.meta.dirname, '..');
export const REPO_ROOT = join(SRC_DIR, '..');
export const SPEC_DIR = join(REPO_ROOT, 'spec');
export const SPEC_TC_DIR = join(REPO_ROOT, 'spec/test-cases');
export const TEMP_DIR = join(REPO_ROOT, 'temp');
export const CASSETTE_DIR = join(REPO_ROOT, 'cassettes');

/** Resolve a Gherkin fixture name: a bare name is a committed fixture under
 *  spec/test-cases/; `user-reports/…` resolves under spec/ (user-reported
 *  regression fixtures); any other slash is src/-relative (= cwd when
 *  cucumber runs), so feature files can point generated outputs at ../temp/. */
export function fixturePath(name: string): string {
  if (name.startsWith('user-reports/')) return join(SPEC_DIR, name);
  return name.includes('/') ? join(SRC_DIR, name) : join(SPEC_TC_DIR, name);
}

export type RunnerKind = 'headless' | 'cli' | 'web';

export interface Runner {
  loadInput(path: string): Promise<void>;
  request(text: string): Promise<void>;
  currentRows(): Row[];
  currentSpec(): TablePlan;
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
  specBefore: TablePlan;
  specAfter?: TablePlan;
}

// #TestUtils
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
// #TestUtils #Cassettes
export function runnerOptsFor(scenario: ITestCaseHookParameter): RunnerOpts {
  const tags = scenario.pickle.tags.map((t) => t.name);
  const opts: RunnerOpts = tags.includes('@cancel') ? { batchSize: 2, chunkSize: 1 } : {};

  const mode = process.env.TAMEDTABLE_CASSETTE;
  if (mode === 'record' || mode === 'replay') {
    const feature = basename(scenario.pickle.uri, '.feature');
    opts.fetch = cassetteFetch({ mode, file: join(CASSETTE_DIR, `${feature}.json`) });
    // A @cancel scenario needs a mid-flight window for the abort to land in —
    // that's why it runs with tiny batches (above). Replay from disk is
    // near-instant, so the whole request can commit before the abort fires
    // (a race CI loses). Pace each replayed response like a live call so the
    // window reliably exists; record mode keeps real API latency.
    if (tags.includes('@cancel') && mode === 'replay') {
      const inner = opts.fetch;
      opts.fetch = async (input, init) => {
        const res = await inner(input, init);
        await new Promise((r) => setTimeout(r, 75));
        return res;
      };
    }
    // Pin the key in BOTH modes so record and replay resolve the same provider
    // and model. With no injected key, REPL scenarios resolve the provider from
    // process.env — and the CLI's .env auto-load (core loadEnv walks up to the
    // repo root) can flip a record run to whichever provider tops the env
    // precedence, producing cassettes replay can never match. Replay serves
    // every call from disk, so a placeholder is enough there; record needs the
    // real GEMINI_API_KEY — every cassette records with the Gemini defaults.
    // (cucumber.js lifts TAMEDTABLE_RPM for replay so the rate limiter adds no
    // delay.)
    opts.apiKey = process.env.GEMINI_API_KEY ?? 'cassette-replay-placeholder';
  }
  return opts;
}
