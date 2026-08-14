// #BenchPerf
// Step definitions + reporter for the standalone performance benchmark
// (spec/test-cases/performance.feature, `bun run bench`). These steps drive the
// headless engine directly and record total time, tokens, and estimated cost per
// scenario; an AfterAll hook prints the summary table. Nothing here runs under
// the regular @headless/@cli/@web profiles: every hook is scoped to @perf.
import { Before, Given, When, Then, AfterAll, type ITestCaseHookParameter } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { createHeadlessRunner, type HeadlessRunner } from '@tamedtable/headless';
import type { TablePlan } from '@tamedtable/core';
import { TamedTableWorld, runnerOptsFor, SPEC_TC_DIR } from './world.ts';
import { newTally, tallyingFetch, summarise, type Tally } from '@tamedtable/bench';

// ── Token accounting ─────────────────────────────────────────────────────────
// Pricing, provider usage parsing, and cost math live in @tamedtable/bench
// (single source: benchmarks/models.jsonl), so this standalone A/B/C flow and
// the model×batch sweep price identically. This file just owns the per-scenario
// tally: reset in the Before hook, written by the shared tallying fetch wrapper,
// read by the finalise step.
let tally: Tally = newTally();

// ── Collected results ────────────────────────────────────────────────────────
interface BenchRow {
  group: string;       // A / B / C
  scenario: string;
  rows: number;        // rows the operation produced
  timeMs: number;      // wall-clock for the measured operation only
  calls: number;
  inTokens: number;
  outTokens: number;
  costUsd: number;
  models: string;
}
const results: BenchRow[] = [];

interface Pending { group: string; scenario: string; rows: number; timeMs: number }
const pending = new WeakMap<TamedTableWorld, Pending>();

function groupFromTags(tags: string[]): string {
  if (tags.includes('@bench-load')) return 'A load';
  if (tags.includes('@bench-sql')) return 'B sql';
  if (tags.includes('@bench-nl')) return 'C nl';
  return '?';
}

// ── Hook: wire a measured runner per @perf scenario ──────────────────────────
Before({ tags: '@perf' }, function (this: TamedTableWorld, scenario: ITestCaseHookParameter) {
  const tags = scenario.pickle.tags.map((t) => t.name);
  const opts = runnerOptsFor(scenario);
  // Tally token usage off every model response, wrapping whatever fetch is in
  // play: the cassette recorder/player (replay/record) or the global fetch
  // (live). Cloning the response leaves the SDK's own read untouched.
  // Tally token usage off every model response, wrapping whatever fetch is in
  // play: the cassette recorder/player (replay/record) or the global fetch
  // (live). The shared wrapper parses all three provider shapes identically.
  const base = opts.fetch ?? ((input: string | URL | Request, init?: RequestInit) => fetch(input, init));
  tally = newTally();
  opts.fetch = tallyingFetch(base, tally);
  this.runnerOpts = opts;
  this.runnerKind = 'headless';
  this.runnerFactory = () => createHeadlessRunner(opts);
  pending.set(this, { group: groupFromTags(tags), scenario: scenario.pickle.name, rows: 0, timeMs: 0 });
});

function bench(world: TamedTableWorld): HeadlessRunner {
  return world.ensureRunner() as unknown as HeadlessRunner;
}

function record(world: TamedTableWorld, rows: number, timeMs: number): void {
  const p = pending.get(world);
  if (!p) throw new Error('no pending benchmark: was the @perf Before hook skipped?');
  p.rows = rows;
  p.timeMs = timeMs;
}

// ── A: load ─────────────────────────────────────────────────────────────────
Given('a fresh benchmark runner', function (this: TamedTableWorld) {
  this.ensureRunner(); // build it now so creation cost isn't charged to the op
});

When('the benchmark loads {string}', async function (this: TamedTableWorld, filename: string) {
  const path = join(SPEC_TC_DIR, filename);
  const t0 = Date.now();
  await bench(this).loadInput(path);
  const timeMs = Date.now() - t0;
  record(this, bench(this).currentRows().length, timeMs);
});

Given('the benchmark has loaded {string}', async function (this: TamedTableWorld, filename: string) {
  await bench(this).loadInput(join(SPEC_TC_DIR, filename));
});

// ── B: SQL operations (no model call; setSpec runs the engine over every row) ─
When('the benchmark sorts rows by {string}', async function (this: TamedTableWorld, column: string) {
  const runner = bench(this);
  const spec: TablePlan = structuredClone(runner.currentSpec());
  spec.transformations.push({ kind: 'sort', by: [{ key: column, dir: 'asc' }] });
  const t0 = Date.now();
  await runner.setSpec(spec);
  record(this, runner.currentRows().length, Date.now() - t0);
});

When('the benchmark filters rows where {string} equals {string}', async function (this: TamedTableWorld, column: string, value: string) {
  const runner = bench(this);
  const spec: TablePlan = structuredClone(runner.currentSpec());
  const escaped = value.replace(/'/g, "''");
  spec.transformations.push({ kind: 'filter', pred: { sql: `${column} = '${escaped}'` } });
  const t0 = Date.now();
  await runner.setSpec(spec);
  record(this, runner.currentRows().length, Date.now() - t0);
});

// ── C: natural-language cell fills (weaker model, batched per N rows) ─────────
When('the benchmark runs the NL request {string}', async function (this: TamedTableWorld, text: string) {
  const runner = bench(this);
  const t0 = Date.now();
  await runner.request(text);
  record(this, runner.currentRows().length, Date.now() - t0);
});

// ── Finalise: fold the timing + token tally into one result row ───────────────
Then('the benchmark records the result', function (this: TamedTableWorld) {
  const p = pending.get(this);
  if (!p) throw new Error('no pending benchmark to record');
  assert.ok(p.rows > 0, `benchmark operation produced no rows (${p.scenario})`);
  const s = summarise(tally);
  results.push({
    group: p.group,
    scenario: p.scenario,
    rows: p.rows,
    timeMs: p.timeMs,
    calls: s.calls,
    inTokens: s.inTokens,
    outTokens: s.outTokens,
    costUsd: s.costUsd,
    models: s.models,
  });
});

// ── Reporter ─────────────────────────────────────────────────────────────────
const grp = (n: number) => n.toLocaleString('en-US');
const secs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
const usd = (n: number) => (n === 0 ? ': ' : `$${n.toFixed(4)}`);

AfterAll(function () {
  // Stay silent in the regular profiles: this file loads globally, but the
  // report is only meaningful when @perf scenarios actually ran.
  if (results.length === 0) return;
  const rows = results.map((r) => [
    r.group,
    r.scenario,
    grp(r.rows),
    secs(r.timeMs),
    String(r.calls),
    grp(r.inTokens),
    grp(r.outTokens),
    usd(r.costUsd),
    r.models,
  ]);
  const totals = results.reduce(
    (a, r) => ({ timeMs: a.timeMs + r.timeMs, calls: a.calls + r.calls, inTokens: a.inTokens + r.inTokens, outTokens: a.outTokens + r.outTokens, costUsd: a.costUsd + r.costUsd }),
    { timeMs: 0, calls: 0, inTokens: 0, outTokens: 0, costUsd: 0 }
  );
  rows.push(['', 'TOTAL', '', secs(totals.timeMs), String(totals.calls), grp(totals.inTokens), grp(totals.outTokens), usd(totals.costUsd), '']);

  const headers = ['Group', 'Scenario', 'Rows', 'Time', 'Calls', 'In tok', 'Out tok', 'Cost', 'Models'];
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join('  ');

  const out: string[] = ['', '════ TamedTable performance benchmark ════', line(headers), line(widths.map((w) => '─'.repeat(w)))];
  for (const row of rows) out.push(line(row));
  out.push('');
  out.push('Cost is estimated from recorded/live token usage at published per-model rates.');
  out.push('Groups A (load) and B (sql) make no model call, so their token/cost columns are 0.');
  process.stdout.write(out.join('\n') + '\n');
});
