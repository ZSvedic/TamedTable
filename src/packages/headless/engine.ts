// Pure transformations — the deterministic half of the headless engine. Every
// function here maps rows → rows (plus the small helpers they share); nothing
// in this file talks to an LLM or DuckDB. The runner loop lives in index.ts,
// the DuckDB session in sql.ts.

import { isAbsolute, join } from 'node:path';
import {
  loadCsv,
  loadJsonl,
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
 *  are internal unless the spec declares them — `_valid`/`_validation`
 *  display because the validate few-shots add them to `columns`, while a
 *  yes/no helper column a mutate computes only for a later validate stays
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
    for (const col of t.columns) out[col] = col in row ? row[col] : null;
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
    if (cols.length === 1) out[cols[0]!] = result;
    else if (result && typeof result === 'object')
      for (const c of cols) out[c] = (result as Row)[c];
    return out;
  });
}

// ── Aggregate, reshape, lookup & validation transformations ─────────────────

// #Validate
export function applyValidateJs(rows: Row[], t: Extract<Transformation, { kind: 'validate' }>): Row[] {
  if (!('js' in t.pred)) throw new Error('validate: LLM predicates not supported');
  const predFn = compileJs(t.pred.js);
  const msgFn = t.message && 'js' in t.message ? compileJs(t.message.js) : undefined;
  const out: Row[] = rows.map((row, i) => {
    const valid = Boolean(predFn(row, i, rows));
    const message = valid ? null : msgFn ? msgFn(row, i, rows) : null;
    return { ...row, _valid: valid, _validation: message };
  });
  if (t.threshold !== undefined && rows.length > 0) {
    const failures = out.filter((r) => r._valid === false).length;
    const rate = failures / rows.length;
    if (rate > t.threshold) {
      throw new Error(
        `validation failed: ${(rate * 100).toFixed(0)}% > ${(t.threshold * 100).toFixed(0)}%`
      );
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

// #Aggregate
export function applyGroupJs(rows: Row[], t: Extract<Transformation, { kind: 'group' }>): Row[] {
  // Build groups in first-seen order so the output preserves input order.
  const { order, groups } = buildGroups(rows, t.by);
  const byNames = t.by.map((b, i) => typeof b === 'string' ? b : `key_${i + 1}`);
  return order.map((key) => {
    const { keyTuple, slice } = groups.get(key)!;
    const out: Row = {};
    byNames.forEach((name, i) => { out[name] = keyTuple[i] ?? null; });
    for (const [outCol, expr] of Object.entries(t.agg)) {
      if ('js' in expr) {
        const fn = new Function('rows', `return (${expr.js.trim()});`) as (slice: Row[]) => unknown;
        out[outCol] = fn(slice);
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
  return indexOrder.map((key) => {
    const { tuple, cells } = buckets.get(key)!;
    const out: Row = {};
    t.index.forEach((c, i) => { out[c] = tuple[i] ?? null; });
    for (const onVal of onValues) {
      const vals = cells.get(onVal) ?? [];
      out[onVal] = vals.length === 0 ? null : aggregateValues(vals, agg);
    }
    return out;
  });
}

export function applyUnpivot(rows: Row[], t: Extract<Transformation, { kind: 'unpivot' }>): Row[] {
  const namesTo = t.names_to ?? 'name';
  const valuesTo = t.values_to ?? 'value';
  const out: Row[] = [];
  for (const row of rows) {
    for (const measure of t.measures) {
      const r: Row = {};
      for (const idCol of t.id) r[idCol] = row[idCol];
      r[namesTo] = measure;
      r[valuesTo] = row[measure] ?? null;
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
): Promise<Row[]> {
  if (!('js' in t.on)) throw new Error('join: LLM predicates not yet implemented');
  const fn = new Function('leftRow', 'rightRow', `return (${t.on.js.trim()});`) as (l: Row, r: Row) => unknown;
  // A staged lookup (browser join) wins; otherwise read the right table by path.
  let right = lookups?.get(t.with);
  if (!right) {
    const rightPath = isAbsolute(t.with) ? t.with : join(baseDir, t.with);
    const ext = t.with.slice(t.with.lastIndexOf('.')).toLowerCase();
    if (ext === '.csv') right = (await loadCsv(rightPath)).rows;
    else if (ext === '.jsonl') right = (await loadJsonl(rightPath)).rows;
    else throw new Error(`unknown file type: ${t.with}`);
  }
  // Compute right-column names with collision-renaming (Country → Country_2 …).
  const leftCols = rows.length > 0 ? new Set(Object.keys(rows[0]!)) : new Set<string>();
  const rightColMap: Record<string, string> = {};
  if (right.length > 0) {
    for (const col of Object.keys(right[0]!)) {
      if (!leftCols.has(col)) { rightColMap[col] = col; continue; }
      let n = 2;
      while (leftCols.has(`${col}_${n}`)) n++;
      rightColMap[col] = `${col}_${n}`;
    }
  }
  const how = t.how ?? 'left';
  const out: Row[] = [];
  for (const lrow of rows) {
    // SQL multiplicity, not a first-match lookup: N right matches → N output rows.
    const matches = right.filter((rrow) => Boolean(fn(lrow, rrow)));
    for (const match of matches) {
      const merged: Row = { ...lrow };
      for (const [srcCol, dstCol] of Object.entries(rightColMap)) merged[dstCol] = match[srcCol];
      out.push(merged);
    }
    if (matches.length === 0 && how === 'left') {
      const merged: Row = { ...lrow };
      for (const dstCol of Object.values(rightColMap)) merged[dstCol] = null;
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
