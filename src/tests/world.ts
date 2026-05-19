import {
  setWorldConstructor,
  World as CucumberWorld,
  type IWorldOptions,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { join } from 'node:path';
import type { Row, Spec } from '@tamedtable/core';

// Path anchors, resolved from this file's location so they hold regardless of cwd.
// This file lives at src/tests/world.ts.
export const SRC_DIR = join(import.meta.dirname, '..');
export const REPO_ROOT = join(SRC_DIR, '..');
export const SPEC_TC_DIR = join(REPO_ROOT, 'spec/test-cases');
export const TEMP_DIR = join(REPO_ROOT, 'temp');

export type RunnerKind = 'headless' | 'cli';

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

export class TamedTableWorld extends CucumberWorld {
  surface?: RunnerKind;
  inputPath?: string;
  goldenPath?: string;
  runnerKind?: RunnerKind;
  runner?: Runner;
  runnerFactory?: () => Runner;
  lastInvocation?: CapturedInvocation;

  constructor(options: IWorldOptions) {
    super(options);
    const surface = (options.parameters as { surface?: unknown } | undefined)?.surface;
    if (surface === 'headless' || surface === 'cli') {
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

/**
 * Per-scenario runner options derived from tags. `@cancel` scenarios run with a
 * tiny batch/chunk size so the 20-row fixture yields many chunks — otherwise it
 * produces a single chunk and an abort has no mid-flight window to land in.
 */
export function runnerOptsFor(scenario: ITestCaseHookParameter): { batchSize?: number; chunkSize?: number } {
  const tags = scenario.pickle.tags.map((t) => t.name);
  return tags.includes('@cancel') ? { batchSize: 2, chunkSize: 1 } : {};
}
