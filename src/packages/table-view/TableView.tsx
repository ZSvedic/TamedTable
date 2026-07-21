// #TableView
// The paged table grid — pure props in, callbacks out. The host owns the rows
// and the current page and passes in just the visible slice; gestures (select,
// inline edit, header drag-reorder, paging) report back through callbacks.
// The pulse and grip-reveal animations ship inside the component so the grid
// looks the same standalone (demo page) and inside an app.
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Icon } from '@tamedtable/ui-kit/components';
import { defaultColumnWidth, urlHref, type TableRow } from './index.ts';
import { Pagination } from './Pagination.tsx';

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
  // ── Grid upgrades (#LazyExec — spec/packages/table-view/behavior.md) ──────
  /** Display numbers for each visible row (1-based). The host passes original
   *  row numbers while its view is shuffled; default is pageStart + i + 1. */
  rowNumbers?: number[];
  /** Hover hint on the Row # header (the shuffled-view explanation). */
  rowNumberHint?: string;
  /** Per-visible-row status: 'pending' washes the Row # cell muted,
   *  'failed' marks it red. Retry is a host affordance, not a grid control. */
  rowStatus?: Array<'pending' | 'failed' | undefined>;
  /** Cells the host's last step changed, keyed "<absRow>:<col>" → previous
   *  value. A changed cell tints and shows `was: <previous>` on hover. */
  changedCells?: Record<string, unknown>;
  /** The active column-menu sort, shown as ▲/▼ in the header (host state). */
  sort?: { column: string; dir: 'asc' | 'desc' } | null;
  /** Per-column contains-match filters, shown as a funnel mark (host state). */
  filters?: Record<string, string>;
  /** Column-menu callbacks — when any is present, every data header ends in
   *  a ⋮ menu. Sort and filter are view state the host applies; Delete
   *  column's meaning is the host's call (in the app, a spec step). */
  onSortChange?: (column: string, dir: 'asc' | 'desc' | null) => void;
  onFilterChange?: (column: string, text: string) => void;
  onDeleteColumn?: (column: string) => void;
  /** 1-based pages carrying pending rows — small dot marks in the pager. */
  markedPages?: number[];
  /** Left slot in the pagination bar, after the range readout (the app's
   *  "N of M rows evaluated" readout + retry action). */
  barLeft?: ReactNode;
  /** Right slot in the pagination bar, after the pager (Run on all rows). */
  barRight?: ReactNode;
  /** Fires after Cmd/Ctrl+C copied the selected cell's text. */
  onCopyCell?: (row: number, column: string, text: string) => void;
}

function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/** Floor for a resized column — keeps the resize handle grabbable. */
const MIN_COL_W = 48;

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
  rowNumbers,
  rowNumberHint,
  rowStatus,
  changedCells,
  sort,
  filters,
  onSortChange,
  onFilterChange,
  onDeleteColumn,
  markedPages,
  barLeft,
  barRight,
  onCopyCell,
}: TableViewProps): ReactNode {
  const t = useTheme();
  const [editing, setEditing] = useState<{ row: number; col: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [dragCol, setDragCol] = useState<string | null>(null);
  // Column widths in px, keyed by column id ('#' is the row-number column).
  // null until the first resize; then the table switches to fixed layout.
  const [widths, setWidths] = useState<Record<string, number> | null>(null);
  // The open ⋮ column menu (anchored at the button's screen position — the
  // sticky header cells clip overflow, so the popover renders at the root),
  // and whether its Filter… input is showing.
  const [menu, setMenu] = useState<{ col: string; x: number; y: number } | null>(null);
  const [filterDraft, setFilterDraft] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const hasMenu = Boolean(onSortChange || onFilterChange || onDeleteColumn);

  const firstRow = totalRows === 0 ? 0 : pageStart + 1;
  const lastRow = pageStart + rows.length;

  const commitEdit = (): void => {
    if (!editing) return;
    const { row, col } = editing;
    setEditing(null);
    onEditCell(row, col, draft);
  };

  // Cmd/Ctrl+C copies the selected cell's text — without entering edit mode.
  // A live text selection anywhere on the page wins (never hijack the
  // browser's own copy), and editing keeps the textarea's native copy.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'c') return;
      if (!selection || editing) return;
      const live = typeof window !== 'undefined' ? window.getSelection()?.toString() : '';
      if (live) return;
      const rowIdx = selection.row - pageStart;
      const row = rows[rowIdx];
      if (!row) return;
      const text = cellText(row[selection.column]);
      void navigator.clipboard?.writeText(text).catch(() => {});
      onCopyCell?.(selection.row, selection.column, text);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selection, editing, rows, pageStart, onCopyCell]);

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

  // Snapshot every column's rendered width, so switching the table to fixed
  // layout keeps the untouched columns exactly as they are. Shared by drag
  // resize and autofit.
  const snapshotWidths = (): Record<string, number> => {
    const snap: Record<string, number> = { ...(widths ?? {}) };
    const table = tableRef.current;
    if (!widths && table) {
      table.querySelectorAll('thead th').forEach((th, i) => {
        snap[i === 0 ? '#' : columns[i - 1] ?? '#'] = th.getBoundingClientRect().width;
      });
    }
    return snap;
  };

  // Autofit: size the column to its widest cell on the current page — the
  // menu's Autofit width, and double-click on a separator. Content is
  // measured with an off-DOM probe (a stretched cell's own box never shrinks
  // below its assigned width), then padded; same fixed-layout snapshot as a
  // drag resize.
  const autofit = (col: string): void => {
    const table = tableRef.current;
    if (!table) return;
    const snap = snapshotWidths();
    const colIdx = columns.indexOf(col) + 1; // +1: the Row # column leads
    const probe = document.createElement('span');
    probe.style.cssText =
      `position:absolute;visibility:hidden;white-space:nowrap;` +
      `font-family:${typography.mono};font-size:${typography.size.sm}px;`;
    document.body.appendChild(probe);
    // Body cells — measured in the grid's mono font.
    let dataMax = 0;
    table.querySelectorAll('tbody tr').forEach((tr) => {
      const cell = tr.children[colIdx] as HTMLElement | undefined;
      if (!cell) return;
      probe.textContent = cell.textContent ?? '';
      dataMax = Math.max(dataMax, probe.getBoundingClientRect().width);
    });
    const dataW = Math.ceil(dataMax) + 2 * space.px10 + 4;
    // The header — measured in its own (heavier UI) font, plus its chrome: the
    // drag grip, any sort/filter mark, and the reserved ⋮ button. Autofit must
    // keep the column's own name readable, not just its data (#LazyExec).
    probe.style.fontFamily = typography.ui;
    probe.style.fontWeight = '600';
    probe.textContent = col;
    const titleW = Math.ceil(probe.getBoundingClientRect().width);
    probe.remove();
    const marks = (sort?.column === col ? 15 : 0) + (filters?.[col] !== undefined ? 17 : 0);
    const grip = 18; // the grip icon (12) + its gap (6)
    const headerW = space.px10 + grip + titleW + marks + (hasMenu ? 30 : space.px10);
    setWidths({ ...snap, [col]: Math.max(MIN_COL_W, Math.min(640, Math.max(dataW, headerW))) });
  };

  const startResize = (col: string, e: ReactMouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    const table = tableRef.current;
    if (!table) return;
    const snap = snapshotWidths();
    setWidths(snap);
    const startX = e.clientX;
    const startW = snap[col] ?? defaultColumnWidth(col);
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

  const colW = (col: string): number => widths?.[col] ?? defaultColumnWidth(col);
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
        {/* Sizes to the table so the banner spans its full width even when the
            table overflows the viewport horizontally. */}
        <div style={{ width: 'max-content', minWidth: '100%' }}>
          {streaming && (
            <div
              data-tv-streaming=""
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                padding: `${space.px6}px ${space.px12}px`,
                background: t.accentSoft,
                color: t.ink,
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                borderBottom: `1px solid ${t.line}`,
              }}
            >
              {/* Sticky left keeps the label visible while scrolling sideways. */}
              <span
                style={{
                  position: 'sticky',
                  left: space.px12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: space.px8,
                }}
              >
                <span
                  className="tv-pulse"
                  style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }}
                />
                Streaming results…
              </span>
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
                  title={rowNumberHint}
                  style={{
                    ...headerCell,
                    textAlign: 'right',
                    color: t.ink4,
                    fontFamily: typography.mono,
                    fontWeight: 400,
                    cursor: rowNumberHint ? 'help' : undefined,
                  }}
                >
                  Row #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="tv-th"
                    data-tv-header={col}
                    data-tv-filtered={filters?.[col] !== undefined ? col : undefined}
                    draggable
                    onDragStart={() => setDragCol(col)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(col)}
                    title="Drag to reorder"
                    style={{
                      ...headerCell,
                      cursor: 'grab',
                      background: dragCol === col ? t.accentSoft : t.surface2,
                      // Reserve room for the ⋮ button so a long title
                      // ellipsizes ("Cat…") instead of running under it.
                      paddingRight: hasMenu ? 30 : undefined,
                      // The title ellipsizes in its own inner box, so the cell
                      // itself need not clip — letting the resize handle straddle
                      // the column border instead of sitting just left of it.
                      overflow: 'visible',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: space.px6, maxWidth: '100%' }}>
                      <span className="tv-grip" style={{ flex: '0 0 auto', color: t.ink4 }}>
                        <Icon name="grip" size={12} />
                      </span>
                      {/* The title gets its own ellipsizing box — text-overflow
                          on the th cannot reach inside the flex row. */}
                      <span data-tv-title={col} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {col}
                      </span>
                      {/* The header itself shows the view state: ▲/▼ for the
                          active sort, a funnel while a filter narrows. */}
                      {sort?.column === col && (
                        <span data-tv-sort={sort.dir} style={{ color: t.accent, fontSize: 9 }}>
                          {sort.dir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                      {filters?.[col] !== undefined && (
                        <span
                          data-tv-filter-mark={col}
                          title={`Filtered: contains "${filters[col]}"`}
                          style={{ flex: '0 0 auto', display: 'inline-flex', color: t.accent }}
                        >
                          <Icon name="funnel" size={11} />
                        </span>
                      )}
                    </span>
                    {hasMenu && (
                      <button
                        type="button"
                        className="tv-menu-btn"
                        data-tv-menu={col}
                        title="Column menu"
                        draggable
                        onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterDraft(null);
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setMenu(menu?.col === col ? null : { col, x: r.right, y: r.bottom + 2 });
                        }}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          right: 9,
                          transform: 'translateY(-50%)',
                          width: 18,
                          height: 20,
                          padding: 0,
                          border: 'none',
                          borderRadius: 4,
                          // A visible chip, not a ghost: the reserved header
                          // padding keeps title text from running under it.
                          background: menu?.col === col ? t.accentSoft : t.surface3,
                          color: t.ink2,
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        ⋮
                      </button>
                    )}
                    {/* Resize handle on the header's right edge. It cancels its
                        own dragstart so grabbing it never begins a reorder;
                        double-clicking it autofits the column (#LazyExec). */}
                    <span
                      data-tv-resize={col}
                      title="Drag to resize · double-click to autofit"
                      draggable
                      onDragStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => startResize(col, e)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        autofit(col);
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        // Straddle the column border (the cell's right edge)
                        // instead of sitting just inside it, so the resize
                        // cursor appears when the pointer is on the visible
                        // boundary — not ~5px to its left.
                        right: -3,
                        width: 10,
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
                const status = rowStatus?.[ri];
                return (
                  <tr key={absRow}>
                    <td
                      data-tv-rowstatus={status}
                      title={
                        status === 'pending' ? 'Pending — AI steps have not reached this row yet'
                        : status === 'failed' ? 'Failed — retry from the readout below'
                        : undefined
                      }
                      style={{
                        ...bodyCell,
                        color: status === 'failed' ? t.onRec : t.ink4,
                        textAlign: 'right',
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
                      const isEditing = editing?.row === absRow && editing.col === col;
                      const isSelected =
                        selection?.row === absRow && selection.column === col;
                      const changed = changedCells?.[`${absRow}:${col}`];
                      const isChanged = changedCells !== undefined && `${absRow}:${col}` in changedCells;
                      return (
                        <td
                          key={col}
                          data-tv-cell={`${absRow}:${col}`}
                          data-tv-changed={isChanged ? '' : undefined}
                          title={
                            isChanged
                              ? `was: ${changed === null || changed === undefined || changed === '' ? '(empty)' : String(changed)}`
                              : 'Click to select · double-click to edit'
                          }
                          onClick={() => onSelectCell(absRow, col)}
                          onDoubleClick={() => {
                            setEditing({ row: absRow, col });
                            setDraft(cellText(row?.[col]));
                          }}
                          style={{
                            ...bodyCell,
                            padding: isEditing ? 0 : bodyCell.padding,
                            background:
                              isSelected && !isEditing ? t.accentSoft
                              : isChanged ? t.accentSoft
                              : undefined,
                            boxShadow: isEditing
                              ? `inset 0 0 0 2px ${t.accent}`
                              : isSelected ? `inset 0 0 0 1.5px ${t.accent}`
                              : undefined,
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
                            (() => {
                              // Strict URL cells render as links; everything
                              // else — including bare domains — stays text.
                              const href = urlHref(row?.[col]);
                              return href ? (
                                <a
                                  data-tv-link=""
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: t.accent }}
                                >
                                  {cellText(row?.[col])}
                                </a>
                              ) : (
                                cellText(row?.[col])
                              );
                            })()
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
      </div>

      {menu && (
        <ColumnMenu
          col={menu.col}
          x={menu.x}
          y={menu.y}
          sortDir={sort?.column === menu.col ? sort.dir : null}
          filterText={filters?.[menu.col] ?? ''}
          filterDraft={filterDraft}
          setFilterDraft={setFilterDraft}
          onSort={(dir) => { setMenu(null); onSortChange?.(menu.col, dir); }}
          onFilter={(text) => { setMenu(null); setFilterDraft(null); onFilterChange?.(menu.col, text); }}
          onAutofit={() => { const c = menu.col; setMenu(null); autofit(c); }}
          onDelete={onDeleteColumn ? () => { setMenu(null); onDeleteColumn(menu.col); } : undefined}
          onClose={() => { setMenu(null); setFilterDraft(null); }}
        />
      )}

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
        {barLeft}
        <span style={{ flex: 1 }} />
        <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} markedPages={markedPages} />
        {barRight}
      </div>
    </div>
  );
}

/** The per-column ⋮ menu (#LazyExec grid upgrades): Sort ascending /
 *  descending (picking the active direction clears it), Filter… (a small
 *  contains-match input), Autofit width, and Delete column. Rendered inside
 *  the header cell; a fixed backdrop closes it on any outside click. */
function ColumnMenu({
  col,
  x,
  y,
  sortDir,
  filterText,
  filterDraft,
  setFilterDraft,
  onSort,
  onFilter,
  onAutofit,
  onDelete,
  onClose,
}: {
  col: string;
  /** Screen anchor: the ⋮ button's bottom-right corner. */
  x: number;
  y: number;
  sortDir: 'asc' | 'desc' | null;
  filterText: string;
  filterDraft: string | null;
  setFilterDraft: (v: string | null) => void;
  onSort: (dir: 'asc' | 'desc' | null) => void;
  onFilter: (text: string) => void;
  onAutofit: () => void;
  onDelete?: () => void;
  onClose: () => void;
}): ReactNode {
  const t = useTheme();
  const item: CSSProperties = {
    display: 'block',
    width: '100%',
    padding: `${space.px6}px ${space.px12}px`,
    border: 'none',
    background: 'transparent',
    color: t.ink,
    textAlign: 'left',
    fontFamily: typography.ui,
    fontSize: typography.size.sm,
    fontWeight: 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
  // A hairline that groups the menu into sort / filter / fit / delete.
  const sep: CSSProperties = { height: 1, margin: `${space.px6}px 0`, background: t.line };
  return (
    <>
      {/* Backdrop: closes the menu on any click outside it. */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{ position: 'fixed', inset: 0, zIndex: 30, cursor: 'default' }}
      />
      <span
        data-tv-colmenu={col}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: y,
          left: x,
          transform: 'translateX(-100%)',
          zIndex: 31,
          minWidth: 160,
          padding: `${space.px6}px 0`,
          background: t.surface,
          border: `1px solid ${t.line2}`,
          borderRadius: space.radius,
          boxShadow: t.shadowLg,
          fontWeight: 400,
          textAlign: 'left',
          whiteSpace: 'nowrap',
          cursor: 'default',
        }}
      >
        <button type="button" data-tv-menu-item="sort-asc" style={item} onClick={() => onSort(sortDir === 'asc' ? null : 'asc')}>
          {sortDir === 'asc' ? '✓ ' : ''}Sort ascending
        </button>
        <button type="button" data-tv-menu-item="sort-desc" style={item} onClick={() => onSort(sortDir === 'desc' ? null : 'desc')}>
          {sortDir === 'desc' ? '✓ ' : ''}Sort descending
        </button>
        <div style={sep} />
        {filterDraft === null ? (
          <button type="button" data-tv-menu-item="filter" style={item} onClick={() => setFilterDraft(filterText)}>
            Filter…{filterText ? ` (${filterText})` : ''}
          </button>
        ) : (
          <span style={{ display: 'flex', gap: space.px6, padding: `2px ${space.px12}px` }}>
            <input
              autoFocus
              data-tv-filter-input=""
              value={filterDraft}
              placeholder={`${col} contains…`}
              onChange={(e) => setFilterDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onFilter(filterDraft);
                else if (e.key === 'Escape') onClose();
              }}
              style={{
                width: 130,
                padding: '3px 6px',
                border: `1px solid ${t.line2}`,
                borderRadius: space.radiusSm,
                background: t.surface,
                color: t.ink,
                fontFamily: typography.ui,
                fontSize: typography.size.sm,
                outline: 'none',
              }}
            />
          </span>
        )}
        {/* Only when a filter is set — the affordance to clear it. */}
        {filterText && (
          <button type="button" data-tv-menu-item="remove-filter" style={item} onClick={() => onFilter('')}>
            Remove filter
          </button>
        )}
        <div style={sep} />
        <button type="button" data-tv-menu-item="autofit" style={item} onClick={onAutofit}>
          Autofit width
        </button>
        {onDelete && (
          <>
            <div style={sep} />
            <button type="button" data-tv-menu-item="delete" style={{ ...item, color: t.err }} onClick={onDelete}>
              Delete column
            </button>
          </>
        )}
      </span>
    </>
  );
}
