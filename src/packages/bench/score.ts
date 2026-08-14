// #BenchSweep
// Accuracy scoring for group-C cell fills. The engine ran an NL request that
// added a target column; we compare the value it produced in each labelled row
// against the committed ground truth (benchmarks/ground-truth/*). This is the
// y-axis of the model- and batch-size tradeoff charts, without it, "best value"
// and "good enough for cells" have no measured basis, only cost.
import type { Row } from '@tamedtable/core';

/** Ground-truth entry: the value the target column *should* hold for one row,
 *  keyed by a stable id column (videoId for the liked-videos fixture). */
export interface Label {
  id: string;
  expected: unknown;
}

export interface Mismatch {
  id: string;
  expected: unknown;
  got: unknown;
}

export interface ScoreResult {
  /** Labelled rows that were found in the output and compared. */
  n: number;
  correct: number;
  /** correct / n, or 0 when n is 0. */
  accuracy: number;
  /** Labelled ids that never appeared in the output (engine dropped/renamed a row). */
  missing: string[];
  mismatches: Mismatch[];
}

/** Coerce a cell value or label to a canonical form so "true"/true/1/"yes" all
 *  compare equal. Booleans and boolean-ish strings collapse to true/false;
 *  everything else is lower-cased trimmed text. */
export function canonical(v: unknown): unknown {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === 'yes' || s === '1') return true;
    if (s === 'false' || s === 'no' || s === '0') return false;
    return s;
  }
  return v;
}

/**
 * Score the engine's output against ground-truth labels.
 * @param rows        the engine's output rows (currentRows())
 * @param idColumn    the stable id column present in the rows (e.g. "videoId")
 * @param targetColumn the column the NL request filled (e.g. "Music")
 * @param labels      ground-truth entries keyed by the id column value
 */
export function scoreAccuracy(
  rows: Row[],
  idColumn: string,
  targetColumn: string,
  labels: Label[],
): ScoreResult {
  const byId = new Map<string, Row>();
  for (const r of rows) {
    const id = r[idColumn];
    if (id != null) byId.set(String(id), r);
  }
  let correct = 0;
  const missing: string[] = [];
  const mismatches: Mismatch[] = [];
  for (const label of labels) {
    const row = byId.get(label.id);
    if (!row) { missing.push(label.id); continue; }
    const got = row[targetColumn];
    if (canonical(got) === canonical(label.expected)) {
      correct += 1;
    } else {
      mismatches.push({ id: label.id, expected: label.expected, got });
    }
  }
  const n = labels.length - missing.length;
  return { n, correct, accuracy: n === 0 ? 0 : correct / n, missing, mismatches };
}
