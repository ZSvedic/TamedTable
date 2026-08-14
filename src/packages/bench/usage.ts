// #BenchSweep
// Multi-provider token accounting. A single fetch wrapper sees every model
// response (live or cassette-replayed) and folds it into a per-model tally;
// summarise() turns the tally into calls / tokens / USD using pricing.ts.
// Moved here from the old performance.steps.ts so the sweep and the #BenchPerf
// Cucumber flow parse usage and price it the same way.
import { costFor } from './pricing.ts';

/** One response's token counts, normalised across providers and split by cache
 *  class. `inTokens` is uncached input only. */
export interface NormUsage {
  inTokens: number;
  cacheWrite: number;
  cacheRead: number;
  outTokens: number;
}

export interface ModelTally extends NormUsage {
  calls: number;
}

export type Tally = Map<string, ModelTally>;

export function newTally(): Tally {
  return new Map();
}

// Normalise a raw provider response body into uncached-input / cache-write /
// cache-read / output token counts. Handles all three providers the app speaks:
//   Anthropic  → usage.{input_tokens, output_tokens, cache_*_input_tokens}
//   Google     → usageMetadata.{promptTokenCount (incl. cached), candidatesTokenCount, thoughtsTokenCount, cachedContentTokenCount}
//   OpenAI     → usage.{prompt_tokens, completion_tokens, prompt_tokens_details.cached_tokens}
export function normalizeUsage(data: unknown): NormUsage | null {
  const d = data as Record<string, unknown>;
  const u = d?.usage as Record<string, number> | undefined;
  const g = d?.usageMetadata as Record<string, number> | undefined;
  if (u && typeof u.input_tokens === 'number') {
    return {
      inTokens: u.input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      outTokens: u.output_tokens ?? 0,
    };
  }
  if (g && typeof g.promptTokenCount === 'number') {
    const cached = g.cachedContentTokenCount ?? 0;
    return {
      inTokens: Math.max(0, (g.promptTokenCount ?? 0) - cached),
      cacheWrite: 0, // Gemini caching is implicit; no separate write count in usageMetadata
      cacheRead: cached,
      outTokens: (g.candidatesTokenCount ?? 0) + (g.thoughtsTokenCount ?? 0),
    };
  }
  if (u && typeof u.prompt_tokens === 'number') {
    const cached = (u.prompt_tokens_details as unknown as Record<string, number> | undefined)?.cached_tokens ?? 0;
    return {
      inTokens: Math.max(0, (u.prompt_tokens ?? 0) - cached),
      cacheWrite: 0,
      cacheRead: cached,
      outTokens: u.completion_tokens ?? 0,
    };
  }
  return null;
}

export function addUsage(tally: Tally, model: string, n: NormUsage): void {
  const t = tally.get(model) ?? { calls: 0, inTokens: 0, cacheWrite: 0, cacheRead: 0, outTokens: 0 };
  t.calls += 1;
  t.inTokens += n.inTokens;
  t.cacheWrite += n.cacheWrite;
  t.cacheRead += n.cacheRead;
  t.outTokens += n.outTokens;
  tally.set(model, t);
}

export interface TallySummary {
  calls: number;
  /** Total input tokens across all cache classes (uncached + write + read). */
  inTokens: number;
  outTokens: number;
  costUsd: number;
  /** e.g. "claude-sonnet-4-5×93", which models ran and how many calls each. */
  models: string;
}

/** Fold a tally into totals, pricing each model's usage via pricing.ts. */
export function summarise(tally: Tally): TallySummary {
  let calls = 0, inTokens = 0, outTokens = 0, costUsd = 0;
  const models: string[] = [];
  for (const [model, t] of tally) {
    calls += t.calls;
    inTokens += t.inTokens + t.cacheWrite + t.cacheRead;
    outTokens += t.outTokens;
    costUsd += costFor(model, t);
    models.push(`${model}×${t.calls}`);
  }
  return { calls, inTokens, outTokens, costUsd, models: models.join(', ') || ', ' };
}

/** Wrap a fetch so every model response is tallied. Returns the wrapped fetch;
 *  the caller owns the tally (reset it per measured unit). Cloning the response
 *  leaves the SDK's own body read untouched. The model id lives in the request
 *  JSON body (Anthropic, OpenAI) or the URL path (Google). */
export function tallyingFetch(
  base: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
  tally: Tally,
): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
  return async (input, init) => {
    const res = await base(input, init);
    try {
      const body = typeof init?.body === 'string' ? init.body : '';
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      const model = (body ? (JSON.parse(body) as { model?: string }).model : undefined)
        ?? url?.match(/models\/([^:?/]+)/)?.[1];
      const usage = normalizeUsage(await res.clone().json());
      if (model && usage) addUsage(tally, model, usage);
    } catch { /* non-JSON or non-message endpoint: ignore */ }
    return res;
  };
}
