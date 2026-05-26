// Pure pagination helpers — no React, no controller state. The WebController
// uses clampPage; the Pagination component uses buildPageList. Unit-tested in
// ./pagination.test.ts.

/** Clamp a 1-based page index into [1, pageCount]. */
export function clampPage(page: number, pageCount: number): number {
  const count = Math.max(1, Math.floor(pageCount) || 1);
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.floor(page)), count);
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
