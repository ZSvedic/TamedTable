import { test, expect } from 'bun:test';
import { tradeoffChart, batchSweepChart, fileSlug, accPos, ACC_TICKS } from './charts.ts';
import type { ResultRow } from './results.ts';

function res(partial: Partial<ResultRow>): ResultRow {
  return {
    date: '2026-08-12', run: 'test', tier: 'paid', freeTier: false,
    cellModel: 'm', primaryModel: 'p', provider: 'anthropic', batchSize: 20,
    rows: 100, timeMs: 1000, calls: 5, inTokens: 1000, outTokens: 100,
    costUsd: 0.1, accuracy: 0.6, scored: 100, missing: 0, ...partial,
  };
}

test('tradeoffChart emits well-formed SVG with a point per model', () => {
  const svg = tradeoffChart([
    res({ cellModel: 'claude-sonnet-4-5', provider: 'anthropic', costUsd: 0.8, accuracy: 0.7 }),
    res({ cellModel: 'gemini-3.1-flash-lite', provider: 'gemini', costUsd: 0.06, accuracy: 0.95 }),
  ], { batchSize: 20, axis: 'cost', title: 'Accuracy vs cost' });
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  expect(svg).toContain('claude-sonnet-4-5');
  expect(svg).toContain('gemini-3.1-flash-lite');
  expect((svg.match(/<circle /g) ?? []).length).toBe(2);
});

test('tradeoffChart labels every point with its accuracy and x value', () => {
  const svg = tradeoffChart([res({ cellModel: 'a', accuracy: 0.934, costUsd: 0.0043 })], {
    batchSize: 20, axis: 'cost', title: 't',
  });
  expect(svg).toContain('93.4%');
  expect(svg).toContain('$0.0043');
});

test('tradeoffChart plots time when asked, not cost', () => {
  const svg = tradeoffChart([res({ cellModel: 'a', timeMs: 51_300, costUsd: 0.9 })], {
    batchSize: 20, axis: 'time', title: 't',
  });
  expect(svg).toContain('Time per task (seconds)');
  expect(svg).toContain('51s');
});

test('tradeoffChart draws the Pareto frontier through the undominated points', () => {
  // b is both cheaper and more accurate than c, so c is dominated; a and b are
  // the real trade (a is dearer but more accurate). The frontier is the UPPER
  // envelope — traced along the bottom instead it recommends the worst models,
  // which is worse than drawing no line at all.
  const svg = tradeoffChart([
    res({ cellModel: 'a', costUsd: 0.9, accuracy: 0.97 }),
    res({ cellModel: 'b', costUsd: 0.1, accuracy: 0.90 }),
    res({ cellModel: 'c', costUsd: 0.5, accuracy: 0.80 }),
  ], { batchSize: 20, axis: 'cost', title: 't' });

  const frontier = svg.match(/<polyline points="([^"]+)"[^>]*stroke-dasharray/);
  expect(frontier).not.toBeNull();
  const frontierYs = frontier![1]!.split(' ').map((p) => Number(p.split(',')[1]));
  expect(frontierYs).toHaveLength(2);

  // Every circle, paired with its radius: the frontier's points are the big ones.
  const circles = [...svg.matchAll(/<circle cx="[\d.]+" cy="([\d.]+)" r="([\d.]+)"/g)]
    .map((m) => ({ y: Number(m[1]), r: Number(m[2]) }));
  const big = circles.filter((c) => c.r === 6).map((c) => c.y).sort((x, y) => x - y);
  const small = circles.filter((c) => c.r !== 6).map((c) => c.y);
  expect(big).toHaveLength(2);
  expect(small).toHaveLength(1);
  // Smaller y is higher accuracy: the dominated point must sit below both.
  expect(small[0]!).toBeGreaterThan(Math.max(...big));
  expect(frontierYs.slice().sort((x, y) => x - y)).toEqual(big);
});

test('tradeoffChart filters to the requested batch size', () => {
  const svg = tradeoffChart([
    res({ cellModel: 'a', batchSize: 10 }),
    res({ cellModel: 'b', batchSize: 20 }),
  ], { batchSize: 20, axis: 'cost', title: 't' });
  expect(svg).toContain('>b</text>');
  expect(svg).not.toContain('>a</text>');
});

test('the accuracy axis is a log scale over the error rate', () => {
  // Halving the error is the same distance every time it happens: 80→90 and
  // 90→95 both halve it, so both must span the same fraction of the axis.
  const a = accPos(0.9) - accPos(0.8);
  const b = accPos(0.95) - accPos(0.9);
  expect(Math.abs(a - b)).toBeLessThan(0.001);
  // A linear axis would have made the second gap half the first.
  expect(b).toBeGreaterThan(0.15);
});

test('every chart uses the same accuracy scale, so two of them compare', () => {
  const rows = [res({ cellModel: 'x', batchSize: 5 }), res({ cellModel: 'x', batchSize: 20 })];
  const tradeoff = tradeoffChart(rows, { batchSize: 20, axis: 'cost', title: 't' });
  for (const tick of ACC_TICKS) expect(tradeoff).toContain(`>${(tick * 100).toFixed(0)}%</text>`);
  // The batch panels label only the ends plus the 90% midline, but off the very
  // same scale — a point at 90% sits at the same height on both.
  expect(batchSweepChart(rows, 'x')).toContain('>90%</text>');
});

test('batchSweepChart draws three panels and a point per batch size', () => {
  const svg = batchSweepChart([
    res({ cellModel: 'x', batchSize: 5, accuracy: 0.9, costUsd: 0.2, timeMs: 3000 }),
    res({ cellModel: 'x', batchSize: 20, accuracy: 0.95, costUsd: 0.1, timeMs: 1500 }),
    res({ cellModel: 'x', batchSize: 80, accuracy: 0.8, costUsd: 0.05, timeMs: 900 }),
  ], 'x');
  expect(svg).toContain('Accuracy');
  expect(svg).toContain('Cost (USD)');
  expect(svg).toContain('Time (s)');
  expect(svg).toContain('Batch size');
  // 3 batch sizes × 3 panels = 9 points
  expect((svg.match(/<circle /g) ?? []).length).toBe(9);
  // Each point carries its value, so the number is readable without a ruler.
  expect(svg).toContain('>95%</text>');
  expect(svg).toContain('>3s</text>');
});

test('fileSlug makes OpenRouter ids safe for chart filenames', () => {
  expect(fileSlug('qwen/qwen3-coder:free')).toBe('qwen-qwen3-coder-free');
  expect(fileSlug('claude-haiku-4-5')).toBe('claude-haiku-4-5'); // plain ids pass through
});
