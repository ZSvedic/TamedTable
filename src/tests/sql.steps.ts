// #SqlExpr #CancelOp
// Step definitions for sql.feature's cancellation and recovery scenarios.
//
// @scripted scenarios answer the patch turn locally: a fetch wrapper
// recognises the request text and replies with a canned apply_spec_patch
// tool call, so the SQL that reaches DuckDB is exactly the slow aggregate
// each scenario needs — deterministic where a live model (or a cassette
// miss) would not be. Unrecognised requests fall through to the original
// fetch (cassette or live), so non-scripted steps in the same scenario
// still work.
import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { DuckDBConnection } from '@duckdb/node-api';
import { TamedTableWorld } from './world.ts';
import { cancelCtx, type CancelCtx, type CancellableRunner } from './cancelation.steps.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Both aggregates hash every tuple of a self-join so DuckDB cannot shortcut
// the count. Against the 1 821-row fixture the three-way join (~6e9 tuples)
// runs for minutes — reliably still executing when the cancel lands — while
// `conn.interrupt()` kills it within milliseconds. The drain variant
// (1 821 × 100 000 tuples, ~5–15 s) is sized to outlive the runner's give-up
// window yet finish on its own, for the interrupt-ignored scenario.
const SLOW_AGG_SQL = "(SELECT count(*) FROM t a, t b, t c WHERE hash(a.title || b.title || c.title) % 1000 = 0)";
const DRAIN_AGG_SQL = "(SELECT count(*) FROM t a, range(100000) r WHERE hash(a.title || r.range::VARCHAR) % 1000 = 0)";
// A fragment DuckDB cannot parse — drives the recovery-loop scenario.
const INVALID_SQL = "date_diff('year', DOB::DATE,";

interface ScriptedState {
  requests: string[];          // every request body the script answered
  slowServedAt?: number;       // when the slow-aggregate patch went out
  invalidServed?: boolean;     // recovery: first turn invalid, retry corrected
  ignoreInterrupt?: boolean;   // serve the drain-sized aggregate instead
  realInterrupt?: typeof DuckDBConnection.prototype.interrupt;
}

const scripted = new WeakMap<TamedTableWorld, ScriptedState>();

function requireScripted(world: TamedTableWorld): ScriptedState {
  const state = scripted.get(world);
  if (!state) throw new Error('not a @scripted scenario — no scripted fetch installed');
  return state;
}

/** A canned Anthropic /v1/messages response carrying one apply_spec_patch call. */
function toolUseBody(ops: unknown[]): string {
  return JSON.stringify({
    model: 'scripted', id: 'msg_scripted', type: 'message', role: 'assistant',
    content: [{ type: 'tool_use', id: 'toolu_scripted', name: 'apply_spec_patch', input: { operations: ops } }],
    stop_reason: 'tool_use', stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  });
}

const addMutate = (col: string, sql: string): unknown[] => [
  { op: 'add', path: '/columns/-', value: { id: col } },
  { op: 'add', path: '/transformations/-', value: { kind: 'mutate', columns: col, value: { sql } } },
];

/** Maps a model-call body to a canned patch, or undefined to fall through. */
function routeScripted(body: string, state: ScriptedState): string | undefined {
  if (body.includes('introduces an invalid SQL fragment')) {
    if (!state.invalidServed) {
      state.invalidServed = true;
      return toolUseBody(addMutate('PhoneLen', INVALID_SQL));
    }
    return toolUseBody(addMutate('PhoneLen', 'length(Phone)'));
  }
  if (/Compute (a|the) slow SQL aggregate/.test(body)) {
    state.slowServedAt = Date.now();
    return toolUseBody(addMutate('SlowAgg', state.ignoreInterrupt ? DRAIN_AGG_SQL : SLOW_AGG_SQL));
  }
  if (body.includes('Add column UpperChannel computed in SQL as upper(channel)')) {
    return toolUseBody(addMutate('UpperChannel', 'upper(channel)'));
  }
  return undefined;
}

Before({ tags: '@scripted' }, function (this: TamedTableWorld) {
  if (!this.runnerOpts) return; // surface mismatch — no runner bound
  const state: ScriptedState = { requests: [] };
  scripted.set(this, state);
  const upstream = this.runnerOpts.fetch;
  this.runnerOpts.fetch = async (input, init) => {
    const body = typeof init?.body === 'string' ? init.body : String(init?.body ?? '');
    const canned = routeScripted(body, state);
    if (canned) {
      state.requests.push(body);
      return new Response(canned, { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (!upstream) throw new Error(`scripted fetch: unrecognised request and no upstream fetch: ${body.slice(0, 200)}`);
    return upstream(input, init);
  };
});

After({ tags: '@scripted' }, function (this: TamedTableWorld) {
  const state = scripted.get(this);
  if (state?.realInterrupt) DuckDBConnection.prototype.interrupt = state.realInterrupt;
});

// ── Cancellation ─────────────────────────────────────────────────────────────

When('query {string} via SQL', function (this: TamedTableWorld, text: string) {
  requireScripted(this);
  const runner = this.ensureRunner() as unknown as CancellableRunner;
  const abort = new AbortController();
  const ctx: CancelCtx = { abort, chunks: [], promise: Promise.resolve() };
  ctx.promise = runner.request(text, { signal: abort.signal });
  ctx.promise.catch((err) => { ctx.rejection = err; });
  cancelCtx.set(this, ctx);
});

When('user cancels the operation while the SQL query is in flight', async function (this: TamedTableWorld) {
  const ctx = cancelCtx.get(this);
  if (!ctx) throw new Error('no SQL request in flight');
  const state = requireScripted(this);
  const start = Date.now();
  while (state.slowServedAt === undefined) {
    if (ctx.rejection) throw ctx.rejection as Error;
    if (Date.now() - start > 30_000) throw new Error('timed out waiting for the scripted patch turn');
    await sleep(20);
  }
  // Let replay register the relation and enter the SELECT — the insert phase
  // measures ~130 ms on the 1 821-row fixture, the SELECT runs far longer.
  await sleep(500);
  const cancelAt = Date.now();
  ctx.abort.abort();
  try { await ctx.promise; } catch { /* expected: Runner: cancelled */ }
  ctx.cancelLatencyMs = Date.now() - cancelAt;
});

Then('the cancel signal returns within {int} seconds', function (this: TamedTableWorld, seconds: number) {
  const ctx = cancelCtx.get(this);
  if (!ctx) throw new Error('no SQL request in flight');
  assert.ok(
    typeof ctx.cancelLatencyMs === 'number' && ctx.cancelLatencyMs < seconds * 1000,
    `cancellation took ${ctx.cancelLatencyMs ?? '?'}ms (must be < ${seconds * 1000}ms)`
  );
});

const assertNoSlowAgg = function (this: TamedTableWorld) {
  const spec = this.ensureRunner().currentSpec();
  assert.ok(
    !JSON.stringify(spec).includes('SlowAgg'),
    `cancelled aggregate leaked into the spec: ${JSON.stringify(spec.transformations)}`
  );
};
Then('the spec contains no transformation for that aggregate', assertNoSlowAgg);
Then('the spec contains no transformation for the cancelled aggregate', assertNoSlowAgg);

Given('the column {string} has been added via SQL', async function (this: TamedTableWorld, col: string) {
  requireScripted(this);
  await this.ensureRunner().request(`Add column ${col} computed in SQL as upper(channel)`);
  const spec = this.ensureRunner().currentSpec();
  assert.ok(spec.columns.some((c) => c.id === col), `column ${col} was not added`);
});

Then('column {string} still shows uppercased values', function (this: TamedTableWorld, col: string) {
  const rows = this.ensureRunner().currentRows();
  assert.ok(rows.length > 0, 'no rows to check');
  let changed = 0;
  for (let i = 0; i < rows.length; i++) {
    const upper = String(rows[i]![col] ?? '');
    const source = String(rows[i]!.channel ?? '');
    // DuckDB's and JS's case folding disagree on some characters (Turkish ı),
    // so accept either direction of the round trip.
    assert.ok(
      upper === source.toUpperCase() || upper.toLowerCase() === source.toLowerCase(),
      `row ${i}: ${col} "${upper}" is not an uppercasing of channel "${source}"`
    );
    if (upper !== source) changed++;
  }
  assert.ok(changed > 0, `${col} is identical to channel in every row — transformation lost`);
});

Then('the second request commits successfully', function (this: TamedTableWorld) {
  const outcome = this.lastRequestOutcome;
  assert.ok(outcome, 'no request outcome recorded');
  assert.ok(outcome.ok, `second request failed: ${outcome.error?.message}`);
});

Given('the SQL query is contrived to ignore conn.interrupt\\(\\)', function (this: TamedTableWorld) {
  const state = requireScripted(this);
  state.ignoreInterrupt = true;
  state.realInterrupt = DuckDBConnection.prototype.interrupt;
  DuckDBConnection.prototype.interrupt = function () { /* contrived no-op — restored in After */ };
});

Then('a second request started immediately throws {string}', async function (this: TamedTableWorld, expected: string) {
  try {
    await this.ensureRunner().request('Add column UpperChannel computed in SQL as upper(channel)');
    assert.fail('second request unexpectedly succeeded while the cancelled query lingers');
  } catch (e) {
    if (e instanceof assert.AssertionError) throw e;
    const msg = (e as Error).message;
    assert.ok(msg.includes(expected), `expected error containing "${expected}", got: ${msg}`);
  }
});

Then('the second request succeeds after the lingering query drains', async function (this: TamedTableWorld) {
  const runner = this.ensureRunner();
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      await runner.request('Add column UpperChannel computed in SQL as upper(channel)');
      break;
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes('already in progress') || Date.now() > deadline) throw e;
      await sleep(250);
    }
  }
  const spec = runner.currentSpec();
  assert.ok(spec.columns.some((c) => c.id === 'UpperChannel'), 'UpperChannel missing after the drain');
});

// ── Recovery loop ────────────────────────────────────────────────────────────

const recoveryRequest = new WeakMap<TamedTableWorld, string>();

Given('a request that introduces an invalid SQL fragment', function (this: TamedTableWorld) {
  requireScripted(this);
  // The script recognises this text: the first patch turn answers with a
  // {sql} fragment DuckDB cannot parse, the retry with a corrected one.
  recoveryRequest.set(this, 'Add a PhoneLen column (introduces an invalid SQL fragment)');
});

When('the spec patch is applied', async function (this: TamedTableWorld) {
  const text = recoveryRequest.get(this);
  if (!text) throw new Error('no pending recovery request — missing Given');
  const runner = this.ensureRunner();
  const specBefore = structuredClone(runner.currentSpec());
  try {
    await runner.request(text);
    this.lastRequestOutcome = { ok: true, specBefore, specAfter: runner.currentSpec() };
  } catch (e) {
    this.lastRequestOutcome = { ok: false, error: e as Error, specBefore, specAfter: runner.currentSpec() };
  }
});

Then('the recovery loop receives the DuckDB error message', function (this: TamedTableWorld) {
  const state = requireScripted(this);
  const retry = state.requests.find((b) => b.includes('evaluation failed'));
  assert.ok(retry, 'no recovery turn reached the model');
  assert.ok(/Parser Error/i.test(retry), `recovery prompt lacks the DuckDB parser error: ${retry.slice(0, 400)}`);
});

Then('the final commit either succeeds within the recovery budget or throws', function (this: TamedTableWorld) {
  const outcome = this.lastRequestOutcome;
  assert.ok(outcome, 'no request outcome recorded');
  if (outcome.ok) {
    assert.ok(
      outcome.specAfter!.transformations.length > outcome.specBefore.transformations.length,
      'request succeeded but appended no transformation'
    );
  } else {
    assert.match(outcome.error!.message, /recovery budget exhausted/, `unexpected failure: ${outcome.error!.message}`);
  }
});

// ── {sql} predicate ──────────────────────────────────────────────────────────

Then('every remaining row has Country in \\({string}, {string}\\)', function (this: TamedTableWorld, a: string, b: string) {
  const rows = this.ensureRunner().currentRows();
  assert.ok(rows.length > 0, 'the filter removed every row');
  for (let i = 0; i < rows.length; i++) {
    const country = String(rows[i]!.Country);
    assert.ok([a, b].includes(country), `row ${i}: unexpected Country "${country}"`);
  }
});
