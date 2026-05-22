import { useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography } from '../theme.ts';
import type { Theme } from '../theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../useController.ts';
import { useTheme } from '../useTheme.tsx';
import { Button } from './Button.tsx';
import { Icon } from './Icons.tsx';

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
            Open a CSV or JSONL file to begin, then describe changes in the chat.
          </div>
        </div>
        <Button variant="primary" onClick={() => void controller.openCsv()}>
          <Icon name="folder" />
          Open file…
        </Button>
      </div>
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
  const rows = controller.displayRows();

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
    <div style={{ flex: 1, overflow: 'auto', background: t.surface, minWidth: 0 }}>
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
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td
                style={{
                  ...bodyCell,
                  color: t.ink4,
                  textAlign: 'right',
                  background: t.surface2,
                }}
              >
                {ri + 1}
              </td>
              {columns.map((col) => {
                const isEditing = editing?.row === ri && editing.col === col;
                return (
                  <td
                    key={col}
                    title="Double-click to edit"
                    onDoubleClick={() => {
                      setEditing({ row: ri, col });
                      setDraft(cellText(row?.[col]));
                    }}
                    style={{
                      ...bodyCell,
                      padding: isEditing ? 0 : bodyCell.padding,
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
          ))}
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
  );
}
