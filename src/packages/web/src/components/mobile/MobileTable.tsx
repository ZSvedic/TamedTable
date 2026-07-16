// #MobileShell
// The paged grid for phones: the same rows the desktop TableView shows, but
// scrolled by the DOCUMENT in both directions (no inner scroller), so a swipe
// through the table hides the phone browser's bars and the browser scrollbar
// shows the true position. The header row stays frozen below the fixed app
// bar and the row-number column at the left edge — both position: sticky
// against the page. Tapping a cell selects it (the status the voice prompt
// reads). Editing and column-drag are desktop gestures — the mobile grid is
// select-and-scroll.
import type { CSSProperties, ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { Icon } from '@tamedtable/ui-kit/components';
import type { Row } from '@tamedtable/core';
import type { CellRef, RunProgress } from '../../controller.ts';
import { APPBAR_OFFSET } from './layout.ts';

const IDX_W = 40;

function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export interface MobileTableProps {
  id?: string;
  t: Theme;
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
}

export function MobileTable({
  id,
  t,
  columns,
  rows,
  pageStart,
  selection,
  onSelect,
  streaming,
  progress,
  onStop,
}: MobileTableProps): ReactNode {
  const headerCell: CSSProperties = {
    position: 'sticky',
    top: APPBAR_OFFSET,
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
      data-mob-table=""
      style={{ flex: 1, width: 'max-content', minWidth: '100%', background: t.surface }}
    >
      {streaming && (
        <div
          data-mob-streaming=""
          style={{
            position: 'sticky',
            top: APPBAR_OFFSET,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: space.px8,
            padding: `${space.px6}px ${space.px12}px`,
            background: t.accentSoft,
            color: t.ink,
            fontFamily: typography.ui,
            fontSize: typography.size.sm,
            borderBottom: `1px solid ${t.line}`,
          }}
        >
          {/* Sticky left keeps the status visible while scrolling sideways. */}
          <span
            style={{
              position: 'sticky',
              left: space.px12,
              flex: 1,
              minWidth: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: space.px8,
            }}
          >
            <span className="tt-pulse" style={{ flex: '0 0 auto', width: 6, height: 6, borderRadius: 3, background: t.accent }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {progress && progress.step > 0
                ? `Step ${progress.step} of ${progress.totalSteps} — ${progress.label}` +
                  (progress.rowsTotal > 0 && progress.rowsDone > 0
                    ? ` · ${progress.rowsDone} / ${progress.rowsTotal} rows`
                    : '')
                : 'Streaming results…'}
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
              #
            </th>
            {columns.map((col) => (
              <th key={col} style={{ ...headerCell, minWidth: 96 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const absRow = pageStart + ri;
            return (
              <tr key={absRow}>
                <td
                  style={{
                    ...bodyCell,
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    width: IDX_W,
                    minWidth: IDX_W,
                    textAlign: 'right',
                    color: t.ink4,
                    background: t.surface2,
                  }}
                >
                  {absRow + 1}
                </td>
                {columns.map((col) => {
                  const isSel = selection?.row === absRow && selection.column === col;
                  const value = (row as Record<string, unknown>)[col];
                  return (
                    <td
                      key={col}
                      data-mob-cell={`${absRow}:${col}`}
                      onClick={() => onSelect(absRow, col)}
                      style={{
                        ...bodyCell,
                        cursor: 'pointer',
                        background: isSel ? t.accentSoft : undefined,
                        boxShadow: isSel ? `inset 0 0 0 2px ${t.accent}` : undefined,
                      }}
                    >
                      {value === null || value === undefined ? (
                        <span style={{ color: t.ink4 }}>{value === null ? 'null' : ''}</span>
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
