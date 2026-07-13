// #TableView
// The paged table grid — pure props in, callbacks out. The host owns the rows
// and the current page and passes in just the visible slice; gestures (select,
// inline edit, header drag-reorder, paging) report back through callbacks.
// The pulse and grip-reveal animations ship inside the component so the grid
// looks the same standalone (demo page) and inside an app.
import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Icon } from '@tamedtable/ui-kit/components';
import type { TableRow } from './index.ts';
import { Pagination } from './Pagination.tsx';

export type TableStatus = 'idle' | 'running' | 'saved';

export interface CellSelection {
  row: number;
  column: string;
}

export interface TableViewProps {
  /** DOM id forwarded to the root element (e.g. for Driver.js highlights). */
  id?: string;
  columns: string[];
  /** The visible page's rows only — the host slices. */
  rows: TableRow[];
  /** Absolute index of the first visible row. */
  pageStart: number;
  totalRows: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** The selected cell (absolute row index), or null. */
  selection: CellSelection | null;
  onSelectCell: (row: number, column: string) => void;
  onEditCell: (row: number, column: string, value: string) => void;
  onReorderColumns: (order: string[]) => void;
  streaming?: boolean;
  status: TableStatus;
}

function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

const STATUS_LABEL: Record<TableStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  saved: 'Saved',
};

/** Floor for a resized column — keeps the resize handle grabbable. */
const MIN_COL_W = 48;
/** Width given to a column that appears after the resize snapshot was taken. */
const DEFAULT_COL_W = 120;

const TV_CSS =
  '@keyframes tv-pulse-kf { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }' +
  ' .tv-pulse { animation: tv-pulse-kf 1.2s ease-in-out infinite; }' +
  ' .tv-th .tv-grip { opacity: 0; transition: opacity 0.15s; }' +
  ' .tv-th:hover .tv-grip { opacity: 1; }';

export function TableView({
  id,
  columns,
  rows,
  pageStart,
  totalRows,
  page,
  pageCount,
  onPageChange,
  selection,
  onSelectCell,
  onEditCell,
  onReorderColumns,
  streaming,
  status,
}: TableViewProps): ReactNode {
  const t = useTheme();
  const [editing, setEditing] = useState<{ row: number; col: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [dragCol, setDragCol] = useState<string | null>(null);
  // Column widths in px, keyed by column id ('#' is the row-number column).
  // null until the first resize; then the table switches to fixed layout.
  const [widths, setWidths] = useState<Record<string, number> | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const firstRow = totalRows === 0 ? 0 : pageStart + 1;
  const lastRow = pageStart + rows.length;

  const commitEdit = (): void => {
    if (!editing) return;
    const { row, col } = editing;
    setEditing(null);
    onEditCell(row, col, draft);
  };

  const dropOn = (target: string): void => {
    if (!dragCol || dragCol === target) {
      setDragCol(null);
      return;
    }
    const order = columns.slice();
    const from = order.indexOf(dragCol);
    const to = order.indexOf(target);
    if (from < 0 || to < 0) {
      setDragCol(null);
      return;
    }
    order.splice(from, 1);
    order.splice(to, 0, dragCol);
    setDragCol(null);
    onReorderColumns(order);
  };

  const startResize = (col: string, e: ReactMouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    const table = tableRef.current;
    if (!table) return;
    // First resize: snapshot every column's rendered width, so switching the
    // table to fixed layout keeps the untouched columns exactly as they are.
    const snap: Record<string, number> = { ...(widths ?? {}) };
    if (!widths) {
      table.querySelectorAll('thead th').forEach((th, i) => {
        snap[i === 0 ? '#' : columns[i - 1] ?? '#'] = th.getBoundingClientRect().width;
      });
    }
    setWidths(snap);
    const startX = e.clientX;
    const startW = snap[col] ?? DEFAULT_COL_W;
    const move = (ev: MouseEvent): void =>
      setWidths({ ...snap, [col]: Math.max(MIN_COL_W, startW + ev.clientX - startX) });
    const up = (): void => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const colW = (col: string): number => widths?.[col] ?? DEFAULT_COL_W;
  const tableW = widths ? colW('#') + columns.reduce((sum, c) => sum + colW(c), 0) : undefined;

  const headerCell: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    background: t.surface2,
    color: t.ink2,
    textAlign: 'left',
    padding: `0 ${space.px10}px`,
    height: space.headerH,
    borderBottom: `1px solid ${t.line2}`,
    borderRight: `1px solid ${t.line}`,
    userSelect: 'none',
    fontFamily: typography.ui,
    fontSize: typography.size.sm,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const bodyCell: CSSProperties = {
    padding: `0 ${space.px10}px`,
    height: space.rowH,
    borderBottom: `1px solid ${t.line}`,
    borderRight: `1px solid ${t.line}`,
    color: t.ink,
    // Under fixed layout the colgroup owns the widths; the cap only matters
    // while the table still auto-sizes to content.
    maxWidth: widths ? undefined : 320,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      id={id}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        background: t.surface,
      }}
    >
      <style>{TV_CSS}</style>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {streaming && (
          <div
            data-tv-streaming=""
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
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
            <span
              className="tv-pulse"
              style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }}
            />
            Streaming results…
          </div>
        )}
        <table
          ref={tableRef}
          style={{
            borderCollapse: 'collapse',
            fontFamily: typography.mono,
            fontSize: typography.size.sm,
            fontVariantNumeric: 'tabular-nums',
            tableLayout: widths ? 'fixed' : 'auto',
            width: tableW,
          }}
        >
          {widths && (
            <colgroup>
              <col style={{ width: colW('#') }} />
              {columns.map((col) => (
                <col key={col} style={{ width: colW(col) }} />
              ))}
            </colgroup>
          )}
          <thead>
            <tr>
              <th
                style={{
                  ...headerCell,
                  textAlign: 'right',
                  color: t.ink4,
                  fontFamily: typography.mono,
                  fontWeight: 400,
                }}
              >
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="tv-th"
                  data-tv-header={col}
                  draggable
                  onDragStart={() => setDragCol(col)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(col)}
                  title="Drag to reorder"
                  style={{
                    ...headerCell,
                    cursor: 'grab',
                    background: dragCol === col ? t.accentSoft : t.surface2,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.px6 }}>
                    <span className="tv-grip" style={{ color: t.ink4 }}>
                      <Icon name="grip" size={12} />
                    </span>
                    {col}
                  </span>
                  {/* Resize handle on the header's right edge. It cancels its
                      own dragstart so grabbing it never begins a reorder. */}
                  <span
                    data-tv-resize={col}
                    title="Drag to resize"
                    draggable
                    onDragStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => startResize(col, e)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: 8,
                      height: '100%',
                      cursor: 'col-resize',
                    }}
                  />
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
                      color: t.ink4,
                      textAlign: 'right',
                      background: t.surface2,
                    }}
                  >
                    {absRow + 1}
                  </td>
                  {columns.map((col) => {
                    const isEditing = editing?.row === absRow && editing.col === col;
                    const isSelected =
                      selection?.row === absRow && selection.column === col;
                    return (
                      <td
                        key={col}
                        data-tv-cell={`${absRow}:${col}`}
                        title="Click to select · double-click to edit"
                        onClick={() => onSelectCell(absRow, col)}
                        onDoubleClick={() => {
                          setEditing({ row: absRow, col });
                          setDraft(cellText(row?.[col]));
                        }}
                        style={{
                          ...bodyCell,
                          padding: isEditing ? 0 : bodyCell.padding,
                          background:
                            isSelected && !isEditing ? t.accentSoft : undefined,
                          boxShadow: isEditing ? `inset 0 0 0 2px ${t.accent}` : undefined,
                        }}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            data-tv-edit=""
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitEdit();
                              } else if (e.key === 'Escape') {
                                setEditing(null);
                              }
                            }}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              fontFamily: typography.mono,
                              fontSize: typography.size.sm,
                              background: t.surface,
                              color: t.ink,
                              border: 'none',
                              outline: 'none',
                              padding: `0 ${space.px10}px`,
                              height: space.rowH,
                            }}
                          />
                        ) : (
                          cellText(row?.[col])
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
          <div
            style={{
              padding: space.px16,
              color: t.ink3,
              fontFamily: typography.ui,
              fontSize: typography.size.sm,
            }}
          >
            This table has 0 rows.
          </div>
        )}
      </div>

      {/* pagination bar */}
      <div
        style={{
          flex: '0 0 auto',
          height: space.topbarH,
          display: 'flex',
          alignItems: 'center',
          gap: space.px12,
          padding: `0 ${space.px10}px 0 ${space.px14}px`,
          borderTop: `1px solid ${t.line}`,
          background: t.surface2,
        }}
      >
        <span
          data-tv-range=""
          style={{
            fontFamily: typography.mono,
            fontSize: typography.size.xs,
            color: t.ink3,
          }}
        >
          <span style={{ color: t.ink2 }}>
            {firstRow}–{lastRow}
          </span>{' '}
          of {totalRows} rows
        </span>
        <span style={{ flex: 1 }} />
        <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
      </div>

      {/* status footer */}
      <div
        style={{
          flex: '0 0 auto',
          height: 24,
          display: 'flex',
          alignItems: 'center',
          gap: space.px10,
          padding: `0 ${space.px12}px`,
          borderTop: `1px solid ${t.line}`,
          background: t.surface2,
          fontFamily: typography.mono,
          fontSize: typography.size.xs,
          color: t.ink3,
        }}
      >
        <span data-tv-selection="" style={{ color: selection ? t.ink2 : t.ink4 }}>
          {selection ? `R${selection.row + 1} · ${selection.column}` : 'no selection'}
        </span>
        <span style={{ color: t.ink4 }}>·</span>
        <span>UTF-8</span>
        <span style={{ flex: 1 }} />
        <span
          data-tv-status={status}
          style={{ display: 'inline-flex', alignItems: 'center', gap: space.px6 }}
        >
          <span
            className={status === 'running' ? 'tv-pulse' : undefined}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: status === 'running' ? t.accent : status === 'saved' ? t.ok : t.ink4,
            }}
          />
          {STATUS_LABEL[status]}
        </span>
      </div>
    </div>
  );
}
