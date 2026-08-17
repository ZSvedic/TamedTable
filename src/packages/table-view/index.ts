// #TableView
// Pure pagination model, no React, no host state. The host keeps the current
// page number and delegates every calculation here; the package's Pagination
// component uses buildPageList. This entry is React-free; the components live
// in ./components. Spec: spec/packages/table-view/behavior.md.

/** A table row: column id to cell value. */
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

/** Default fixed-layout width for a column with no measured width: sized to
 *  its title (mono-ish glyph estimate + menu/padding slack), clamped so a
 *  one-letter column stays grabbable and a paragraph-long title cannot eat
 *  the table. */
export function defaultColumnWidth(title: string): number {
  return Math.max(120, Math.min(240, Math.round(title.length * 8) + 48));
}

/** #NestedCells: a cell as display text, used by the grid, the inline editor's
 *  opening text, and the copy. A list or object prints as compact JSON, so a
 *  cell holding one reads as its data instead of `String`'s "[object Object]";
 *  null and undefined print as nothing. A value JSON cannot write (a cycle, a
 *  bigint inside an object) falls back to `String(value)`.
 *
 *  The app keeps the same rule as `cellDisplay` in `@tamedtable/table-plan`
 *  (this package depends on no TamedTable package but ui-kit);
 *  `src/tests/cell-display-sync.test.ts` fails when the two disagree. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** The href for a cell that is a link, or null. Deliberately strict: only a
 *  string whose entire value parses as an http(s) URL counts, no bare-domain
 *  guessing ("justify.me" stays plain text). */
export function urlHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  // /i: URL schemes are case-insensitive (RFC 3986); `new URL` normalizes.
  if (!/^https?:\/\/\S+$/i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/** The reveal scroll (behavior.md § Grid upgrades): bring a column header on
 *  screen with the smallest scroll that shows it: 'nearest' is a no-op when
 *  it is already visible. Shared by the desktop grid (inner scroller) and the
 *  app's phone grid (document scroller). `stickyRight` is the right edge, in
 *  viewport px, of a frozen left column the header must clear: scrollIntoView
 *  alone can leave the target hidden under it. */
export function revealHeader(th: Element | null | undefined, stickyRight = 0): void {
  if (!th) return;
  th.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (stickyRight <= 0) return;
  if (th.getBoundingClientRect().left < stickyRight) {
    window.scrollBy({ left: th.getBoundingClientRect().left - stickyRight });
  }
}
