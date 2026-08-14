import { test, expect } from 'bun:test';
import { toCsv, parseCsv, mergeRuns, hasFreeTier, type ResultRow } from './results.ts';

function row(partial: Partial<ResultRow>): ResultRow {
  return {
    date: '2026-08-12', run: 'r', tier: 'paid', freeTier: false,
    cellModel: 'm', chatModel: 'p', provider: 'gemini', batchSize: 20,
    rows: 120, timeMs: 51_300, calls: 7, inTokens: 1000, outTokens: 100,
    costUsd: 0.0043, accuracy: 0.97, scored: 120, missing: 0, ...partial,
  };
}

test('a row survives a CSV round trip', () => {
  const [back] = parseCsv(toCsv([row({ cellModel: 'gemini-2.5-flash-lite' })]));
  expect(back).toEqual(row({ cellModel: 'gemini-2.5-flash-lite' }));
});

test('the header names the filter columns first, for a spreadsheet', () => {
  const header = toCsv([row({})]).split('\n')[0];
  expect(header).toBe('date,run,provider,tier,freeTier,cellModel,chatModel,batchSize,accuracyPct,costUsd,timeSec,rows,scored,missing,calls,inTokens,outTokens');
});

test('accuracy is written as a percentage, so a spreadsheet sorts it as one', () => {
  expect(toCsv([row({ accuracy: 0.9333 })])).toContain(',93.3,');
});

test('a model id holding a comma is quoted', () => {
  const csv = toCsv([row({ cellModel: 'weird,name' })]);
  expect(csv).toContain('"weird,name"');
  expect(parseCsv(csv)[0]!.cellModel).toBe('weird,name');
});

test('parseCsv on an empty or header-only table yields no rows', () => {
  expect(parseCsv('')).toEqual([]);
  expect(parseCsv(toCsv([]))).toEqual([]);
});

test('re-running a sweep replaces that run rather than doubling it', () => {
  const before = [row({ run: 'free-groq', accuracy: 0.5 }), row({ run: 'phase2-all' })];
  const after = mergeRuns(before, [row({ run: 'free-groq', accuracy: 0.93 })]);
  expect(after).toHaveLength(2);
  expect(after.filter((r) => r.run === 'free-groq')).toHaveLength(1);
  expect(after.find((r) => r.run === 'free-groq')!.accuracy).toBe(0.93);
  expect(after.find((r) => r.run === 'phase2-all')).toBeDefined();
});

test('only the providers that actually run a free tier are marked free', () => {
  expect(hasFreeTier('gemini')).toBe(true);
  expect(hasFreeTier('groq')).toBe(true);
  expect(hasFreeTier('openrouter')).toBe(true);
  expect(hasFreeTier('cerebras')).toBe(true);
  expect(hasFreeTier('anthropic')).toBe(false);
  expect(hasFreeTier('openai')).toBe(false);
});
