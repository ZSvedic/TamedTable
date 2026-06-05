import { useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography } from '../lib/theme.ts';
import type { Theme } from '../lib/theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useTheme } from '../hooks/useTheme.tsx';
import { Icon } from './Icons.tsx';
import { Pagination } from './Pagination.tsx';
import { SplitButton } from './SplitButton.tsx';

function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function EmptyState({ controller, t }: { controller: WebController; t: Theme }): ReactNode {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: t.surface,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 460,
          maxWidth: '88%',
          padding: space.px24,
          borderRadius: space.radiusLg,
          border: `1.5px dashed ${t.line2}`,
          background: t.surface2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: space.px14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: space.radius,
            background: t.accentSoft,
            color: t.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="upload" size={22} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.px4 }}>
          <div
            style={{
              fontFamily: typography.ui,
              fontSize: typography.size.lg,
              fontWeight: 600,
              color: t.ink,
            }}
          >
            No file loaded
          </div>
          <div
            style={{
              fontFamily: typography.ui,
              fontSize: typography.size.sm,
              lineHeight: 1.5,
              color: t.ink2,
            }}
          >
            Open a CSV or JSONL file, paste a URL, or pick a sample to begin —
            then describe changes in the chat.
          </div>
        </div>
        <SplitButton
          onClick={() => controller.openUrlDialog()}
          title="Open from a URL or pick a sample"
          caretTitle="More open options"
          menu={[
            { label: 'Open local…', onClick: () => void controller.openCsv() },
          ]}
        >
          <Icon name="folder" />
          Open URL or sample…
        </SplitButton>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<'idle' | 'running' | 'saved', string> = {
  idle: 'Idle',
  running: 'Running',
  saved: 'Saved',
};

function StatusFooter({ controller, t }: { controller: WebController; t: Theme }): ReactNode {
  const status = controller.activityStatus();
  const sel = controller.selection;
  const dotColor = status === 'running' ? t.accent : status === 'saved' ? t.ok : t.ink4;

  return (
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
      <span style={{ color: sel ? t.ink2 : t.ink4 }}>
        {sel ? `R${sel.row + 1} · ${sel.column}` : 'no selection'}
      </span>
      <span style={{ color: t.ink4 }}>·</span>
      <span>UTF-8</span>
      <span style={{ flex: 1 }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: space.px6 }}>
        <span
          className={status === 'running' ? 'tt-pulse' : undefined}
          style={{ width: 6, height: 6, borderRadius: 3, background: dotColor }}
        />
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}

export function TableView({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const [editing, setEditing] = useState<{ row: number; col: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [dragCol, setDragCol] = useState<string | null>(null);

  if (!controller.isLoaded()) {
    return <EmptyState controller={controller} t={t} />;
  }

  const columns = controller.displaySpec().columns.map((c) => c.id);
  const rows = controller.pageRows();
  const selection = controller.selection;
  const pageStart = (controller.currentPage() - 1) * controller.pageSize;
  const total = controller.totalRows();
  const firstRow = total === 0 ? 0 : pageStart + 1;
  const lastRow = Math.min(pageStart + controller.pageSize, total);

  const commitEdit = (): void => {
    if (!editing) return;
    const { row, col } = editing;
    setEditing(null);
    void controller.editCell(row, col, draft);
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
    void controller.reorderColumns(order);
  };

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
  };

  const bodyCell: CSSProperties = {
    padding: `0 ${space.px10}px`,
    height: space.rowH,
    borderBottom: `1px solid ${t.line}`,
    borderRight: `1px solid ${t.line}`,
    color: t.ink,
    maxWidth: 320,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      id="tutorial-table-view"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        background: t.surface,
      }}
    >
      <div style={{ flex: 1, overflow: 'auto' }}>
        {controller.streaming && (
          <div
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
              className="tt-pulse"
              style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }}
            />
            Streaming results…
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
                  className="tt-th"
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
                    <span className="tt-grip" style={{ color: t.ink4 }}>
                      <Icon name="grip" size={12} />
                    </span>
                    {col}
                  </span>
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
                        title="Click to select · double-click to edit"
                        onClick={() => controller.selectCell(absRow, col)}
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
          style={{
            fontFamily: typography.mono,
            fontSize: typography.size.xs,
            color: t.ink3,
          }}
        >
          <span style={{ color: t.ink2 }}>
            {firstRow}–{lastRow}
          </span>{' '}
          of {total} rows
        </span>
        <span style={{ flex: 1 }} />
        <Pagination controller={controller} />
      </div>

      <StatusFooter controller={controller} t={t} />
    </div>
  );
}
