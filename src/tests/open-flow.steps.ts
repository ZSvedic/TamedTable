// #OpenFlow — step defs for spec/test-cases/open-flow.feature.
// Web: opening a .flow through the Open dialog applies it (with the
// flow-run dialog behind the scenes). Headless: the setSpec progress and
// cancel seam that dialog drives.
import { When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFlow } from '@tamedtable/file-io';
import type { HeadlessRunner, StepUpdate } from '@tamedtable/headless';
import { TamedTableWorld, SPEC_TC_DIR } from './world.ts';
import { webCtx, webController } from './web-file-port.ts';

// Per-World replay context for the headless progress/cancel scenarios.
const replayCtx = new WeakMap<TamedTableWorld, { steps: StepUpdate[]; error?: Error }>();

const headlessRunner = (world: TamedTableWorld): HeadlessRunner =>
  world.ensureRunner() as unknown as HeadlessRunner;

async function readFlowSpec(filename: string) {
  return parseFlow(await readFile(join(SPEC_TC_DIR, filename), 'utf8')).spec;
}

// ── Web: the two-dialog open handshake ───────────────────────────────────────

// Resolve the pending Open dialog with a .flow but do NOT await the overall
// open action — with no table loaded it stays pending on the input picker,
// which the next "user selects" step resolves.
When('user selects the flow {string} which then asks for its input', async function (this: TamedTableWorld, filename: string) {
  const ctx = webCtx(this);
  const bytes = new Uint8Array(await readFile(join(SPEC_TC_DIR, filename)));
  await ctx.filePort!.resolveOpen({ name: filename, bytes });
});

// Serve a fixture's bytes under a different name — an invalid .flow is just
// a CSV wearing the extension.
When('user selects {string} renamed to {string}', async function (this: TamedTableWorld, fixture: string, asName: string) {
  const ctx = webCtx(this);
  const bytes = new Uint8Array(await readFile(join(SPEC_TC_DIR, fixture)));
  await ctx.filePort!.resolveOpen({ name: asName, bytes });
  await ctx.pending;
});

Then('the undo history lists {string}', function (this: TamedTableWorld, label: string) {
  const labels = webController(this).history().map((h) => h.label);
  assert.ok(labels.includes(label), `history is [${labels.join(', ')}] — missing "${label}"`);
});

// ── Headless: setSpec progress and cancel ────────────────────────────────────

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

Then('the replay reported step {int} of {int} as {string} over {int} rows', function (this: TamedTableWorld, step: number, total: number, kind: string, rows: number) {
  const ctx = replayCtx.get(this);
  const u = ctx?.steps[step - 1];
  assert.ok(u, `no step ${step} reported (got ${ctx?.steps.length ?? 0})`);
  assert.deepEqual(
    { index: u!.index, total: u!.total, kind: u!.kind, rows: u!.rows },
    { index: step - 1, total, kind, rows },
  );
});

Then('the replayed table has {int} rows', function (this: TamedTableWorld, n: number) {
  assert.equal(this.ensureRunner().currentRows().length, n);
});

Then('the replayed spec has {int} transformations', function (this: TamedTableWorld, n: number) {
  assert.equal(this.ensureRunner().currentSpec().transformations.length, n);
});
