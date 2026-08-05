import { test, expect } from 'bun:test';
import { runConfig, runSweep, grid } from './sweep.ts';
import type { HeadlessRunner } from '@tamedtable/headless';
import type { Row, TablePlan } from '@tamedtable/core';

// A fake engine: on request() it makes one "model call" through the injected
// fetch (so the tally/cost path is exercised) and fills the Music column with a
// deterministic rule, then currentRows() returns the labelled rows.
function fakeRunner(fetchImpl: ((i: string | URL | Request, init?: RequestInit) => Promise<Response>) | undefined, cellModel: string): HeadlessRunner {
  let rows: Row[] = [];
  const stub: Partial<HeadlessRunner> = {
    async loadInput() {
      rows = [
        { videoId: 'a', title: 'Take Five', Music: undefined },
        { videoId: 'b', title: 'iPhone review', Music: undefined },
        { videoId: 'c', title: 'Official Music Video', Music: undefined },
      ];
    },
    async request() {
      // Simulate the per-cell model call so tallyingFetch sees usage.
      if (fetchImpl) {
        await fetchImpl('https://api.example/v1/x', { body: JSON.stringify({ model: cellModel }) });
      }
      rows = rows.map((r) => ({ ...r, Music: /music|take five/i.test(String(r.title)) }));
    },
    currentRows: () => rows,
    currentSpec: () => ({ table: 't', columns: [], transformations: [] }) as TablePlan,
  };
  return stub as HeadlessRunner;
}

const baseFetch = async () =>
  new Response(JSON.stringify({ usage: { input_tokens: 100, output_tokens: 20 } }), { headers: { 'content-type': 'application/json' } });

test('runConfig scores accuracy against labels and prices the tally', async () => {
  const r = await runConfig(
    { cellModel: 'claude-sonnet-4-5', batchSize: 20 },
    {
      inputCsv: '/ignored/by/fake.csv',
      request: 'Add a boolean column Music',
      idColumn: 'videoId',
      targetColumn: 'Music',
      labels: [
        { id: 'a', expected: true },   // "Take Five" → true ✓
        { id: 'b', expected: false },  // "iPhone review" → false ✓
        { id: 'c', expected: false },  // "Official Music Video" → true ✗
      ],
      baseFetch,
      runnerFactory: (opts) => fakeRunner(opts.fetch, opts.cellModel!),
    },
  );
  expect(r.provider).toBe('anthropic');
  expect(r.primaryModel).toBe('claude-sonnet-4-6'); // same-provider patch default
  expect(r.scored).toBe(3);
  expect(r.accuracy).toBeCloseTo(2 / 3, 6);
  expect(r.calls).toBe(1);
  expect(r.costUsd).toBeGreaterThan(0);
});

test('runConfig maps a Cerebras cell model to the cerebras provider and its patch default', async () => {
  const r = await runConfig(
    { cellModel: 'gpt-oss-120b', batchSize: 20 },
    {
      inputCsv: '/ignored/by/fake.csv',
      request: 'Add a boolean column Music',
      idColumn: 'videoId',
      targetColumn: 'Music',
      labels: [{ id: 'a', expected: true }],
      baseFetch,
      runnerFactory: (opts) => fakeRunner(opts.fetch, opts.cellModel!),
    },
  );
  expect(r.provider).toBe('cerebras');
  expect(r.primaryModel).toBe('zai-glm-4.7');
  expect(r.costUsd).toBe(0); // free tier — both models priced 0/0
});

test('runConfig maps an OpenRouter cell model to the openrouter provider and its patch default', async () => {
  const r = await runConfig(
    { cellModel: 'meta-llama/llama-3.3-70b-instruct:free', batchSize: 20 },
    {
      inputCsv: '/ignored/by/fake.csv',
      request: 'Add a boolean column Music',
      idColumn: 'videoId',
      targetColumn: 'Music',
      labels: [{ id: 'a', expected: true }],
      baseFetch,
      runnerFactory: (opts) => fakeRunner(opts.fetch, opts.cellModel!),
    },
  );
  expect(r.provider).toBe('openrouter');
  expect(r.primaryModel).toBe('cohere/north-mini-code:free');
  expect(r.costUsd).toBe(0); // free plan — both models priced 0/0
});

test('runSweep runs every config; grid expands the cross product', async () => {
  const configs = grid(['claude-sonnet-4-5', 'claude-haiku-4-5'], [10, 40]);
  expect(configs).toHaveLength(4);
  const results = await runSweep(configs, {
    inputCsv: 'x', request: 'r', idColumn: 'videoId', targetColumn: 'Music',
    labels: [{ id: 'a', expected: true }],
    baseFetch,
    runnerFactory: (opts) => fakeRunner(opts.fetch, opts.cellModel!),
  });
  expect(results).toHaveLength(4);
  expect(results.map((r) => r.batchSize)).toEqual([10, 40, 10, 40]);
});

// A runner whose request() throws the first `failFirst` times it is called —
// stands in for a free model that returns the patch turn as text on some
// attempts. Shared counter across runnerFactory calls simulates per-config retry.
function flakyRunner(failFirst: { n: number }): HeadlessRunner {
  const stub: Partial<HeadlessRunner> = {
    async loadInput() {},
    async request() {
      if (failFirst.n > 0) { failFirst.n -= 1; throw new Error('LLM did not call apply_spec_patch; returned text: {'); }
    },
    currentRows: () => [{ videoId: 'a', title: 't', Music: true }],
    currentSpec: () => ({ table: 't', columns: [], transformations: [] }) as TablePlan,
  };
  return stub as HeadlessRunner;
}

test('runSweep retries a config that throws and succeeds within the budget', async () => {
  const failFirst = { n: 2 }; // first two attempts throw, third succeeds
  const results = await runSweep([{ cellModel: 'cohere/north-mini-code:free', batchSize: 10 }], {
    inputCsv: 'x', request: 'r', idColumn: 'videoId', targetColumn: 'Music',
    labels: [{ id: 'a', expected: true }], retries: 3,
    runnerFactory: () => flakyRunner(failFirst),
  });
  expect(results).toHaveLength(1);
  expect(results[0]!.accuracy).toBe(1);
});

test('runSweep rethrows when a config exhausts its retry budget', async () => {
  const failFirst = { n: 99 }; // always throws
  await expect(runSweep([{ cellModel: 'cohere/north-mini-code:free', batchSize: 10 }], {
    inputCsv: 'x', request: 'r', idColumn: 'videoId', targetColumn: 'Music',
    labels: [{ id: 'a', expected: true }], retries: 2,
    runnerFactory: () => flakyRunner(failFirst),
  })).rejects.toThrow('apply_spec_patch');
});
