// #BenchSweep
// The results table: one CSV holding every config this benchmark has ever run,
// so a run is a set of rows rather than a file of its own. Sweeps append, and
// the charts, the report and the explorer page all read the same table.
//
// CSV rather than JSONL because the audience opens it in a spreadsheet, sorts
// by accuracy and filters by provider. Two columns exist only to make that
// filtering work: `tier` is what the run itself cost, and `freeTier` is whether
// a free user could reach that model at all. They differ: the Gemini rows were
// billed on a paid key, but every Gemini model here is also served free under a
// quota.
import type { SweepResult } from './sweep.ts';

/** One config's result, plus the provenance a table needs and a single
 *  `SweepResult` does not: when it ran, which run it belonged to, and whether
 *  it cost anything. */
export interface ResultRow extends SweepResult {
  /** ISO date (YYYY-MM-DD) the run was made. */
  date: string;
  /** The `--out` name of the sweep that produced it, e.g. `free-groq`. */
  run: string;
  /** What this run was billed at: `free` on a free tier or a $0 model, `paid`
   *  otherwise. Costs are always priced at the paid rates in `models.jsonl`,
   *  including for free-tier runs, so the columns stay comparable. */
  tier: 'free' | 'paid';
  /** Whether a user with no money can reach this model at all. */
  freeTier: boolean;
}

/** Column order, chosen for a spreadsheet: provenance and filters first, then
 *  the measurement, then the raw counters nobody sorts by. */
const COLUMNS = [
  'date', 'run', 'provider', 'tier', 'freeTier',
  'cellModel', 'primaryModel', 'batchSize',
  'accuracyPct', 'costUsd', 'timeSec',
  'rows', 'scored', 'missing', 'calls', 'inTokens', 'outTokens',
] as const;

const cell = (v: string | number): string =>
  /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);

function toCells(r: ResultRow): Record<(typeof COLUMNS)[number], string | number> {
  return {
    date: r.date,
    run: r.run,
    provider: r.provider,
    tier: r.tier,
    freeTier: r.freeTier ? 'yes' : 'no',
    cellModel: r.cellModel,
    primaryModel: r.primaryModel,
    batchSize: r.batchSize,
    accuracyPct: +(r.accuracy * 100).toFixed(1),
    costUsd: +r.costUsd.toFixed(6),
    timeSec: +(r.timeMs / 1000).toFixed(1),
    rows: r.rows,
    scored: r.scored,
    missing: r.missing,
    calls: r.calls,
    inTokens: r.inTokens,
    outTokens: r.outTokens,
  };
}

export function toCsv(rows: readonly ResultRow[]): string {
  const body = rows.map((r) => {
    const c = toCells(r);
    return COLUMNS.map((k) => cell(c[k])).join(',');
  });
  return [COLUMNS.join(','), ...body].join('\n') + '\n';
}

/** Split one CSV line, honouring `""`-escaped quoted fields. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }
  out.push(field);
  return out;
}

export function parseCsv(text: string): ResultRow[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = splitLine(lines[0]!);
  const idx = (name: string) => header.indexOf(name);
  const num = (cells: string[], name: string) => Number(cells[idx(name)] ?? 0);
  return lines.slice(1).map((line) => {
    const c = splitLine(line);
    return {
      date: c[idx('date')] ?? '',
      run: c[idx('run')] ?? '',
      provider: c[idx('provider')] ?? '',
      tier: (c[idx('tier')] === 'free' ? 'free' : 'paid') as 'free' | 'paid',
      freeTier: c[idx('freeTier')] === 'yes',
      cellModel: c[idx('cellModel')] ?? '',
      primaryModel: c[idx('primaryModel')] ?? '',
      batchSize: num(c, 'batchSize'),
      accuracy: num(c, 'accuracyPct') / 100,
      costUsd: num(c, 'costUsd'),
      timeMs: num(c, 'timeSec') * 1000,
      rows: num(c, 'rows'),
      scored: num(c, 'scored'),
      missing: num(c, 'missing'),
      calls: num(c, 'calls'),
      inTokens: num(c, 'inTokens'),
      outTokens: num(c, 'outTokens'),
    };
  });
}

/** Providers whose models a user with no money can reach. Google, Groq and
 *  OpenRouter all run a free tier over the same ids they bill for; Cerebras is
 *  free-only. Anthropic and OpenAI have no free tier at all. */
const FREE_TIER_PROVIDERS = new Set(['gemini', 'groq', 'openrouter', 'cerebras']);

export const hasFreeTier = (provider: string): boolean => FREE_TIER_PROVIDERS.has(provider);

/** Merge new rows into the table, replacing any earlier run of the same name so
 *  re-running a sweep corrects its rows instead of doubling them. */
export function mergeRuns(existing: readonly ResultRow[], incoming: readonly ResultRow[]): ResultRow[] {
  const replaced = new Set(incoming.map((r) => r.run));
  return [...existing.filter((r) => !replaced.has(r.run)), ...incoming];
}
