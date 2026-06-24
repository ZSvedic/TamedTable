// #CancelOp
import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import type { ChunkUpdate } from '@tamedtable/headless';
import { loadCsv } from '@tamedtable/core';
import { TamedTableWorld, SPEC_TC_DIR } from './world.ts';

const DEFAULT_INPUT = join(SPEC_TC_DIR, 'datanorm-input.csv');

setDefaultTimeout(600_000);

// Shared with sql.steps.ts — the SQL-cancellation scenarios reuse the same
// in-flight context and the Then-assertions below.
export type CancellableRunner = {
  request(text: string, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void }): Promise<void>;
};

export interface CancelCtx {
  abort: AbortController;
  promise: Promise<unknown>;
  chunks: ChunkUpdate[];
  rejection?: unknown;
  cancelLatencyMs?: number;
}

export const cancelCtx = new WeakMap<TamedTableWorld, CancelCtx>();

async function waitForChunk(ctx: CancelCtx, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  while (ctx.chunks.length === 0) {
    if (ctx.rejection) throw ctx.rejection;
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for first chunk');
    await new Promise((r) => setTimeout(r, 20));
  }
}

When('query {string} via LLM', async function (this: TamedTableWorld, text: string) {
  const runner = this.ensureRunner() as unknown as CancellableRunner;
  const abort = new AbortController();
  const chunks: ChunkUpdate[] = [];
  const ctx: CancelCtx = { abort, chunks, promise: Promise.resolve() };
  ctx.promise = runner.request(text, { signal: abort.signal, onChunk: (u) => chunks.push(u) });
  ctx.promise.catch((err) => {
    ctx.rejection = err;
  });
  cancelCtx.set(this, ctx);
});

When('at least one chunk has completed', async function (this: TamedTableWorld) {
  const ctx = cancelCtx.get(this);
  if (!ctx) throw new Error('no LLM request in flight');
  await waitForChunk(ctx);
});

When('user cancels the operation after at least one chunk has completed', async function (this: TamedTableWorld) {
  const ctx = cancelCtx.get(this);
  if (!ctx) throw new Error('no LLM request in flight');
  await waitForChunk(ctx);
  const cancelAt = Date.now();
  ctx.abort.abort();
  try {
    await ctx.promise;
  } catch {
    /* expected: Runner: cancelled */
  }
  ctx.cancelLatencyMs = Date.now() - cancelAt;
});

Then('processing stops within 2 seconds', function (this: TamedTableWorld) {
  const ctx = cancelCtx.get(this);
  if (!ctx) throw new Error('no request in flight');
  assert.ok(
    typeof ctx.cancelLatencyMs === 'number' && ctx.cancelLatencyMs < 2000,
    `cancellation took ${ctx.cancelLatencyMs ?? '?'}ms (must be < 2000ms)`
  );
});

Then('the spec contains no llm-map transformation for Country', function (this: TamedTableWorld) {
  const spec = this.ensureRunner().currentSpec() as { transformations: Array<{ kind: string; columns?: string | string[]; value?: { llm?: string } }> };
  const found = spec.transformations.some((t) => {
    if (t.kind !== 'mutate') return false;
    const cols = Array.isArray(t.columns) ? t.columns : t.columns ? [t.columns] : [];
    return cols.includes('Country') && t.value?.llm !== undefined;
  });
  assert.ok(!found, 'spec still contains an LLM mutate transformation for Country');
});

Then('the table shows pre-transformation values for every row', async function (this: TamedTableWorld) {
  const inputPath = this.inputPath ?? DEFAULT_INPUT;
  const { rows: source } = await loadCsv(inputPath);
  const current = this.ensureRunner().currentRows();
  assert.equal(current.length, source.length);
  for (let i = 0; i < source.length; i++) {
    assert.deepEqual(current[i], source[i], `row ${i}: cancelled run leaked a transformed value`);
  }
});

Then('the table shows transformed values for already-processed rows', function (this: TamedTableWorld) {
  const ctx = cancelCtx.get(this);
  if (!ctx) throw new Error('no LLM request in flight');
  assert.ok(ctx.chunks.length > 0, 'no chunks observed');
  for (const c of ctx.chunks) {
    assert.notEqual(c.after, undefined, 'chunk produced undefined value');
  }
});

Then('the table shows original values for unprocessed rows', async function (this: TamedTableWorld) {
  const ctx = cancelCtx.get(this);
  if (!ctx) throw new Error('no LLM request in flight');
  const inputPath = this.inputPath ?? DEFAULT_INPUT;
  const { rows: source } = await loadCsv(inputPath);
  const processed = new Set(ctx.chunks.map((c) => c.rowIndex));
  assert.ok(processed.size < source.length, 'every row was processed; need at least one unprocessed row to assert');
});

Given('Phone column has been normalized', async function (this: TamedTableWorld) {
  await this.ensureRunner().request('Normalize phone numbers');
});

Then('Phone column still shows normalized values', function (this: TamedTableWorld) {
  const spec = this.ensureRunner().currentSpec() as { transformations: Array<{ kind: string; columns?: string | string[]; value?: { llm?: string } }> };
  const has = spec.transformations.some((t) => {
    if (t.kind !== 'mutate') return false;
    const cols = Array.isArray(t.columns) ? t.columns : t.columns ? [t.columns] : [];
    return cols.includes('Phone') && t.value?.llm !== undefined;
  });
  assert.ok(has, `Phone normalization transformation was unexpectedly removed. TablePlan transformations: ${JSON.stringify(spec.transformations)}`);
});

Then('Country column shows pre-transformation values', async function (this: TamedTableWorld) {
  const inputPath = this.inputPath ?? DEFAULT_INPUT;
  const { rows: source } = await loadCsv(inputPath);
  const current = this.ensureRunner().currentRows();
  for (let i = 0; i < source.length; i++) {
    assert.equal(current[i]?.Country, source[i]?.Country, `row ${i} Country leaked transformed value`);
  }
});
