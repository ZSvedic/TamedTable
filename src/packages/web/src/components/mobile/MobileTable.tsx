// #MobileShell
// The paged grid for phones: the same rows the desktop TableView shows, but
// scrolled by the DOCUMENT in both directions (no inner scroller), so a swipe
// through the table hides the phone browser's bars and the browser scrollbar
// shows the true position. The header row stays frozen below the fixed app
// bar and the row-number column at the left edge — both position: sticky
// against the page. Tapping a cell selects it (the status the voice prompt
// reads). Editing and column-drag are desktop gestures — the mobile grid is
// select-and-scroll.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { Icon } from '@tamedtable/ui-kit/components';
import type { Row } from '@tamedtable/core';
import { urlHref } from '@tamedtable/table-view';
import type { CellRef, RunProgress } from '../../controller.ts';
import { APPBAR_OFFSET } from './layout.ts';

const IDX_W = 40;

function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export interface MobileTableProps {
  id?: string;
  t: Theme;
  /** Pinch-to-zoom factor (useTableZoom). Applied via the CSS `zoom` property
   *  so the layout — and with it the document scroll range — scales along;
   *  the sticky offsets aimed at the unzoomed fixed app bar divide it back. */
  zoom?: number;
  columns: string[];
  rows: Row[];
  pageStart: number;
  selection: CellRef | null;
  onSelect: (row: number, column: string) => void;
  streaming?: boolean;
  /** Live run progress — the phone's stand-in for the chat progress block
   *  (no sidebar is visible): its status line rides the streaming banner. */
  progress?: RunProgress | null;
  /** Cancels the streaming run — the banner's stop icon. */
  onStop?: () => void;
  // #LazyExec — row state + column-menu marks (the menu itself is the
  // shell's bottom sheet; a header tap opens it).
  /** Original row numbers (1-based) — kept while the view is shuffled. */
  rowNumbers?: number[];
  /** Per-visible-row status: pending washes the number cell, failed reds it. */
  rowStatus?: Array<'pending' | 'failed' | undefined>;
  /** The active column-menu sort/filters, marked in the headers. */
  sort?: { column: string; dir: 'asc' | 'desc' } | null;
  filters?: Record<string, string>;
  /** A header tap opens the column menu (bottom sheet) when present. */
  onHeaderTap?: (column: string) => void;
  /** Cells the host's last step changed, keyed "<absRow>:<col>" — a changed
   *  cell tints, exactly as on desktop (the tint is the signal; the phone
   *  does without the hover tooltip). */
  changedCells?: Record<string, unknown>;
  /** Column the host wants on screen — the reveal scroll. Each new `seq`
   *  pans the page (the phone's scroller) to that column's header, corrected
   *  for the frozen row-number column at the left edge. */
  reveal?: { column: string; seq: number } | null;
}

export function MobileTable({
  id,
  t,
  zoom = 1,
  columns,
  rows,
  pageStart,
  selection,
  onSelect,
  streaming,
  progress,
  onStop,
  rowNumbers,
  rowStatus,
  sort,
  filters,
  onHeaderTap,
  changedCells,
  reveal,
}: MobileTableProps): ReactNode {
  // The reveal scroll: pan the page (the phone's scroller) so the named
  // column's header is on screen. scrollIntoView alone can leave the target
  // under the frozen Row # column at the left edge (an undo landing on a
  // step whose changed column sits left of the view) — nudge past it.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const revealColumn = reveal?.column;
  const revealSeq = reveal?.seq;
  useEffect(() => {
    if (revealColumn === undefined || revealSeq === undefined) return;
    const root = rootRef.current;
    const th = root?.querySelector(`th[data-mob-header="${CSS.escape(revealColumn)}"]`);
    if (!th) return;
    th.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const idx = root?.querySelector('thead th');
    const idxRight = idx?.getBoundingClientRect().right ?? 0;
    const left = th.getBoundingClientRect().left;
    if (left < idxRight) window.scrollBy({ left: left - idxRight });
  }, [revealColumn, revealSeq]);
  // Lengths inside the zoomed subtree render multiplied by the zoom; offsets
  // that must line up with the unzoomed chrome (the fixed app bar) or the
  // unzoomed viewport divide it back out.
  const stickyTop = zoom === 1 ? APPBAR_OFFSET : `calc(${APPBAR_OFFSET} / ${zoom})`;
  const headerCell: CSSProperties = {
    position: 'sticky',
    top: stickyTop,
    zIndex: 2,
    background: t.surface2,
    color: t.ink2,
    textAlign: 'left',
    padding: `0 ${space.px10}px`,
    height: space.headerH,
    boxSizing: 'border-box',
    borderBottom: `1.5px solid ${t.line2}`,
    borderRight: `1px solid ${t.line}`,
    fontFamily: typography.ui,
    fontSize: typography.size.sm,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };
  const bodyCell: CSSProperties = {
    padding: `0 ${space.px10}px`,
    height: space.rowH,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    borderBottom: `1px solid ${t.line}`,
    borderRight: `1px solid ${t.line}`,
    color: t.ink,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 240,
  };

  return (
    // width: max-content — the document scrolls this grid sideways, and the
    // data cells are transparent, so the wrapper that paints the table surface
    // (and anchors the tour spotlight) must span the whole table, not stop at
    // the viewport edge where the page background would show through.
    <div
      id={id}
      ref={rootRef}
      data-mob-table=""
      style={{
        flex: 1,
        width: 'max-content',
        // 100% of the parent renders zoom× wide — divide back so the surface
        // still spans at least the full viewport when zoomed out.
        minWidth: zoom === 1 ? '100%' : `calc(100% / ${zoom})`,
        background: t.surface,
        zoom,
      }}
    >
      {streaming && (
        <div
          data-mob-streaming=""
          style={{
            position: 'sticky',
            top: stickyTop,
            zIndex: 5,
            padding: `${space.px6}px ${space.px12}px`,
            background: t.accentSoft,
            color: t.ink,
            fontFamily: typography.ui,
            fontSize: typography.size.sm,
            borderBottom: `1px solid ${t.line}`,
          }}
        >
          {/* Sticky left pins the status to the visible edge while the page
              scrolls the table sideways. The span must stay content-sized —
              a full-width (flex: 1) span leaves sticky no room to shift, so
              the content would scroll off screen with the banner. */}
          <span
            style={{
              position: 'sticky',
              left: space.px12 / zoom,
              maxWidth: 'calc(100vw - 24px)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: space.px8,
            }}
          >
            <span className="tt-pulse" style={{ flex: '0 0 auto', width: 6, height: 6, borderRadius: 3, background: t.accent }} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {progress && progress.step > 0
                ? `Step ${progress.step} of ${progress.totalSteps} — ${progress.label}` +
                  (progress.rowsTotal > 0 && progress.rowsDone > 0
                    ? ` · ${progress.rowsDone} / ${progress.rowsTotal} rows`
                    : '')
                : 'Running…'}
            </span>
            {onStop && (
              <button
                type="button"
                data-mob-stop=""
                onClick={onStop}
                title="Stop the running request"
                style={{
                  flex: '0 0 auto',
                  height: 24,
                  width: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${t.err}`,
                  borderRadius: space.radiusSm,
                  background: 'transparent',
                  color: t.err,
                  cursor: 'pointer',
                }}
              >
                <Icon name="stop" size={12} />
              </button>
            )}
          </span>
        </div>
      )}
      <table
        style={{
          borderCollapse: 'collapse',
          fontFamily: typography.mono,
          fontSize: typography.size.sm,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                ...headerCell,
                left: 0,
                zIndex: 4,
                width: IDX_W,
                minWidth: IDX_W,
                textAlign: 'right',
                color: t.ink4,
                fontFamily: typography.mono,
                fontWeight: 400,
              }}
            >
              Row #
            </th>
            {columns.map((col) => (
              <th
                key={col}
                data-mob-header={col}
                onClick={onHeaderTap ? () => onHeaderTap(col) : undefined}
                style={{ ...headerCell, minWidth: 96, cursor: onHeaderTap ? 'pointer' : undefined }}
              >
                {col}
                {sort?.column === col && (
                  <span style={{ color: t.accent, fontSize: 9, marginLeft: 4 }}>
                    {sort.dir === 'asc' ? '▲' : '▼'}
                  </span>
                )}
                {filters?.[col] !== undefined && (
                  <span style={{ color: t.accent, fontSize: 10, marginLeft: 4 }}>∇</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const absRow = pageStart + ri;
            const status = rowStatus?.[ri];
            return (
              <tr key={absRow}>
                <td
                  data-mob-rowstatus={status}
                  style={{
                    ...bodyCell,
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    width: IDX_W,
                    minWidth: IDX_W,
                    textAlign: 'right',
                    color: status === 'failed' ? t.onRec : t.ink4,
                    background:
                      status === 'failed' ? t.err
                      : status === 'pending' ? t.accentSoft
                      : t.surface2,
                    opacity: status === 'pending' ? 0.7 : undefined,
                  }}
                >
                  {rowNumbers?.[ri] ?? absRow + 1}
                </td>
                {columns.map((col) => {
                  const isSel = selection?.row === absRow && selection.column === col;
                  const isChanged = changedCells !== undefined && `${absRow}:${col}` in changedCells;
                  const value = (row as Record<string, unknown>)[col];
                  return (
                    <td
                      key={col}
                      data-mob-cell={`${absRow}:${col}`}
                      data-mob-changed={isChanged ? '' : undefined}
                      onClick={() => onSelect(absRow, col)}
                      style={{
                        ...bodyCell,
                        cursor: 'pointer',
                        background: isSel || isChanged ? t.accentSoft : undefined,
                        boxShadow: isSel ? `inset 0 0 0 2px ${t.accent}` : undefined,
                      }}
                    >
                      {value === null || value === undefined ? (
                        <span style={{ color: t.ink4 }}>{value === null ? 'null' : ''}</span>
                      ) : urlHref(value) ? (
                        <a
                          href={urlHref(value)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: t.accent }}
                        >
                          {cellText(value)}
                        </a>
                      ) : (
                        cellText(value)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div style={{ padding: space.px16, color: t.ink3, fontFamily: typography.ui, fontSize: typography.size.sm }}>
          This page has 0 rows.
        </div>
      )}
    </div>
  );
}
