// Table renderer for the REPL viewport, plus the sizing constants and pure
// string helpers it shares with the session.
import { cellDisplay, type Row, type TablePlan } from '@tamedtable/core';

export const REPL_FALLBACK_ROWS = 10;
export const REPL_FALLBACK_COLS = 5;
export const REPL_PAGE_SIZE = REPL_FALLBACK_ROWS;
export const REPL_COL_PAGE_SIZE = REPL_FALLBACK_COLS;
export const REPL_CHROME_LINES = 5;
// Auto-fit width budget: per-column visual cost = average cell width plus the
// " | " separator. 16 is a deliberate compromise: at the default 80-col TTY
// the result equals REPL_FALLBACK_COLS (5), so users see the same view they
// had before the auto-fit was wired up; wider terminals get proportionally
// more columns. Users override via :viewport when their data needs a
// different ratio.
export const REPL_AVG_COL_WIDTH = 16;
export const REPL_INDENT = 1;

// ── Pure formatting helpers ────────────────────────────────────────────────

// #NestedCells: a cell holding a list or object prints as compact JSON, the
// same text the browser grid shows.
const stringify = cellDisplay;

export const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}… (+${s.length - n} chars)` : s);

function wrapHighlight(text: string, re: RegExp | undefined): string {
  if (!re) return text;
  return text.replace(re, (m) => `*${m}*`);
}

// #FormatOut
export function renderTable(
  spec: TablePlan,
  rows: Row[],
  rowOffset = 0,
  colOffset = 0,
  highlight?: RegExp,
  pageRows: number = REPL_FALLBACK_ROWS,
  pageCols: number = REPL_FALLBACK_COLS
): string {
  const allCols = spec.columns.map((c) => c.id);
  const totalRows = rows.length;
  const totalCols = allCols.length;
  const rStart = Math.max(0, Math.min(rowOffset, Math.max(0, totalRows - 1)));
  const rEnd = Math.min(totalRows, rStart + pageRows);
  const cStart = Math.max(0, Math.min(colOffset, Math.max(0, totalCols - 1)));
  const cEnd = Math.min(totalCols, cStart + pageCols);
  const visibleRows = rows.slice(rStart, rEnd);
  const visibleCols = allCols.slice(cStart, cEnd);
  const rowsBefore = rStart;
  const rowsAfter = Math.max(0, totalRows - rEnd);
  const colsBefore = cStart;
  const colsAfter = Math.max(0, totalCols - cEnd);

  const cellText = (r: Row, c: string) => wrapHighlight(stringify(r[c]), highlight);

  // Header (with optional column markers on edges).
  const headerCells: string[] = [];
  if (colsBefore > 0) headerCells.push(`...${colsBefore} more cols.`);
  for (const c of visibleCols) headerCells.push(c);
  if (colsAfter > 0) headerCells.push(`...${colsAfter} more cols.`);

  // Compute widths from header + visible body.
  const widths = headerCells.map((h) => h.length);
  const bodyCells: string[][] = visibleRows.map((r) => {
    const cells: string[] = [];
    if (colsBefore > 0) cells.push('');
    for (const c of visibleCols) cells.push(cellText(r, c));
    if (colsAfter > 0) cells.push('');
    return cells;
  });
  for (const row of bodyCells) {
    for (let i = 0; i < row.length; i++) {
      if ((row[i] ?? '').length > (widths[i] ?? 0)) widths[i] = (row[i] ?? '').length;
    }
  }
  // A row marker renders in place of the first cell (spec/code-contract.md
  // § CLI), so it is sized with the grid: injecting it after the widths are
  // fixed would push every ` | ` on its line out of the header's columns.
  const rowMarker = (n: number) => `...${n} more rows.`;
  if (widths.length > 0) {
    for (const n of [rowsBefore, rowsAfter]) {
      if (n > 0) widths[0] = Math.max(widths[0] ?? 0, rowMarker(n).length);
    }
  }

  const fmt = (vals: string[]) => ' ' + vals.map((v, i) => v.padEnd(widths[i] ?? 0)).join(' | ');

  const lines: string[] = [];
  lines.push(fmt(headerCells));
  const markerRow = (n: number) => {
    const cells: string[] = headerCells.map(() => '');
    cells[0] = rowMarker(n);
    return fmt(cells);
  };
  if (rowsBefore > 0) lines.push(markerRow(rowsBefore));
  for (const row of bodyCells) lines.push(fmt(row));
  if (rowsAfter > 0) lines.push(markerRow(rowsAfter));
  return lines.join('\n');
}
