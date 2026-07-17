import { test, expect } from 'bun:test';
import { ALL_MODELS } from '@tamedtable/model-config';
import { loadModels, priceFor, specFor, costFor, FALLBACK_SPEC, type Provider } from './pricing.ts';

test('loadModels parses benchmarks/models.jsonl', () => {
  const models = loadModels();
  expect(models.length).toBeGreaterThan(0);
  const freeProviders = new Set(['cerebras', 'openrouter']);
  for (const m of models) {
    expect(typeof m.id).toBe('string');
    expect(['anthropic', 'gemini', 'openai', 'cerebras', 'openrouter']).toContain(m.provider);
    // Free-tier rows (Cerebras, OpenRouter) are priced 0/0; every other row must be positive.
    if (freeProviders.has(m.provider)) {
      expect(m.inUsdPerMtok).toBe(0);
      expect(m.outUsdPerMtok).toBe(0);
    } else {
      expect(m.inUsdPerMtok).toBeGreaterThan(0);
      expect(m.outUsdPerMtok).toBeGreaterThan(0);
    }
    expect(m.contextWindow).toBeGreaterThan(0);
    expect(typeof m.audioInput).toBe('boolean');
  }
});

test('the free models are listed under their free provider and priced at zero', () => {
  const expected: Record<string, Provider> = {
    'zai-glm-4.7': 'cerebras',
    'gpt-oss-120b': 'cerebras',
    'qwen/qwen3-coder:free': 'openrouter',
    'meta-llama/llama-3.3-70b-instruct:free': 'openrouter',
  };
  for (const [id, provider] of Object.entries(expected)) {
    const spec = specFor(id);
    expect(spec?.provider).toBe(provider);
    expect(spec?.inUsdPerMtok).toBe(0);
    expect(spec?.outUsdPerMtok).toBe(0);
  }
});

test('every shipped catalogue model has a pricing row', () => {
  // The single-source guarantee: no runtime model may be missing from the
  // benchmark pricing table (else its cost silently falls back to Sonnet).
  const priced = new Set(loadModels().map((m) => m.id));
  for (const m of ALL_MODELS) {
    expect(priced.has(m.id)).toBe(true);
  }
});

test('priceFor returns the row, or the Sonnet fallback for unknown ids', () => {
  expect(priceFor('claude-opus-4-8').inUsdPerMtok).toBe(5);
  expect(priceFor('gpt-5.4-mini').outUsdPerMtok).toBe(4.5);
  expect(priceFor('totally-made-up')).toEqual(FALLBACK_SPEC);
});

test('specFor is defined for known ids and undefined otherwise', () => {
  expect(specFor('gemini-3.5-flash')?.name).toBe('Gemini 3.5 Flash');
  expect(specFor('nope')).toBeUndefined();
});

test('costFor prices each input cache class at its own rate', () => {
  // Opus 4.8: 5/25 per Mtok, cache write 1.25x, read 0.1x.
  // 1M uncached-in + 1M cache-write + 1M cache-read + 1M out
  //   = (1 + 1*1.25 + 1*0.1) * $5  +  1 * $25  =  $11.75 + $25 = $36.75
  const c = costFor('claude-opus-4-8', { inTokens: 1e6, cacheWrite: 1e6, cacheRead: 1e6, outTokens: 1e6 });
  expect(c).toBeCloseTo(36.75, 6);
});
