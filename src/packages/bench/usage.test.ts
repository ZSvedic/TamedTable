import { test, expect } from 'bun:test';
import { normalizeUsage, newTally, addUsage, summarise, tallyingFetch } from './usage.ts';

test('normalizeUsage reads the Anthropic shape', () => {
  const n = normalizeUsage({ usage: { input_tokens: 10, output_tokens: 3, cache_creation_input_tokens: 5, cache_read_input_tokens: 7 } });
  expect(n).toEqual({ inTokens: 10, cacheWrite: 5, cacheRead: 7, outTokens: 3 });
});

test('normalizeUsage reads the Google shape (prompt count includes cached)', () => {
  const n = normalizeUsage({ usageMetadata: { promptTokenCount: 100, cachedContentTokenCount: 30, candidatesTokenCount: 8, thoughtsTokenCount: 2 } });
  expect(n).toEqual({ inTokens: 70, cacheWrite: 0, cacheRead: 30, outTokens: 10 });
});

test('normalizeUsage reads the OpenAI shape', () => {
  const n = normalizeUsage({ usage: { prompt_tokens: 50, completion_tokens: 4, prompt_tokens_details: { cached_tokens: 20 } } });
  expect(n).toEqual({ inTokens: 30, cacheWrite: 0, cacheRead: 20, outTokens: 4 });
});

test('normalizeUsage returns null for unrelated bodies', () => {
  expect(normalizeUsage({ foo: 1 })).toBeNull();
  expect(normalizeUsage(null)).toBeNull();
});

test('summarise totals calls/tokens and prices via pricing.ts', () => {
  const t = newTally();
  addUsage(t, 'claude-haiku-4-5', { inTokens: 1e6, cacheWrite: 0, cacheRead: 0, outTokens: 1e6 });
  const s = summarise(t);
  expect(s.calls).toBe(1);
  expect(s.inTokens).toBe(1e6);
  expect(s.outTokens).toBe(1e6);
  // Haiku 4.5 = 1/5 → $1 + $5 = $6
  expect(s.costUsd).toBeCloseTo(6, 6);
  expect(s.models).toBe('claude-haiku-4-5×1');
});

test('tallyingFetch records usage from the response, model from the body', async () => {
  const t = newTally();
  const base = async () => new Response(JSON.stringify({ usage: { input_tokens: 4, output_tokens: 2 } }), { headers: { 'content-type': 'application/json' } });
  const f = tallyingFetch(base, t);
  await f('https://api.anthropic.com/v1/messages', { body: JSON.stringify({ model: 'claude-sonnet-4-6' }) });
  expect(t.get('claude-sonnet-4-6')).toMatchObject({ calls: 1, inTokens: 4, outTokens: 2 });
});
