// #SaveGate
// The modal chrome every app dialog shares — a dimmed overlay, a card that
// becomes a bottom sheet on the phone — plus GateDialog, the one dialog shape
// used wherever the app has to collect a *fresh* click before it may call a
// browser API that only opens from a user gesture (a file picker).
//
// Three flows need that click, and all three render through GateDialog:
//   - Save after a run on all rows (#LazyExec) — the run spent the click.
//   - Save recipe as Python (#PyExport) — the model call spent the click.
//   - The lookup-file dialog (#LookupJoin) — the chat request spent the click.
// See spec/behavior.md § The save gate.
import type { CSSProperties, ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button } from '@tamedtable/ui-kit/components';

export function Overlay({
  isMobile,
  children,
  onBackdrop,
}: {
  isMobile: boolean;
  children: ReactNode;
  onBackdrop?: () => void;
}): ReactNode {
  const t = useTheme();
  return (
    <div
      onClick={onBackdrop}
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
      {children}
    </div>
  );
}

export function cardStyle(t: ReturnType<typeof useTheme>, isMobile: boolean): CSSProperties {
  return {
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
  };
}

export function DialogTitle({ children }: { children: ReactNode }): ReactNode {
  const t = useTheme();
  return (
    <div style={{ fontFamily: typography.ui, fontSize: typography.size.md, fontWeight: 600, color: t.ink }}>
      {children}
    </div>
  );
}

export function DialogBody({ children }: { children: ReactNode }): ReactNode {
  const t = useTheme();
  return (
    <div style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink2, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

export function DialogButtons({ isMobile, children }: { isMobile: boolean; children: ReactNode }): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        justifyContent: 'flex-end',
        gap: space.px8,
      }}
    >
      {children}
    </div>
  );
}

/** A waiting bar for work with no countable units — one model call has no
 *  `done / total`, so the stripe sweeps instead of filling. The run-on-all
 *  dialog keeps its own determinate bar: it does have rows to count. */
export function WaitingBar(): ReactNode {
  const t = useTheme();
  return (
    <div
      data-tt-waiting-bar=""
      role="progressbar"
      aria-label="Working"
      style={{ height: 6, borderRadius: 3, background: t.line, overflow: 'hidden' }}
    >
      <style>{'@keyframes tt-waiting{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
      <div
        style={{
          height: '100%',
          width: '33%',
          borderRadius: 3,
          background: t.accent,
          animation: 'tt-waiting 1.1s ease-in-out infinite',
        }}
      />
    </div>
  );
}

/** The shared "work first, then your click" dialog. `busy` holds the confirm
 *  button until the work lands — the click that enables is the gesture the
 *  picker opens from, so it must never fire early. Cancel stays live: waiting
 *  is not a trap. */
export function GateDialog({
  testId,
  isMobile,
  title,
  body,
  busy = false,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  testId: string;
  isMobile: boolean;
  title: string;
  body: string;
  busy?: boolean;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactNode {
  const t = useTheme();
  return (
    <Overlay isMobile={isMobile}>
      <div
        {...{ [`data-tt-${testId}-dialog`]: '' }}
        role="dialog"
        aria-busy={busy || undefined}
        onClick={(e) => e.stopPropagation()}
        style={cardStyle(t, isMobile)}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogBody>{body}</DialogBody>
        {busy && <WaitingBar />}
        <DialogButtons isMobile={isMobile}>
          {/* ui-kit's Button renders only the props it declares, so the test
              hooks ride on `display: contents` spans — in the DOM for a
              selector, invisible to layout. */}
          <span {...{ [`data-tt-${testId}-cancel`]: '' }} style={{ display: 'contents' }}>
            <Button variant="chrome" onClick={onCancel}>
              {cancelLabel}
            </Button>
          </span>
          <span {...{ [`data-tt-${testId}-confirm`]: '' }} style={{ display: 'contents' }}>
            <Button variant="primary" disabled={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </span>
        </DialogButtons>
      </div>
    </Overlay>
  );
}
