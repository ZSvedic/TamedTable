// #BenchE1
// E1: can the chat model write good recipe steps? The test suite's own
// scenarios run with a stand-in chat model writing every change. Method and
// results: benchmarks/mcp-e1/README.md.

import type { InstructionsVariant } from '@tamedtable/mcp-server';
import type { CandidateConfig, CandidateProvider } from './candidate.ts';

export * from './wire.ts';
export * from './candidate.ts';
export * from './intercept.ts';
export * from './results.ts';

export interface E1Env {
  run: string;
  cfg: Omit<CandidateConfig, 'fetch'>;
  maxAttempts: number;
}

/** The run's settings, from the environment `bun run bench:e1` sets. A model
 *  id with a vendor prefix (anthropic/claude-sonnet-5) routes to OpenRouter. */
export function e1Env(env: Record<string, string | undefined> = process.env): E1Env {
  const model = env.E1_MODEL ?? 'gpt-5.4-mini';
  const provider: CandidateProvider = model.includes('/') ? 'openrouter' : 'openai';
  const variant = (env.E1_VARIANT ?? 'planner') as InstructionsVariant;
  if (variant !== 'planner' && variant !== 'schema') throw new Error(`E1_VARIANT must be schema or planner, not ${variant}`);
  const apiKey = provider === 'openrouter' ? env.OPENROUTER_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(`E1 needs ${provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'OPENAI_API_KEY'} for ${model}`);
  const run = env.E1_RUN ?? `${model.replace(/\//g, '_')}-${variant}`;
  return { run, cfg: { provider, model, variant, apiKey }, maxAttempts: Number(env.E1_MAX_ATTEMPTS ?? 4) };
}
