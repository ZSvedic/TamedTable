// #BenchSweep
// The grid driver. For each (cell model, batch size) config it runs the group-C
// NL request over the labelled fixture and records speed, cost, and accuracy —
// one flat SweepResult per config. The model tradeoff chart and the batch-size
// chart are both slices of this table.
//
// The engine and fetch are injected (runnerFactory / baseFetch), so the
// orchestration is unit-testable offline with a fake runner; the live run wires
// the real createHeadlessRunner and the cassette/global fetch.
import { createHeadlessRunner, type HeadlessRunner, type HeadlessRunnerOptions } from '@tamedtable/headless';
import { providerFor } from '@tamedtable/model-config';
import type { Row } from '@tamedtable/core';
import { newTally, summarise, tallyingFetch } from './usage.ts';
import { scoreAccuracy, type Label } from './score.ts';

/** One point in the sweep: a candidate cell model at a given batch size. */
export interface SweepConfig {
  /** The per-row cell model under test — the one whose accuracy we care about. */
  cellModel: string;
  batchSize: number;
  /** The patch-turn model that writes the "add column" edit. Defaults to the
   *  same-provider default; it makes one cheap call and doesn't affect accuracy. */
  primaryModel?: string;
}

export interface SweepContext {
  /** Absolute path to the labelled input CSV. */
  inputCsv: string;
  /** The NL request that adds the target column. */
  request: string;
  /** Stable id column present in the rows (e.g. "videoId"). */
  idColumn: string;
  /** The column the request fills (e.g. "Music"). */
  targetColumn: string;
  labels: Label[];
  apiKey?: string;
  /** Base fetch to wrap for tallying (cassette or global). Defaults to global. */
  baseFetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  /** Engine factory — defaults to createHeadlessRunner. Injected for tests. */
  runnerFactory?: (opts: HeadlessRunnerOptions) => HeadlessRunner;
  /** Extra attempts per config before giving up. Free models occasionally
   *  return the patch-turn tool call as plain text (the run then throws); a
   *  retry re-does the cheap patch turn rather than losing the whole grid.
   *  Defaults to 0 (paid providers don't need it). */
  retries?: number;
}

export interface SweepResult {
  cellModel: string;
  primaryModel: string;
  provider: string;
  batchSize: number;
  rows: number;
  timeMs: number;
  calls: number;
  inTokens: number;
  outTokens: number;
  costUsd: number;
  /** Accuracy over the labelled rows found in the output (0..1). */
  accuracy: number;
  /** Labelled rows actually compared. */
  scored: number;
  /** Labelled ids the engine dropped from the output. */
  missing: number;
}

export async function runConfig(cfg: SweepConfig, ctx: SweepContext): Promise<SweepResult> {
  const provider = providerFor(cfg.cellModel);
  const primaryModel = cfg.primaryModel ?? defaultPrimaryFor(cfg.cellModel);
  const tally = newTally();
  const base = ctx.baseFetch ?? ((input: string | URL | Request, init?: RequestInit) => fetch(input, init));
  const runnerFactory = ctx.runnerFactory ?? createHeadlessRunner;

  const runner = runnerFactory({
    model: primaryModel,
    cellModel: cfg.cellModel,
    batchSize: cfg.batchSize,
    apiKey: ctx.apiKey,
    fetch: tallyingFetch(base, tally),
  });

  await runner.loadInput(ctx.inputCsv);
  const t0 = Date.now();
  await runner.request(ctx.request);
  const timeMs = Date.now() - t0;

  const out: Row[] = runner.currentRows();
  const score = scoreAccuracy(out, ctx.idColumn, ctx.targetColumn, ctx.labels);
  const s = summarise(tally);

  return {
    cellModel: cfg.cellModel,
    primaryModel,
    provider,
    batchSize: cfg.batchSize,
    rows: out.length,
    timeMs,
    calls: s.calls,
    inTokens: s.inTokens,
    outTokens: s.outTokens,
    costUsd: s.costUsd,
    accuracy: score.accuracy,
    scored: score.n,
    missing: score.missing.length,
  };
}

/** Run every config sequentially (one at a time — the live API has a rate cap,
 *  and interleaving would muddy per-config timing). */
export async function runSweep(configs: SweepConfig[], ctx: SweepContext): Promise<SweepResult[]> {
  const retries = ctx.retries ?? 0;
  const results: SweepResult[] = [];
  for (const cfg of configs) {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        results.push(await runConfig(cfg, ctx));
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < retries) {
          console.error(`  ${cfg.cellModel} @ batch ${cfg.batchSize} failed (attempt ${attempt + 1}/${retries + 1}): ${e instanceof Error ? e.message.split('\n')[0] : e}`);
        }
      }
    }
    if (lastErr !== undefined) throw lastErr;
  }
  return results;
}

/** Same-provider patch-turn default for a cell model, so the patch call never
 *  crosses providers. Uses the provider's mid-tier model. */
function defaultPrimaryFor(cellModel: string): string {
  switch (providerFor(cellModel)) {
    case 'gemini':     return 'gemini-3.6-flash';
    case 'openai':     return 'gpt-5.5';
    case 'groq':       return 'openai/gpt-oss-120b';
    case 'cerebras':   return 'zai-glm-4.7';
    case 'openrouter': return 'cohere/north-mini-code:free';
    default:           return 'claude-sonnet-4-6';
  }
}

/** Expand a model list × batch-size list into the full config grid. */
export function grid(cellModels: string[], batchSizes: number[]): SweepConfig[] {
  const configs: SweepConfig[] = [];
  for (const cellModel of cellModels) {
    for (const batchSize of batchSizes) {
      configs.push({ cellModel, batchSize });
    }
  }
  return configs;
}
