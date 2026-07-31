// #FileIO
// The replace-table confirmation (spec/behavior.md § Web UI): a file dropped
// with a table loaded never replaces it silently — this dialog names the
// dropped file and warns the current table and its steps would be discarded.
// Confirming loads the stashed bytes; the button, Escape, or the backdrop
// cancels and leaves everything untouched.
import { useEffect, type ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useIsMobile } from '../hooks/useIsMobile.ts';

export function ReplaceDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const isMobile = useIsMobile();
  const dialog = controller.replaceDialog;

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') controller.dismissReplaceDrop();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, controller]);

  if (!dialog) return null;

  const current = (controller.sourcePath || '').split('/').pop() || 'the current table';
  return (
    <div
      onClick={() => controller.dismissReplaceDrop()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        background: t.overlay,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
      }}
    >
      <div
        data-tt-replace-dialog=""
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? undefined : 420,
          width: '100%',
          background: t.surface,
          border: `1px solid ${t.line2}`,
          borderRadius: isMobile ? `${space.radius}px ${space.radius}px 0 0` : space.radius,
          boxShadow: t.shadowLg,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: space.px12,
        }}
      >
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.md, fontWeight: 600, color: t.ink }}>
          Replace the current table?
        </div>
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink2, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
          Loading {dialog.name} discards {current} and its steps.
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: space.px8 }}>
          <Button variant="chrome" data-tt-replace-cancel="" onClick={() => controller.dismissReplaceDrop()}>
            Cancel
          </Button>
          <Button variant="primary" data-tt-replace-confirm="" onClick={() => void controller.confirmReplaceDrop()}>
            Replace &amp; load
          </Button>
        </div>
      </div>
    </div>
  );
}
