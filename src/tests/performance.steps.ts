// #BenchPerf
// Step definitions + reporter for the standalone performance benchmark
// (spec/test-cases/performance.feature, `bun run bench`). These steps drive the
// headless engine directly and record total time, tokens, and estimated cost per
// scenario; an AfterAll hook prints the summary table. Nothing here runs under
// the regular @headless/@cli/@web profiles — every hook is scoped to @perf.
import { Before, Given, When, Then, AfterAll, type ITestCaseHookParameter } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { createHeadlessRunner, type HeadlessRunner } from '@tamedtable/headless';
import type { TablePlan } from '@tamedtable/core';
import { TamedTableWorld, runnerOptsFor, SPEC_TC_DIR } from './world.ts';

// ── Pricing ──────────────────────────────────────────────────────────────────
// USD per million tokens (input / output). Source: the claude-api pricing
// reference. Sonnet 4.5 is priced at the Sonnet tier. Unknown models fall back
// to the Sonnet rate so a model swap never crashes the report — only skews cost.
const PRICING: Record<string, { in: number; out: number }> = {
  'claude-fable-5': { in: 10, out: 50 },
  'claude-opus-4-8': { in: 5, out: 25 },
  'claude-opus-4-7': { in: 5, out: 25 },
  'claude-opus-4-6': { in: 5, out: 25 },
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-sonnet-4-5': { in: 3, out: 15 },
  'claude-haiku-4-5': { in: 1, out: 5 },
  // Gemini — representative Flash-tier rates (the catalogue IDs track the Flash
  // and Flash-Lite tiers); adjust if Google publishes different numbers.
  'gemini-3.1-pro-preview': { in: 1.25, out: 10 },
  'gemini-3.5-flash': { in: 0.3, out: 2.5 },
  'gemini-3.1-flash-lite': { in: 0.1, out: 0.4 },
  // OpenAI — representative flagship/mini rates.
  'gpt-5.5': { in: 1.25, out: 10 },
  'gpt-5.4-mini': { in: 0.25, out: 2 },
};
const FALLBACK_PRICE = { in: 3, out: 15 };

// Prompt-cache multipliers on the input rate: a cache write costs 1.25×, a
// cache read 0.1×. The runtime sends each cell/patch prompt with an ephemeral
// cache breakpoint, so most input tokens land in the cache fields rather than
// `input_tokens` — counting only `input_tokens` would wildly undercount both
// tokens and cost.
const CACHE_WRITE_MULT = 1.25;
const CACHE_READ_MULT = 0.1;

// ── Per-model usage tally ────────────────────────────────────────────────────
// Reset before each scenario; written by the fetch wrapper installed in Before
// (so live and cassette-replay runs are measured identically), read by the When
// steps that finalise the scenario's metric.
interface NormUsage { inTokens: number; cacheWrite: number; cacheRead: number; outTokens: number }
interface ModelTally extends NormUsage { calls: number }
let tally = new Map<string, ModelTally>();

function resetTally(): void {
  tally = new Map();
}

// Normalise a raw provider response body into uncached-input / cache-write /
// cache-read / output token counts. Handles all three providers the app speaks:
//   Anthropic  → usage.{input_tokens, output_tokens, cache_*_input_tokens}
//   Google     → usageMetadata.{promptTokenCount (incl. cached), candidatesTokenCount, thoughtsTokenCount, cachedContentTokenCount}
//   OpenAI     → usage.{prompt_tokens, completion_tokens, prompt_tokens_details.cached_tokens}
function normalizeUsage(data: unknown): NormUsage | null {
  const d = data as Record<string, unknown>;
  const u = d?.usage as Record<string, number> | undefined;
  const g = d?.usageMetadata as Record<string, number> | undefined;
  if (u && typeof u.input_tokens === 'number') {
    return {
      inTokens: u.input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      outTokens: u.output_tokens ?? 0,
    };
  }
  if (g && typeof g.promptTokenCount === 'number') {
    const cached = g.cachedContentTokenCount ?? 0;
    return {
      inTokens: Math.max(0, (g.promptTokenCount ?? 0) - cached),
      cacheWrite: 0, // Gemini caching is implicit; no separate write count in usageMetadata
      cacheRead: cached,
      outTokens: (g.candidatesTokenCount ?? 0) + (g.thoughtsTokenCount ?? 0),
    };
  }
  if (u && typeof u.prompt_tokens === 'number') {
    const cached = (u.prompt_tokens_details as unknown as Record<string, number> | undefined)?.cached_tokens ?? 0;
    return {
      inTokens: Math.max(0, (u.prompt_tokens ?? 0) - cached),
      cacheWrite: 0,
      cacheRead: cached,
      outTokens: u.completion_tokens ?? 0,
    };
  }
  return null;
}

function addUsage(model: string, n: NormUsage): void {
  const t = tally.get(model) ?? { calls: 0, inTokens: 0, cacheWrite: 0, cacheRead: 0, outTokens: 0 };
  t.calls += 1;
  t.inTokens += n.inTokens;
  t.cacheWrite += n.cacheWrite;
  t.cacheRead += n.cacheRead;
  t.outTokens += n.outTokens;
  tally.set(model, t);
}

// Total input includes cached tokens; cost prices each input class at its own
// cache-adjusted rate plus output at the output rate.
function summariseTally(): { calls: number; inTokens: number; outTokens: number; costUsd: number; models: string } {
  let calls = 0, inTokens = 0, outTokens = 0, costUsd = 0;
  const models: string[] = [];
  for (const [model, t] of tally) {
    const price = PRICING[model] ?? FALLBACK_PRICE;
    calls += t.calls;
    inTokens += t.inTokens + t.cacheWrite + t.cacheRead;
    outTokens += t.outTokens;
    costUsd += ((t.inTokens + t.cacheWrite * CACHE_WRITE_MULT + t.cacheRead * CACHE_READ_MULT) / 1e6) * price.in
      + (t.outTokens / 1e6) * price.out;
    models.push(`${model}×${t.calls}`);
  }
  return { calls, inTokens, outTokens, costUsd, models: models.join(', ') || '—' };
}

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
  // play — the cassette recorder/player (replay/record) or the global fetch
  // (live). Cloning the response leaves the SDK's own read untouched.
  const base = opts.fetch ?? ((input: string | URL | Request, init?: RequestInit) => fetch(input, init));
  resetTally();
  opts.fetch = async (input, init) => {
    const res = await base(input, init);
    try {
      const body = typeof init?.body === 'string' ? init.body : '';
      // Model id lives in the JSON body (Anthropic, OpenAI) or the URL path
      // (Google: …/models/<id>:generateContent).
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      const model = (body ? (JSON.parse(body) as { model?: string }).model : undefined)
        ?? url?.match(/models\/([^:?/]+)/)?.[1];
      const usage = normalizeUsage(await res.clone().json());
      if (model && usage) addUsage(model, usage);
    } catch { /* non-JSON or non-message endpoint — ignore */ }
    return res;
  };
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
  if (!p) throw new Error('no pending benchmark — was the @perf Before hook skipped?');
  p.rows = rows;
  p.timeMs = timeMs;
}

// ── A — load ─────────────────────────────────────────────────────────────────
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

// ── B — SQL operations (no model call; setSpec runs the engine over every row) ─
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

// ── C — natural-language cell fills (weaker model, batched per N rows) ─────────
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
  const s = summariseTally();
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
const usd = (n: number) => (n === 0 ? '—' : `$${n.toFixed(4)}`);

AfterAll(function () {
  // Stay silent in the regular profiles — this file loads globally, but the
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
