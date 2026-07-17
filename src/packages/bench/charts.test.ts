import { test, expect } from 'bun:test';
import { modelTradeoffChart, batchSweepChart, fileSlug } from './charts.ts';
import type { SweepResult } from './sweep.ts';

function res(partial: Partial<SweepResult>): SweepResult {
  return {
    cellModel: 'm', primaryModel: 'p', provider: 'anthropic', batchSize: 20,
    rows: 100, timeMs: 1000, calls: 5, inTokens: 1000, outTokens: 100,
    costUsd: 0.1, accuracy: 0.6, scored: 100, missing: 0, ...partial,
  };
}

test('modelTradeoffChart emits well-formed SVG with a point per model', () => {
  const svg = modelTradeoffChart([
    res({ cellModel: 'claude-sonnet-4-5', provider: 'anthropic', costUsd: 0.8, accuracy: 0.7 }),
    res({ cellModel: 'gemini-3.1-flash-lite', provider: 'gemini', costUsd: 0.06, accuracy: 0.55 }),
  ], { batchSize: 20 });
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  expect(svg).toContain('claude-sonnet-4-5');
  expect(svg).toContain('gemini-3.1-flash-lite');
  expect((svg.match(/<circle /g) ?? []).length).toBe(2);
});

test('modelTradeoffChart filters to the requested batch size', () => {
  const svg = modelTradeoffChart([
    res({ cellModel: 'a', batchSize: 10 }),
    res({ cellModel: 'b', batchSize: 20 }),
  ], { batchSize: 20 });
  expect(svg).toContain('>b</text>');
  expect(svg).not.toContain('>a</text>');
});

test('batchSweepChart draws three panels and a point per batch size', () => {
  const svg = batchSweepChart([
    res({ cellModel: 'x', batchSize: 5, accuracy: 0.5, costUsd: 0.2, timeMs: 3000 }),
    res({ cellModel: 'x', batchSize: 20, accuracy: 0.6, costUsd: 0.1, timeMs: 1500 }),
    res({ cellModel: 'x', batchSize: 80, accuracy: 0.45, costUsd: 0.05, timeMs: 900 }),
  ], 'x');
  expect(svg).toContain('Accuracy');
  expect(svg).toContain('Cost (USD)');
  expect(svg).toContain('Time (s)');
  expect(svg).toContain('Batch size');
  // 3 batch sizes × 3 panels = 9 points
  expect((svg.match(/<circle /g) ?? []).length).toBe(9);
});

test('fileSlug makes OpenRouter ids safe for chart filenames', () => {
  expect(fileSlug('qwen/qwen3-coder:free')).toBe('qwen-qwen3-coder-free');
  expect(fileSlug('claude-haiku-4-5')).toBe('claude-haiku-4-5'); // plain ids pass through
});
