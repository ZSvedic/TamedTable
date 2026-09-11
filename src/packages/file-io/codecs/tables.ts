// #TablePick #IoFormats
// The shared table-listing helpers for formats that hold several tables (a
// workbook's sheets, a page's <table>s): the candidate shape, the chooser, the
// `#pick` path splitter, and the header/column-name rules both codecs share.
// Spec: spec/packages/file-io/behavior.md § Tables inside a source.
import { setCell, type Row } from '@tamedtable/table-plan';

/** One table a source holds. `index` is 1-based: the number a `#<n>` names. */
export interface TableCandidate {
  index: number;
  name: string;
  /** Where it sits: "Orders!B3:E8" in a workbook, "table 2 of 3" on a page. */
  location: string;
  rowCount: number;
  columns: string[];
}

/** Thrown when a source holds several tables and no pick was given: the
 *  message lists them; the host may show it as-is or raise its own picker. */
export class TableChoiceError extends Error {
  readonly sourceName: string;
  readonly candidates: TableCandidate[];
  constructor(sourceName: string, candidates: TableCandidate[]) {
    super(
      `${sourceName} holds ${candidates.length} tables; add #<n> or #<name> to pick one:\n${listLines(candidates)}`,
    );
    this.name = 'TableChoiceError';
    this.sourceName = sourceName;
    this.candidates = candidates;
  }
}

function listLines(candidates: TableCandidate[]): string {
  return candidates
    .map((c) => `  ${c.index}. ${c.name} (${c.location}): ${c.rowCount} rows: ${c.columns.join(', ')}`)
    .join('\n');
}

/** Settle which candidate loads: none fails, one needs no pick, several need
 *  one (a 1-based number or a case-insensitive name). `noneHint` is the
 *  format's sentence on why a source of its kind can hold no table. */
export function chooseTable(
  name: string,
  candidates: TableCandidate[],
  pick?: string,
  noneHint?: string,
): TableCandidate {
  if (candidates.length === 0) {
    throw new Error(`${name}: no table found${noneHint ? `. ${noneHint}` : ''}`);
  }
  if (candidates.length === 1) return candidates[0]!;
  if (pick === undefined || pick === '') throw new TableChoiceError(name, candidates);
  const wanted = pick.trim();
  const byNumber = /^\d+$/.test(wanted) ? candidates.find((c) => c.index === Number(wanted)) : undefined;
  const byName = candidates.find((c) => c.name.toLowerCase() === wanted.toLowerCase());
  const found = byNumber ?? byName;
  if (!found) throw new Error(`${name}: no table "${wanted}"\n${listLines(candidates)}`);
  return found;
}

/** Extensions whose files can hold several tables: the only ones a `#pick`
 *  is split off a local path for, so a `#` inside a CSV name stays a character. */
export const MULTI_TABLE_EXTENSIONS = ['.xlsx', '.html', '.htm'];

/** `report.xlsx#Orders` → `{ source: "report.xlsx", table: "Orders" }`; a
 *  path with no pick, or one whose base is not a multi-table file, comes
 *  back unchanged (no `table` key). */
export function splitTableSelector(path: string): { source: string; table?: string } {
  const hash = path.lastIndexOf('#');
  if (hash < 0) return { source: path };
  const source = path.slice(0, hash);
  const lower = source.toLowerCase();
  if (!MULTI_TABLE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return { source: path };
  const table = path.slice(hash + 1);
  return table ? { source, table } : { source };
}

/** Header cells → column names: a blank one is `column<i>` (1-based
 *  position), a repeat gets `_2`, `_3`, … */
export function columnNames(header: Array<string | null>): string[] {
  const seen = new Set<string>();
  return header.map((cell, i) => {
    const base = (cell ?? '').trim() || `column${i + 1}`;
    let name = base;
    for (let n = 2; seen.has(name); n++) name = `${base}_${n}`;
    seen.add(name);
    return name;
  });
}

/** Grid of cell values (header first) → rows keyed by column. A data row
 *  longer than the header widens the table with `column<i>`; a shorter one
 *  pads with null; a fully empty row is dropped. */
export function gridToTable(grid: unknown[][]): { rows: Row[]; columns: string[] } {
  const header = (grid[0] ?? []).map((v) => (v === null || v === undefined ? null : String(v)));
  const width = grid.reduce((w, r) => Math.max(w, r.length), header.length);
  while (header.length < width) header.push(null);
  const columns = columnNames(header);
  const rows: Row[] = [];
  for (const cells of grid.slice(1)) {
    if (cells.every((v) => v === null || v === undefined || v === '')) continue;
    const row: Row = {};
    columns.forEach((col, i) => setCell(row, col, cells[i] ?? null));
    rows.push(row);
  }
  return { rows, columns };
}
