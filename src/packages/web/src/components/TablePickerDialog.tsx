// #TablePick
// The table picker (spec/behavior.md § Opening a workbook or a web page): a
// workbook or page with several tables parks its bytes and asks which one to
// load. One radio row per candidate (name, location, row count, columns), the
// first preselected; Load continues the load, Cancel / Escape / backdrop
// leaves the app as it was.
import { useEffect, useState, type ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useIsMobile } from '../hooks/useIsMobile.ts';
import { Overlay, cardStyle } from './Modal.tsx';

export function TablePickerDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const isMobile = useIsMobile();
  const dialog = controller.tablePickerDialog;
  const [selected, setSelected] = useState(1);

  // A fresh picker starts on its first row.
  useEffect(() => {
    if (dialog) setSelected(dialog.candidates[0]?.index ?? 1);
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') controller.dismissTablePicker();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, controller]);

  if (!dialog) return null;

  return (
    <Overlay isMobile={isMobile} onBackdrop={() => controller.dismissTablePicker()}>
      <div data-tt-tablepicker-dialog="" role="dialog" onClick={(e) => e.stopPropagation()} style={cardStyle(t, isMobile)}>
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.md, fontWeight: 600, color: t.ink }}>
          Which table?
        </div>
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink2, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
          {dialog.name} holds {dialog.candidates.length} tables.
        </div>
        <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: space.px8, maxHeight: '50vh', overflowY: 'auto' }}>
          {dialog.candidates.map((c) => {
            const active = c.index === selected;
            return (
              <label
                key={c.index}
                data-tt-table-option={c.index}
                style={{
                  display: 'flex',
                  gap: space.px8,
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  borderRadius: space.radius,
                  border: `1px solid ${active ? t.accent : t.line2}`,
                  background: active ? t.surface2 : t.surface,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="tt-table-pick"
                  checked={active}
                  onChange={() => setSelected(c.index)}
                  style={{ marginTop: 3 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <div style={{ fontFamily: typography.ui, fontSize: typography.size.sm, fontWeight: 600, color: t.ink }}>
                    {c.name}
                    <span style={{ fontWeight: 400, color: t.ink3 }}> · {c.location} · {c.rowCount.toLocaleString()} rows</span>
                  </div>
                  <div
                    style={{
                      fontFamily: typography.mono,
                      fontSize: typography.size.xs,
                      color: t.ink2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={c.columns.join(', ')}
                  >
                    {c.columns.join(', ')}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: space.px8 }}>
          <Button variant="chrome" data-tt-tablepicker-cancel="" onClick={() => controller.dismissTablePicker()}>
            Cancel
          </Button>
          <Button variant="primary" data-tt-tablepicker-load="" onClick={() => void controller.pickTable(selected)}>
            Load
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
