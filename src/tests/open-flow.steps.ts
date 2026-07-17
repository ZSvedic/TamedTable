// #OpenFlow — step defs for spec/test-cases/open-flow.feature: the setSpec
// progress and cancel seam the web's live run progress drives.
import { When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { parseFlow } from '@tamedtable/file-io';
import type { HeadlessRunner, StepUpdate } from '@tamedtable/headless';
import { TamedTableWorld, fixturePath } from './world.ts';

// Per-World replay context for the progress/cancel scenarios.
const replayCtx = new WeakMap<TamedTableWorld, { steps: StepUpdate[]; error?: Error }>();

const headlessRunner = (world: TamedTableWorld): HeadlessRunner =>
  world.ensureRunner() as unknown as HeadlessRunner;

async function readFlowSpec(filename: string) {
  return parseFlow(await readFile(fixturePath(filename), 'utf8')).spec;
}

When('the flow {string} replays with progress tracking', async function (this: TamedTableWorld, filename: string) {
  const steps: StepUpdate[] = [];
  replayCtx.set(this, { steps });
  await headlessRunner(this).setSpec(await readFlowSpec(filename), { onStep: (u) => steps.push(u) });
});

When('the flow {string} replays but is cancelled at the first step', async function (this: TamedTableWorld, filename: string) {
  const abort = new AbortController();
  const ctx: { steps: StepUpdate[]; error?: Error } = { steps: [] };
  replayCtx.set(this, ctx);
  try {
    await headlessRunner(this).setSpec(await readFlowSpec(filename), {
      signal: abort.signal,
      onStep: (u) => {
        ctx.steps.push(u);
        abort.abort();
      },
    });
  } catch (e) {
    ctx.error = e as Error;
  }
  assert.equal(ctx.error?.message, 'Runner: cancelled', 'expected the replay to cancel');
});

Then('the replay reported step {int} of {int} labelled {string} over {int} rows', function (this: TamedTableWorld, step: number, total: number, label: string, rows: number) {
  const ctx = replayCtx.get(this);
  const u = ctx?.steps[step - 1];
  assert.ok(u, `no step ${step} reported (got ${ctx?.steps.length ?? 0})`);
  assert.deepEqual(
    { index: u!.index, total: u!.total, label: u!.label, rows: u!.rows },
    { index: step - 1, total, label, rows },
  );
});

Then('the replayed table has {int} rows', function (this: TamedTableWorld, n: number) {
  assert.equal(this.ensureRunner().currentRows().length, n);
});

Then('the replayed spec has {int} transformations', function (this: TamedTableWorld, n: number) {
  assert.equal(this.ensureRunner().currentSpec().transformations.length, n);
});

Then('replayed row {int} has {string} = {string}', function (this: TamedTableWorld, row: number, column: string, expected: string) {
  const r = this.ensureRunner().currentRows()[row - 1];
  assert.ok(r, `no row ${row}`);
  assert.equal(String(r[column]), expected);
});
