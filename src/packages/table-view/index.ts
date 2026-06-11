// #TableView
// Pure pagination model — no React, no host state. The host keeps the current
// page number and delegates every calculation here; the package's Pagination
// component uses buildPageList. This entry is React-free; the components live
// in ./components. Spec: spec/packages/table-view/behavior.md.

/** A table row — column id to cell value. */
export type TableRow = Record<string, unknown>;

/** Clamp a 1-based page index into [1, pageCount]. */
export function clampPage(page: number, pageCount: number): number {
  const count = Math.max(1, Math.floor(pageCount) || 1);
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.floor(page)), count);
}

/** Number of pages covering `totalRows` at `pageSize`; always at least 1. */
export function pageCountFor(totalRows: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalRows / pageSize));
}

/** The rows visible on a 1-based page. */
export function pageSlice<T>(rows: T[], page: number, pageSize: number): T[] {
  const current = clampPage(page, pageCountFor(rows.length, pageSize));
  const start = (current - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

/** The pager's page-number window: the first and last page are always shown,
 *  the current page is flanked by one neighbour each side, and `'…'` markers
 *  fill any gap. Up to 7 pages render in full with no markers. */
export function buildPageList(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: Math.max(0, total) }, (_, i) => i + 1);
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  // Anchor a few pages near whichever edge the cursor sits at, so a jump from
  // page 1 into the middle still leaves reachable steps.
  if (current <= 4) for (const n of [2, 3, 4, 5]) wanted.add(n);
  if (current >= total - 3) for (const n of [total - 1, total - 2, total - 3, total - 4]) wanted.add(n);
  const sorted = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push('…');
    out.push(sorted[i]!);
  }
  return out;
}
