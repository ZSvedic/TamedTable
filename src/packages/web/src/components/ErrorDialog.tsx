// #FileIO
// The modal error dialog — for failures a fading toast could miss (the flow
// error dialog). A fixed overlay with a centered card, identical on desktop
// and phone; OK, Escape, or the backdrop dismisses it.
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

export function ErrorDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const message = controller.errorDialog;

  useEffect(() => {
    if (message === null) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') controller.dismissErrorDialog();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [message, controller]);

  if (message === null) return null;

  return (
    <div
      onClick={() => controller.dismissErrorDialog()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: t.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        data-tt-error-dialog=""
        role="alertdialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 440,
          width: '100%',
          background: t.surface,
          border: `1px solid ${t.line2}`,
          borderRadius: space.radius,
          boxShadow: t.shadowLg,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: space.px12,
        }}
      >
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.md, fontWeight: 600, color: t.err }}>
          Could not run
        </div>
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink2, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={() => controller.dismissErrorDialog()}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
