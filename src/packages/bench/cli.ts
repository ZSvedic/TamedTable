#!/usr/bin/env bun
// #BenchSweep
// CLI for the model & batch-size benchmark. Subcommands:
//   sample [count]                 draw a subset of the fixture → ground-truth/music-sample.csv
//   label  [model]                 auto-label the subset with a strong model → music-labels.jsonl
//   sweep  [--models=…] [--batches=…] [--out=name] [--retries=N] [--chat=id]
//          [--tier=free|paid]
//                                  run the (model × batch) grid, score vs labels,
//                                  append the rows to results/sweeps.csv under the
//                                  run name --out gives them.
//                                  --retries re-tries a config that throws (free
//                                  models sometimes flub the patch-turn tool call).
//                                  --chat overrides the chat model (must
//                                  share the cell model's provider); default is the
//                                  provider's mid-tier model. --tier records
//                                  whether the run was billed; costs are always
//                                  priced at the paid rates either way.
//   chart  [--batch=N]             render the SVGs and explorer.html from the whole
//                                  table → charts/
//   report [run]                   print the table, all runs or just one
//
// sample/chart/report run offline. label/sweep make live calls and need the
// matching provider key (ANTHROPIC_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY /
// CEREBRAS_API_KEY / OPENROUTER_API_KEY: the last two are free tiers).
// This is the Phase-2 entry point; Phase 1 ships it ready to run.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHeadlessRunner } from '@tamedtable/headless';
import { providerFor, type EngineProvider } from '@tamedtable/model-config';
import { runSweep, grid } from './sweep.ts';
import { scoreAccuracy, canonical, type Label } from './score.ts';
import { tradeoffChart, batchSweepChart, fileSlug } from './charts.ts';
import { toCsv, parseCsv, mergeRuns, hasFreeTier, type ResultRow } from './results.ts';
import { explorerPage } from './explorer.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BENCH = join(ROOT, 'benchmarks');
const FIXTURE = join(ROOT, 'spec', 'test-cases', 'performance-liked-videos.csv');
const GT_DIR = join(BENCH, 'ground-truth');
const SAMPLE_CSV = join(GT_DIR, 'music-sample.csv');
const LABELS_FILE = join(GT_DIR, 'music-labels.jsonl');
const RESULTS_DIR = join(BENCH, 'results');
// One table for every run this benchmark has ever made: see results.ts.
const RESULTS_CSV = join(RESULTS_DIR, 'sweeps.csv');
const CHARTS_DIR = join(BENCH, 'charts');

// The group-C task under test. The target column is a boolean the model fills
// per row; videoId is the stable id we score by.
const REQUEST = 'Add a boolean column Music that is true for music videos';
const ID_COL = 'videoId';
const TARGET = 'Music';

const DEFAULT_MODELS = ['claude-sonnet-4-5', 'claude-haiku-4-5', 'gemini-3.1-flash-lite', 'gpt-5.4-mini'];
const DEFAULT_BATCHES = [1, 5, 10, 20, 40, 80];
const DEFAULT_LABELER = 'claude-fable-5';

function keyFor(provider: EngineProvider): string | undefined {
  if (provider === 'gemini')     return process.env.GEMINI_API_KEY;
  if (provider === 'openai')     return process.env.OPENAI_API_KEY;
  if (provider === 'groq')       return process.env.GROQ_API_KEY;
  if (provider === 'cerebras')   return process.env.CEREBRAS_API_KEY;
  if (provider === 'openrouter') return process.env.OPENROUTER_API_KEY;
  return process.env.ANTHROPIC_API_KEY;
}

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) flags[m[1]!] = m[2]!;
    else positional.push(a);
  }
  return { positional, flags };
}

// ── sample ───────────────────────────────────────────────────────────────────
// Take every Nth data row (deterministic, no key) so the subset is a spread of
// the whole list, not the first N rows. Preserves the exact CSV lines.
function cmdSample(count: number): void {
  const lines = readFileSync(FIXTURE, 'utf8').split('\n');
  const header = lines[0]!;
  const data = lines.slice(1).filter((l) => l.trim().length > 0);
  const step = Math.max(1, Math.floor(data.length / count));
  const picked: string[] = [];
  for (let i = 0; i < data.length && picked.length < count; i += step) picked.push(data[i]!);
  mkdirSync(GT_DIR, { recursive: true });
  writeFileSync(SAMPLE_CSV, [header, ...picked].join('\n') + '\n');
  console.log(`Wrote ${picked.length} rows → ${rel(SAMPLE_CSV)}`);
}

// ── label ────────────────────────────────────────────────────────────────────
// Auto-label the subset: run the same NL request with a strong model at batch
// size 1 (highest fidelity), then dump its Music verdicts as ground truth.
// Spot-check the output by hand before trusting it.
async function cmdLabel(labeler: string): Promise<void> {
  if (!existsSync(SAMPLE_CSV)) throw new Error(`No sample yet: run "bench sample" first (${rel(SAMPLE_CSV)} missing).`);
  const provider = providerFor(labeler);
  const apiKey = keyFor(provider);
  if (!apiKey) throw new Error(`${provider} key not set: export the matching *_API_KEY to label with ${labeler}.`);
  const runner = createHeadlessRunner({ model: labeler, cellModel: labeler, batchSize: 1, apiKey });
  await runner.loadInput(SAMPLE_CSV);
  await runner.request(REQUEST);
  const labels = runner.currentRows()
    .map((r) => ({ videoId: String(r[ID_COL]), title: r.title, music: canonical(r[TARGET]) }))
    .filter((l) => l.videoId && l.videoId !== 'undefined');
  mkdirSync(GT_DIR, { recursive: true });
  writeFileSync(LABELS_FILE, labels.map((l) => JSON.stringify(l)).join('\n') + '\n');
  console.log(`Labelled ${labels.length} rows with ${labeler} → ${rel(LABELS_FILE)} (spot-check before trusting).`);
}

function readLabels(): Label[] {
  if (!existsSync(LABELS_FILE)) throw new Error(`No labels yet: run "bench label" first (${rel(LABELS_FILE)} missing).`);
  return readFileSync(LABELS_FILE, 'utf8').split('\n').filter((l) => l.trim())
    .map((l) => JSON.parse(l) as { videoId: string; music: unknown })
    .map((o) => ({ id: o.videoId, expected: o.music }));
}

// ── sweep ────────────────────────────────────────────────────────────────────
async function cmdSweep(models: string[], batches: number[], out: string, retries: number, tier: 'free' | 'paid', chat?: string): Promise<void> {
  if (!existsSync(SAMPLE_CSV)) throw new Error(`No sample: run "bench sample" then "bench label" first.`);
  const labels = readLabels();
  // The patch turn shares the cell model's provider (one runner, one provider),
  // so an explicit --chat must sit on that provider.
  if (chat) {
    for (const m of models) {
      if (providerFor(chat) !== providerFor(m)) {
        throw new Error(`--chat ${chat} is provider ${providerFor(chat)}, but cell model ${m} is ${providerFor(m)}: the patch turn shares the cell model's provider.`);
      }
    }
  }
  // Fail fast if a key is missing for any provider in the model set.
  for (const provider of new Set(models.map(providerFor))) {
    if (!keyFor(provider)) throw new Error(`${provider} key not set: needed for ${models.filter((m) => providerFor(m) === provider).join(', ')}.`);
  }
  const configs = grid(models, batches).map((c) => (chat ? { ...c, chatModel: chat } : c));
  console.log(`Running ${configs.length} configs (${models.length} models × ${batches.length} batch sizes)${retries ? `, up to ${retries} retries each` : ''}…`);
  // Do NOT pin a single apiKey: a sweep can span providers. Leaving apiKey
  // undefined lets each runner resolve its own provider's key from env
  // (GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY), which bun loads from
  // .env. The pre-flight check above guarantees each is present.
  mkdirSync(RESULTS_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const before = readTable();
  // Report and save per config rather than only at the end: a free-tier grid
  // spends most of its wall clock waiting out a tokens-per-minute cap, and a
  // config that throws after an hour must not take the finished ones with it.
  const done: ResultRow[] = [];
  const save = () => writeFileSync(RESULTS_CSV, toCsv(mergeRuns(before, done)));
  const results = await runSweep(configs, {
    inputCsv: SAMPLE_CSV, request: REQUEST, idColumn: ID_COL, targetColumn: TARGET, labels, retries,
    onResult: (r, n, total) => {
      done.push({ ...r, date, run: out, tier, freeTier: hasFreeTier(r.provider) });
      save();
      console.log(`  [${n}/${total}] ${r.cellModel} @ batch ${r.batchSize}: acc ${(r.accuracy * 100).toFixed(0)}%, ${(r.timeMs / 1000).toFixed(1)}s, $${r.costUsd.toFixed(4)}, ${r.calls} calls`);
    },
  });
  save();
  console.log(`Wrote ${results.length} results as run "${out}" → ${rel(RESULTS_CSV)}`);
  printReport(done);
}

// ── chart ────────────────────────────────────────────────────────────────────
// Three tradeoff views, because one chart cannot answer both questions a reader
// has. A paying user trades accuracy against cost; a free user's cost is zero,
// so the only axis left is time. Splitting them also stops the free models,
// which cluster far from the paid ones on cost: from squashing the paid scale.
function cmdChart(batch: number | undefined, subtitle: string | undefined): void {
  const all = readTable();
  mkdirSync(CHARTS_DIR, { recursive: true });
  const refBatch = batch ?? mode(all.map((r) => r.batchSize));
  const span = (rows: readonly ResultRow[]) => {
    const dates = [...new Set(rows.map((r) => r.date))].sort();
    return dates.length > 1 ? `runs ${dates[0]} to ${dates.at(-1)}` : `run ${dates[0] ?? 'n/a'}`;
  };

  const views = [
    { file: 'tradeoff-paid-cost.svg', axis: 'cost' as const, rows: all.filter((r) => r.tier === 'paid'), what: 'Paid models: accuracy vs cost' },
    { file: 'tradeoff-paid-time.svg', axis: 'time' as const, rows: all.filter((r) => r.tier === 'paid'), what: 'Paid models: accuracy vs time' },
    { file: 'tradeoff-free-time.svg', axis: 'time' as const, rows: all.filter((r) => r.freeTier), what: 'Free-tier models: accuracy vs time' },
  ];
  for (const v of views) {
    const rows = v.rows.filter((r) => r.batchSize === refBatch);
    if (!rows.length) continue;
    const file = join(CHARTS_DIR, v.file);
    writeFileSync(file, tradeoffChart(rows, {
      axis: v.axis,
      title: `${v.what} (batch ${refBatch})`,
      subtitle: subtitle ?? `${span(rows)} · dashed line is the Pareto frontier`,
    }));
    console.log(`Wrote ${rel(file)}`);
  }

  for (const cellModel of [...new Set(all.map((r) => r.cellModel))]) {
    const rows = all.filter((r) => r.cellModel === cellModel);
    const file = join(CHARTS_DIR, `batch-${fileSlug(cellModel)}.svg`);
    writeFileSync(file, batchSweepChart(all, cellModel, { subtitle: subtitle ?? span(rows) }));
    console.log(`Wrote ${rel(file)}`);
  }

  const page = join(CHARTS_DIR, 'explorer.html');
  writeFileSync(page, explorerPage(toCsv(all), new Date().toISOString().slice(0, 10)));
  console.log(`Wrote ${rel(page)} (open it directly: filters, sorting, every run)`);
}

// ── report ───────────────────────────────────────────────────────────────────
function cmdReport(run: string | undefined): void {
  const all = readTable();
  printReport(run ? all.filter((r) => r.run === run) : all);
}

function readTable(): ResultRow[] {
  if (!existsSync(RESULTS_CSV)) return [];
  return parseCsv(readFileSync(RESULTS_CSV, 'utf8'));
}

function printReport(results: readonly ResultRow[]): void {
  const headers = ['Date', 'Run', 'Cell model', 'Batch', 'Acc', 'Cost', 'Time', 'Calls', 'Scored'];
  const rows = results.map((r) => [
    r.date, r.run,
    r.cellModel, String(r.batchSize), `${(r.accuracy * 100).toFixed(0)}%`,
    `$${r.costUsd.toFixed(4)}`, `${(r.timeMs / 1000).toFixed(1)}s`, String(r.calls), `${r.scored}${r.missing ? ` (-${r.missing})` : ''}`,
  ]);
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join('  ');
  console.log('\n' + line(headers));
  console.log(widths.map((w) => '─'.repeat(w)).join('  '));
  for (const row of rows) console.log(line(row));
}

// ── helpers ──────────────────────────────────────────────────────────────────
const rel = (p: string) => p.replace(ROOT + '/', '');
function mode(xs: number[]): number {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 20;
}
const list = (s: string | undefined, fb: string[]) => (s ? s.split(',').map((x) => x.trim()) : fb);
const nums = (s: string | undefined, fb: number[]) => (s ? s.split(',').map((x) => Number(x.trim())) : fb);

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseFlags(rest);
  switch (cmd) {
    case 'sample': return cmdSample(Number(positional[0] ?? 150));
    case 'label':  return cmdLabel(positional[0] ?? DEFAULT_LABELER);
    case 'sweep':  return cmdSweep(list(flags.models, DEFAULT_MODELS), nums(flags.batches, DEFAULT_BATCHES), flags.out ?? 'sweep', flags.retries ? Number(flags.retries) : 0, flags.tier === 'free' ? 'free' : 'paid', flags.chat);
    case 'chart':  return cmdChart(flags.batch ? Number(flags.batch) : undefined, flags.subtitle);
    case 'report': return cmdReport(positional[0]);
    default:
      console.log('Usage: bench <sample|label|sweep|chart|report> [args]\n  See src/packages/bench/cli.ts header for options.');
      process.exitCode = cmd ? 1 : 0;
  }
}

main().catch((e) => { console.error(String(e instanceof Error ? e.message : e)); process.exitCode = 1; });
