import { useState, type CSSProperties, type ReactNode } from 'react';
import { theme } from '../theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../useController.ts';

function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

const headerCell: CSSProperties = {
  position: 'sticky',
  top: 0,
  background: theme.color.headerBg,
  color: theme.color.text,
  textAlign: 'left',
  padding: `${theme.space.sm} ${theme.space.md}`,
  borderBottom: `2px solid ${theme.color.border}`,
  borderRight: `1px solid ${theme.color.border}`,
  cursor: 'grab',
  userSelect: 'none',
  fontWeight: 600,
};

const bodyCell: CSSProperties = {
  padding: `${theme.space.xs} ${theme.space.md}`,
  borderBottom: `1px solid ${theme.color.border}`,
  borderRight: `1px solid ${theme.color.border}`,
  color: theme.color.text,
  maxWidth: '320px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export function TableView({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const [editing, setEditing] = useState<{ row: number; col: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [dragCol, setDragCol] = useState<string | null>(null);

  if (!controller.isLoaded()) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.color.textDim,
          fontSize: theme.font.size.lg,
        }}
      >
        No file loaded — use “Open file” to load a CSV or JSONL.
      </div>
    );
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

  return (
    <div style={{ flex: 1, overflow: 'auto', background: theme.color.bg }}>
      {controller.streaming && (
        <div
          style={{
            padding: `${theme.space.xs} ${theme.space.md}`,
            background: theme.color.streaming,
            color: theme.color.text,
            fontSize: theme.font.size.sm,
          }}
        >
          Streaming results…
        </div>
      )}
      <table
        style={{
          borderCollapse: 'collapse',
          fontFamily: theme.font.mono,
          fontSize: theme.font.size.md,
        }}
      >
        <thead>
          <tr>
            <th style={{ ...headerCell, cursor: 'default', color: theme.color.textDim }}>#</th>
            {columns.map((col) => (
              <th
                key={col}
                draggable
                onDragStart={() => setDragCol(col)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(col)}
                style={{
                  ...headerCell,
                  background: dragCol === col ? theme.color.accentDim : theme.color.headerBg,
                }}
                title="Drag to reorder"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td style={{ ...bodyCell, color: theme.color.textDim, textAlign: 'right' }}>{ri + 1}</td>
              {columns.map((col) => {
                const isEditing = editing?.row === ri && editing.col === col;
                return (
                  <td
                    key={col}
                    style={{ ...bodyCell, background: isEditing ? theme.color.cellEdit : undefined }}
                    title="Double-click to edit"
                    onDoubleClick={() => {
                      setEditing({ row: ri, col });
                      setDraft(cellText(row?.[col]));
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
                          fontFamily: theme.font.mono,
                          fontSize: theme.font.size.md,
                          background: theme.color.bg,
                          color: theme.color.text,
                          border: `1px solid ${theme.color.accent}`,
                          borderRadius: theme.radius.sm,
                          padding: '2px 4px',
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
        <div style={{ padding: theme.space.lg, color: theme.color.textDim }}>
          This table has 0 rows.
        </div>
      )}
    </div>
  );
}
