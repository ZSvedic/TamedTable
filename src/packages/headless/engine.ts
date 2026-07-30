// Pure transformations — the deterministic half of the headless engine. Every
// function here maps rows → rows (plus the small helpers they share); nothing
// in this file talks to an LLM or DuckDB. The runner loop lives in index.ts,
// the DuckDB session in sql.ts.

import { isAbsolute, join } from 'node:path';
import {
  cellAt,
  loadCsv,
  loadJsonl,
  setCell,
  type Expr,
  type Row,
  type TablePlan,
  type Transformation,
} from '@tamedtable/core';

// #CancelOp
export const CANCELLED = 'Runner: cancelled';

export function abortIf(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new Error(CANCELLED);
}

export function isCancelled(e: unknown): boolean {
  return (e as Error)?.message === CANCELLED;
}

export function compileJs(body: string): (row: Row, i: number, rows: Row[]) => unknown {
  const src = body.trim();
  try {
    return new Function('row', 'i', 'rows', `return (${src});`) as (row: Row, i: number, rows: Row[]) => unknown;
  } catch (e) {
    throw new Error(`JS expression failed to compile: ${(e as Error).message} — body: ${src}`);
  }
}

/** After replay, align spec.columns with the actual row keys: keep every
 *  column in spec.columns that still appears in the rows (preserving the
 *  LLM-chosen order and any label/format), and append new keys the
 *  transformations introduced in first-seen order. Keys starting with `_`
 *  are internal unless the spec declares them — a validate's named `into`
 *  pair (no underscore) displays like any data column, while a yes/no helper
 *  column a mutate computes only for a later validate, or the legacy
 *  `_valid`/`_validation` pair of an old flow that doesn't declare it, stays
 *  on the rows but off the table (spec/behavior.md § Core / runner). */
export function syncColumnsToRows(spec: TablePlan, rows: Row[]): TablePlan {
  if (rows.length === 0) return spec;
  const actualKeys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) if (!seen.has(k)) { seen.add(k); actualKeys.push(k); }
  }
  const byId = new Map(spec.columns.map((c) => [c.id, c]));
  const next: TablePlan['columns'] = [];
  // First, keep existing columns in their declared order if they still exist.
  for (const col of spec.columns) {
    if (seen.has(col.id)) next.push(col);
  }
  // Then, append any new keys that aren't already in spec.columns —
  // underscore-prefixed keys only when the spec declared them.
  const declared = new Set(next.map((c) => c.id));
  for (const k of actualKeys) {
    if (declared.has(k)) continue;
    if (k.startsWith('_') && !byId.has(k)) continue;
    next.push(byId.get(k) ?? { id: k });
  }
  return { ...spec, columns: next };
}

// #SortRows
/** The sort comparator, as a **total order** (spec/behavior.md § Sorting by a
 *  SQL or AI key). Values fall into three classes — numbers (a number or a
 *  numeric string), text (anything else non-empty), and empty (null/undefined/
 *  empty string) — and the classes rank in that order, so a mixed column puts
 *  every number, ordered by magnitude, ahead of every word, with empty cells
 *  last. Within a class, numbers compare by magnitude and text as text.
 *
 *  A total order is the point: comparing only "when both sides coerce" answered
 *  "equal" for every number-vs-word pair, which makes the comparator
 *  non-transitive and lets `Array.sort` emit an arbitrary order — numbers
 *  wrongly ordered among *themselves* included. */
export function compareSortKeys(a: unknown, b: unknown): number {
  const rank = (v: unknown): 0 | 1 | 2 =>
    v === null || v === undefined || v === '' ? 2 : asSortNumber(v) !== null ? 0 : 1;
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (ra === 2) return 0;
  if (ra === 0) {
    const an = asSortNumber(a)!;
    const bn = asSortNumber(b)!;
    return an < bn ? -1 : an > bn ? 1 : 0;
  }
  const as = String(a);
  const bs = String(b);
  return as < bs ? -1 : as > bs ? 1 : 0;
}

/** A number or a numeric string as a finite number; otherwise null. */
function asSortNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Pick a name not already taken: `<name>`, else `<name>_2`, `_3`, … — the
 *  same collision rule the join's right columns follow, applied wherever a
 *  transformation derives an output column name from data or from a default
 *  (spec/behavior.md § group / pivot / unpivot). The key columns that identify
 *  a row (`group.by`, `pivot.index`, `unpivot.id`) are claimed first, so a
 *  derived name never overwrites them. */
export function freeColumnName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  let n = 2;
  while (taken.has(`${name}_${n}`)) n++;
  return `${name}_${n}`;
}

/** Output column names of a `group`: the by-key names first, then one name per
 *  `agg` entry, collision-renamed so an aggregate named like a by-column can't
 *  destroy the group key. Shared by the JS-only path (`applyGroupJs`), the
 *  async path in index.ts, and the column-availability walks. */
export function groupOutputNames(
  by: Array<string | Expr>,
  agg: Record<string, unknown>,
): { byNames: string[]; aggNames: Array<[outCol: string, name: string]> } {
  const byNames = by.map((b, i) => (typeof b === 'string' ? b : `key_${i + 1}`));
  const taken = new Set(byNames);
  const aggNames: Array<[string, string]> = [];
  for (const outCol of Object.keys(agg)) {
    const name = freeColumnName(outCol, taken);
    taken.add(name);
    aggNames.push([outCol, name]);
  }
  return { byNames, aggNames };
}

/** Output column names of an `unpivot`: the id columns keep their names, and
 *  `names_to`/`values_to` (explicit or defaulted to `name`/`value`) are
 *  collision-renamed so the defaults can't overwrite an id column. */
export function unpivotOutputNames(
  t: Extract<Transformation, { kind: 'unpivot' }>,
): { namesTo: string; valuesTo: string } {
  const taken = new Set(t.id);
  const namesTo = freeColumnName(t.names_to ?? 'name', taken);
  taken.add(namesTo);
  const valuesTo = freeColumnName(t.values_to ?? 'value', taken);
  return { namesTo, valuesTo };
}

// ── Pure transformations ────────────────────────────────────────────────────

// #FilterRows #Dedupe
export function applyFilter(rows: Row[], t: Extract<Transformation, { kind: 'filter' }>): Row[] {
  if (!('js' in t.pred)) throw new Error('filter: LLM predicates not supported');
  const fn = compileJs(t.pred.js);
  return rows.filter((row, i) => Boolean(fn(row, i, rows)));
}

// #ColSelect
export function applySelect(rows: Row[], t: Extract<Transformation, { kind: 'select' }>): Row[] {
  return rows.map((row) => {
    const out: Row = {};
    // `cellAt` reads only own properties, so selecting a column no row has
    // (e.g. "constructor", "toString") yields null, not an inherited member.
    for (const col of t.columns) setCell(out, col, cellAt(row, col));
    return out;
  });
}

// #DataNorm
export function applyMutateJs(rows: Row[], t: Extract<Transformation, { kind: 'mutate' }> & { value: { js: string } }): Row[] {
  const cols = Array.isArray(t.columns) ? t.columns : [t.columns];
  const fn = compileJs(t.value.js);
  return rows.map((row, i) => {
    const result = fn(row, i, rows);
    const out: Row = { ...row };
    // `setCell` so a mutate targeting a column literally named "__proto__"
    // writes an own property instead of hitting the prototype setter.
    if (cols.length === 1) setCell(out, cols[0]!, result);
    // Multi-column: an array result fills the targets POSITIONALLY (the idiom
    // spec/behavior.md § split calls out — the same padding/concat rules a
    // split uses); an object result is read by column name.
    else if (Array.isArray(result)) {
      const parts = padParts(result, cols);
      cols.forEach((c, idx) => setCell(out, c, parts[idx] ?? null));
    } else if (result && typeof result === 'object')
      for (const c of cols) setCell(out, c, cellAt(result as Row, c));
    return out;
  });
}

// ── Aggregate, reshape, lookup & validation transformations ─────────────────

// #Validate
/** The flag + note column pair a validate writes: `<into>`/`<into>_note`, or
 *  the legacy `_valid`/`_validation` when `into` is absent (old flows). */
export function validateColumns(t: Extract<Transformation, { kind: 'validate' }>): { flag: string; note: string } {
  return t.into ? { flag: t.into, note: `${t.into}_note` } : { flag: '_valid', note: '_validation' };
}

/** Render the failure rate and the threshold as percentages that still show a
 *  TRUE inequality: rounding both to whole percent turns a 20.4%-over-20% abort
 *  into the false statement "20% > 20%", and that string is what the recovery
 *  model reads. Uses the fewest decimals that keep the two sides apart,
 *  trailing zeros trimmed. */
function formatRateOverThreshold(rate: number, threshold: number): [string, string] {
  const trim = (s: string) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);
  for (const digits of [0, 1, 2, 3, 4]) {
    const a = (rate * 100).toFixed(digits);
    const b = (threshold * 100).toFixed(digits);
    if (Number(a) > Number(b)) return [trim(a), trim(b)];
  }
  return [String(rate * 100), String(threshold * 100)];
}

export function applyValidateJs(rows: Row[], t: Extract<Transformation, { kind: 'validate' }>): Row[] {
  if (!('js' in t.pred)) throw new Error('validate: LLM predicates not supported');
  const { flag, note } = validateColumns(t);
  const predFn = compileJs(t.pred.js);
  const msgFn = t.message && 'js' in t.message ? compileJs(t.message.js) : undefined;
  const out: Row[] = rows.map((row, i) => {
    const valid = Boolean(predFn(row, i, rows));
    const message = valid ? null : msgFn ? msgFn(row, i, rows) : null;
    return { ...row, [flag]: valid, [note]: message };
  });
  if (t.threshold !== undefined && rows.length > 0) {
    const failures = out.filter((r) => r[flag] === false).length;
    const rate = failures / rows.length;
    if (rate > t.threshold) {
      const [got, limit] = formatRateOverThreshold(rate, t.threshold);
      throw new Error(`validation failed: ${got}% > ${limit}%`);
    }
  }
  return out;
}

function evalKey(rowOrExpr: string | Expr, row: Row, i: number, rows: Row[]): unknown {
  if (typeof rowOrExpr === 'string') return row[rowOrExpr];
  if ('js' in rowOrExpr) return compileJs(rowOrExpr.js)(row, i, rows);
  throw new Error(`group/sort: only string or {js} keys supported (got ${JSON.stringify(rowOrExpr)})`);
}

export type GroupBuckets = { order: string[]; groups: Map<string, { keyTuple: unknown[]; slice: Row[] }> };

export function buildGroups(rows: Row[], by: Array<string | Expr>): GroupBuckets {
  const order: string[] = [];
  const groups = new Map<string, { keyTuple: unknown[]; slice: Row[] }>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const tuple = by.map((b) => evalKey(b, row, i, rows));
    const key = JSON.stringify(tuple);
    let entry = groups.get(key);
    if (!entry) { entry = { keyTuple: tuple, slice: [] }; groups.set(key, entry); order.push(key); }
    entry.slice.push(row);
  }
  return { order, groups };
}

/** The `key` an aggregate expression sees: the by-value itself for a
 *  single-key group, the tuple for a multi-key group, `null` for an empty
 *  `by` (spec/code-contract.md § group). */
export function aggKey(keyTuple: unknown[]): unknown {
  if (keyTuple.length === 0) return null;
  return keyTuple.length === 1 ? keyTuple[0] : keyTuple;
}

/** One group as an aggregate expression sees it in `allGroups`. */
export type AggGroup = { key: unknown; rows: Row[] };

/** Compile a JS aggregate to the contracted `(rows, key, allGroups)` signature
 *  (spec/code-contract.md § group): the group's slice, its by-value, and every
 *  group as `{ key, rows }` in output order — so an aggregate can compute a
 *  share of the whole table, not only of its own slice. */
export function compileAgg(js: string): (rows: Row[], key: unknown, allGroups: AggGroup[]) => unknown {
  return new Function('rows', 'key', 'allGroups', `return (${js.trim()});`) as (
    rows: Row[],
    key: unknown,
    allGroups: AggGroup[],
  ) => unknown;
}

// #Aggregate
export function applyGroupJs(rows: Row[], t: Extract<Transformation, { kind: 'group' }>): Row[] {
  // Build groups in first-seen order so the output preserves input order.
  const { order, groups } = buildGroups(rows, t.by);
  const { byNames, aggNames } = groupOutputNames(t.by, t.agg);
  const allGroups: AggGroup[] = order.map((k) => {
    const g = groups.get(k)!;
    return { key: aggKey(g.keyTuple), rows: g.slice };
  });
  return order.map((key) => {
    const { keyTuple, slice } = groups.get(key)!;
    const out: Row = {};
    byNames.forEach((name, i) => { setCell(out, name, keyTuple[i] ?? null); });
    for (const [outCol, name] of aggNames) {
      const expr = t.agg[outCol]!;
      if ('js' in expr) {
        setCell(out, name, compileAgg(expr.js)(slice, aggKey(keyTuple), allGroups));
      } else if ('sql' in expr) {
        // Unreachable: a {sql} aggregate routes through applyGroup's async path,
        // not this JS-only path. Kept as a defensive guard.
        throw new Error('group: {sql} aggregate must run on the async path');
      }
    }
    return out;
  });
}

/** Fit a parts array to the target column count: too few pads the tail with
 *  null; too many concatenates the extras onto the last column. */
export function padParts(parts: unknown[], into: string[]): unknown[] {
  if (parts.length < into.length) {
    return into.map((_, idx) => (idx < parts.length ? parts[idx]! : null));
  }
  if (parts.length > into.length) {
    const head = parts.slice(0, into.length - 1);
    const tail = parts.slice(into.length - 1).map(String).join(' ');
    return [...head, tail];
  }
  return parts;
}

/** @internal — exported for unit tests. Parse a cell model's split reply into
 *  parts: prefers a JSON array (with any markdown fence stripped — models
 *  sometimes wrap the array in ```json despite the "reply with ONLY"
 *  instruction), falls back to comma- then whitespace-separated tokens. */
export function parseLlmParts(text: string): unknown[] {
  let trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```\w*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON — fall through to delimiter splitting */ }
  return trimmed.includes(',') ? trimmed.split(',').map((s) => s.trim()) : trimmed.split(/\s+/);
}

// #ColSplit
export function applySplit(rows: Row[], t: Extract<Transformation, { kind: 'split' }>): Row[] {
  // Resolve `on` once: slash-delimited strings like "/, \s*/i" parse as regex;
  // plain strings stay literal; RegExp instances pass through; {js} Expr that
  // returns RegExp or string[] runs per row.
  const slashRe = /^\/(.+)\/([gimsuy]*)$/;
  let kind: 'lit' | 'regex' | 'js-array';
  let regex: RegExp | undefined;
  let lit: string | undefined;
  let jsFn: ((row: Row, i: number, rows: Row[]) => unknown) | undefined;
  if (t.on instanceof RegExp) { kind = 'regex'; regex = t.on; }
  else if (typeof t.on === 'string') {
    const m = t.on.match(slashRe);
    if (m) { kind = 'regex'; regex = new RegExp(m[1]!, m[2]); }
    else { kind = 'lit'; lit = t.on; }
  } else if ('js' in t.on) { kind = 'js-array'; jsFn = compileJs(t.on.js); }
  else throw new Error('split: LLM separators not yet implemented');

  const splitOne = (cell: unknown, row: Row, i: number, allRows: Row[]): unknown[] => {
    if (cell === null || cell === undefined || cell === '') return t.into.map(() => null);
    const s = String(cell);
    let parts: unknown[];
    if (kind === 'regex') parts = s.split(regex!);
    else if (kind === 'lit') parts = s.split(lit!);
    else {
      const result = jsFn!(row, i, allRows);
      if (!Array.isArray(result)) throw new Error('split: JS expression must return an array of parts');
      parts = result;
    }
    return padParts(parts, t.into);
  };
  return rows.map((row, i) => {
    const out: Row = { ...row };
    const parts = splitOne(row[t.from], row, i, rows);
    t.into.forEach((col, idx) => { out[col] = parts[idx] ?? null; });
    if (t.drop) delete out[t.from];
    return out;
  });
}

function aggregateValues(values: unknown[], agg: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'first'): unknown {
  if (agg === 'count') return values.length;
  if (agg === 'first') return values[0] ?? null;
  const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  if (agg === 'sum') return nums.reduce((a, b) => a + b, 0);
  if (agg === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (agg === 'min') return Math.min(...nums);
  if (agg === 'max') return Math.max(...nums);
  return null;
}

// #PivotData
export function applyPivot(rows: Row[], t: Extract<Transformation, { kind: 'pivot' }>): Row[] {
  const agg = t.agg ?? 'first';
  // Discover distinct on-values in first-seen order.
  const onValues: string[] = [];
  const seenOn = new Set<string>();
  for (const row of rows) {
    const v = String(row[t.on] ?? '');
    if (!seenOn.has(v)) { seenOn.add(v); onValues.push(v); }
  }
  // Group rows by index tuple in first-seen order.
  const indexOrder: string[] = [];
  const buckets = new Map<string, { tuple: unknown[]; cells: Map<string, unknown[]> }>();
  for (const row of rows) {
    const tuple = t.index.map((c) => row[c]);
    const key = JSON.stringify(tuple);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { tuple, cells: new Map(onValues.map((v) => [v, [] as unknown[]])) };
      buckets.set(key, bucket);
      indexOrder.push(key);
    }
    const onVal = String(row[t.on] ?? '');
    bucket.cells.get(onVal)?.push(row[t.values]);
  }
  // The new column names come from the DATA, so one can equal an index column
  // name — rename it (`region` → `region_2`) instead of overwriting the key
  // that identifies the row (spec/behavior.md § pivot).
  const taken = new Set(t.index);
  const outName = new Map<string, string>();
  for (const v of onValues) {
    const name = freeColumnName(v, taken);
    taken.add(name);
    outName.set(v, name);
  }
  return indexOrder.map((key) => {
    const { tuple, cells } = buckets.get(key)!;
    const out: Row = {};
    // `setCell` for both index and pivoted-value columns: an on-value that is
    // literally "__proto__" (with an object cell) must land as an own property,
    // not become the output row's prototype.
    t.index.forEach((c, i) => { setCell(out, c, tuple[i] ?? null); });
    for (const onVal of onValues) {
      const vals = cells.get(onVal) ?? [];
      setCell(out, outName.get(onVal)!, vals.length === 0 ? null : aggregateValues(vals, agg));
    }
    return out;
  });
}

export function applyUnpivot(rows: Row[], t: Extract<Transformation, { kind: 'unpivot' }>): Row[] {
  // The `name`/`value` defaults are a name collision waiting to happen on a
  // table with a column called `name` — rename rather than overwrite the id.
  const { namesTo, valuesTo } = unpivotOutputNames(t);
  const out: Row[] = [];
  for (const row of rows) {
    for (const measure of t.measures) {
      const r: Row = {};
      for (const idCol of t.id) setCell(r, idCol, cellAt(row, idCol));
      setCell(r, namesTo, measure);
      setCell(r, valuesTo, cellAt(row, measure) ?? null);
      out.push(r);
    }
  }
  return out;
}

// #LookupJoin
export async function applyJoin(
  rows: Row[],
  t: Extract<Transformation, { kind: 'join' }>,
  baseDir: string,
  lookups?: Map<string, Row[]>,
  cache?: Map<string, Row[]>,
): Promise<Row[]> {
  if (!('js' in t.on)) throw new Error('join: LLM predicates not yet implemented');
  // A null `with` only reaches here outside the web UI (which resolves it via
  // the lookup dialog before the run) — there is no file to read.
  if (t.with === null) throw new Error('join: no lookup file named — say which file to join with');
  const fn = new Function('leftRow', 'rightRow', `return (${t.on.js.trim()});`) as (l: Row, r: Row) => unknown;
  // A staged lookup (browser join) wins, then the runner's right-table cache —
  // a join is read from disk once and held, so an :undo/:redo that replays the
  // step never touches the file again (spec/behavior.md § join). Only a miss
  // reads the path.
  let right = lookups?.get(t.with) ?? cache?.get(t.with);
  if (!right) {
    const rightPath = isAbsolute(t.with) ? t.with : join(baseDir, t.with);
    const ext = t.with.slice(t.with.lastIndexOf('.')).toLowerCase();
    if (ext === '.csv') right = (await loadCsv(rightPath)).rows;
    else if (ext === '.jsonl') right = (await loadJsonl(rightPath)).rows;
    else throw new Error(`unknown file type: ${t.with}`);
    cache?.set(t.with, right);
  }
  // Compute right-column names with collision-renaming (Country → Country_2 …).
  // Both column lists are the UNION of every row's keys: a sparse column lives
  // on some later row, and reading row 0 alone would miss it — then the right
  // table would silently overwrite it. The rename target is probed against the
  // right table's own columns too, so a real `code_2` on the right can't be
  // clobbered by a renamed `code`.
  const columnUnion = (list: Row[]): string[] => {
    const seen = new Set<string>();
    const cols: string[] = [];
    for (const row of list) for (const k of Object.keys(row)) if (!seen.has(k)) { seen.add(k); cols.push(k); }
    return cols;
  };
  const leftCols = new Set(columnUnion(rows));
  const rightCols = columnUnion(right);
  const rightColSet = new Set(rightCols);
  const rightColMap: Record<string, string> = {};
  const claimed = new Set<string>();
  for (const col of rightCols) {
    if (!leftCols.has(col)) { rightColMap[col] = col; continue; }
    const taken = (n: string) => leftCols.has(n) || rightColSet.has(n) || claimed.has(n);
    let n = 2;
    while (taken(`${col}_${n}`)) n++;
    claimed.add(`${col}_${n}`);
    rightColMap[col] = `${col}_${n}`;
  }
  const how = t.how ?? 'left';
  const out: Row[] = [];
  for (const lrow of rows) {
    // SQL multiplicity, not a first-match lookup: N right matches → N output rows.
    const matches = right.filter((rrow) => Boolean(fn(lrow, rrow)));
    for (const match of matches) {
      const merged: Row = { ...lrow };
      for (const [srcCol, dstCol] of Object.entries(rightColMap)) setCell(merged, dstCol, cellAt(match, srcCol));
      out.push(merged);
    }
    if (matches.length === 0 && how === 'left') {
      const merged: Row = { ...lrow };
      for (const dstCol of Object.values(rightColMap)) setCell(merged, dstCol, null);
      out.push(merged);
    }
    // inner: drop unmatched
  }
  return out;
}

// #LLMCells
export function renderPrompt(template: string, row: Row, targetColumns?: string[]): string {
  return template.replace(/\{([^{}]+)\}/g, (_, col) => {
    if (col === '*') {
      const exclude = new Set(targetColumns ?? []);
      const obj: Row = {};
      for (const k of Object.keys(row)) if (!exclude.has(k)) obj[k] = row[k];
      return JSON.stringify(obj);
    }
    const v = row[col];
    return v === null || v === undefined ? '' : String(v);
  });
}

export function validateTemplate(template: string, rows: Row[]): void {
  if (rows.length === 0) return;
  const sample = rows[0]!;
  for (const m of template.matchAll(/\{([^{}]+)\}/g)) {
    const col = m[1]!;
    if (col === '*') continue;
    if (!(col in sample)) {
      throw new Error(`LLM template references column "${col}" which is not present in the data. Available columns: ${Object.keys(sample).join(', ')}.`);
    }
  }
}
