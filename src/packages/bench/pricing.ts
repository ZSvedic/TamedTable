// #BenchSweep
// Pricing + model specs — the single source of truth for benchmark cost.
// Reads benchmarks/models.jsonl at the repo root (data lives outside src/, code
// lives here; a plain file read crosses the boundary, an import would not).
// Everything that needs a per-model price (the sweep, the reporter, and the
// standalone #BenchPerf Cucumber flow) goes through here — never duplicate a
// price literal in a step-def again.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Provider = 'anthropic' | 'gemini' | 'openai' | 'cerebras';

export interface ModelSpec {
  id: string;
  name: string;
  provider: Provider;
  /** USD per million input tokens (Standard paid tier, uncached). */
  inUsdPerMtok: number;
  /** USD per million output tokens. */
  outUsdPerMtok: number;
  /** Multiplier on the input rate for a cache write (Anthropic 1.25; providers
   *  with implicit caching use 1 — there is no separate write charge). */
  cacheWriteMult: number;
  /** Multiplier on the input rate for a cache read (0.1 on all three). */
  cacheReadMult: number;
  contextWindow: number;
  maxOutput: number;
  audioInput: boolean;
  /** Whether the app can actually call this model (all three providers here can;
   *  the field exists so the table can also carry reference-only rows later). */
  runnable: boolean;
  notes?: string;
}

// benchmarks/ sits at the repo root: src/packages/bench/ → up three → root.
const MODELS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..',
  'benchmarks', 'models.jsonl',
);

// Unknown ids fall back to the Sonnet rate so a model swap skews cost rather
// than crashing the report. Matches the old inline FALLBACK_PRICE.
export const FALLBACK_SPEC: Pick<ModelSpec, 'inUsdPerMtok' | 'outUsdPerMtok' | 'cacheWriteMult' | 'cacheReadMult'> = {
  inUsdPerMtok: 3,
  outUsdPerMtok: 15,
  cacheWriteMult: 1.25,
  cacheReadMult: 0.1,
};

let cache: ModelSpec[] | null = null;

/** Parse benchmarks/models.jsonl (one JSON object per non-blank line). */
export function loadModels(): ModelSpec[] {
  if (cache) return cache;
  const text = readFileSync(MODELS_PATH, 'utf8');
  cache = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as ModelSpec);
  return cache;
}

/** Price fields for a model id, falling back to the Sonnet rate if unknown. */
export function priceFor(id: string): Pick<ModelSpec, 'inUsdPerMtok' | 'outUsdPerMtok' | 'cacheWriteMult' | 'cacheReadMult'> {
  return loadModels().find((m) => m.id === id) ?? FALLBACK_SPEC;
}

/** Full spec for a model id, or undefined if the table doesn't list it. */
export function specFor(id: string): ModelSpec | undefined {
  return loadModels().find((m) => m.id === id);
}

/** Token counts for one model, already split by cache class. */
export interface CostInput {
  inTokens: number;   // uncached input
  cacheWrite: number; // cache-creation input
  cacheRead: number;  // cache-read input
  outTokens: number;
}

/** USD for one model's usage, pricing each input class at its cache-adjusted
 *  rate plus output at the output rate. */
export function costFor(id: string, u: CostInput): number {
  const p = priceFor(id);
  const inputUsd =
    (u.inTokens + u.cacheWrite * p.cacheWriteMult + u.cacheRead * p.cacheReadMult) / 1e6 * p.inUsdPerMtok;
  const outputUsd = (u.outTokens / 1e6) * p.outUsdPerMtok;
  return inputUsd + outputUsd;
}
