// #LookupJoin
// The "this join needs its second file" modal — one fixed wording, whether
// the join names a file (the browser has no working directory to read it
// from) or names none (`with: null`; the picked file's name is written into
// the step). The run pauses here and asks. The picker opens from this dialog's own click: a typed request's
// click is long spent by the time the model answers, and a browser only opens
// a picker from a fresh one (the same reason the post-run save asks again).
// Cancel drops the step whole. See spec/behavior.md § Web UI.
import type { ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useIsMobile } from '../hooks/useIsMobile.ts';

export function LookupDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const isMobile = useIsMobile();
  const dialog = controller.lookupDialog;
  if (!dialog) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: t.overlay,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
      }}
    >
      <div
        data-tt-lookup-dialog=""
        role="dialog"
        style={{
          maxWidth: isMobile ? '100%' : 440,
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
          This join needs another file
        </div>
        <div style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink2, lineHeight: 1.5 }}>
          Pick the file with the rows the join should match against.
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: space.px8 }}>
          <Button variant="chrome" data-tt-lookup-cancel="" onClick={() => controller.dismissLookupDialog()}>
            Cancel
          </Button>
          <Button variant="primary" data-tt-lookup-choose="" onClick={() => void controller.chooseLookupFile()}>
            Choose file…
          </Button>
        </div>
      </div>
    </div>
  );
}
