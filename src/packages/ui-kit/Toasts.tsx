// #UiKit
// Fixed bottom-right toast stack — pure props in, callbacks out. The host
// owns the list; each item gets a dismiss button that reports its id back.
// Each toast also fades away on its own after `toastDurationMs(message)` so a
// routine "Saved …" note never has to be clicked shut; hovering a toast pauses
// that countdown, and the dismiss button still closes one at once. The slide-in
// and fade-out animations ship inside the component so the stack looks the same
// standalone (demo page) and inside an app.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { space, toastDurationMs, typography } from './index.ts';
import { useTheme } from './ThemeProvider.tsx';
import { Icon } from './Icon.tsx';

export interface ToastItem {
  id: number;
  kind: 'error' | 'info';
  message: string;
  /** Optional inline action label (e.g. "Copy report"). Clicking it calls
   *  `onAction` with this toast's id; omit it for a plain toast. */
  action?: string;
}

/** How long the fade-out plays before the toast is removed from the list. */
const FADE_MS = 320;

const SHEET_CSS =
  '@keyframes uk-sheet-kf { from { opacity: 0; transform: translateY(6px); }' +
  ' to { opacity: 1; transform: translateY(0); } }' +
  ' .uk-sheet { animation: uk-sheet-kf 0.14s ease-out; }' +
  ` @keyframes uk-fade-kf { to { opacity: 0; transform: translateY(6px); } }` +
  ` .uk-sheet-leaving { animation: uk-fade-kf ${FADE_MS}ms ease-in forwards; }`;

export function Toasts({
  toasts,
  onDismiss,
  onAction,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
  /** Called with a toast's id when its inline `action` label is clicked. */
  onAction?: (id: number) => void;
}): ReactNode {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: space.px16,
        bottom: space.px16,
        display: 'flex',
        flexDirection: 'column',
        gap: space.px8,
        zIndex: 200,
        maxWidth: 380,
      }}
    >
      <style>{SHEET_CSS}</style>
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} onDismiss={onDismiss} onAction={onAction} />
      ))}
    </div>
  );
}

// One toast row owns its own auto-dismiss timer and fade-out state. Pulled into
// its own component so each toast can hold hooks (timer ref, leaving flag).
function ToastRow({
  toast,
  onDismiss,
  onAction,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
  onAction?: (id: number) => void;
}): ReactNode {
  const t = useTheme();
  const isError = toast.kind === 'error';
  const [leaving, setLeaving] = useState(false);
  // Both timers live in a ref so hover (pause) and unmount (cleanup) can clear
  // them without re-running the scheduling effect.
  const timers = useRef<{ dismiss: ReturnType<typeof setTimeout> | null; remove: ReturnType<typeof setTimeout> | null }>({
    dismiss: null,
    remove: null,
  });

  // Play the fade-out, then drop the toast from the host's list.
  const fadeOut = (): void => {
    setLeaving(true);
    timers.current.remove = setTimeout(() => onDismiss(toast.id), FADE_MS);
  };

  const arm = (): void => {
    if (timers.current.dismiss) clearTimeout(timers.current.dismiss);
    timers.current.dismiss = setTimeout(fadeOut, toastDurationMs(toast.message));
  };

  const pause = (): void => {
    if (timers.current.dismiss) {
      clearTimeout(timers.current.dismiss);
      timers.current.dismiss = null;
    }
  };

  // Arm the countdown once on mount; clear every timer on unmount. A row's id
  // and message never change, so a mount-only effect is correct — re-arming on
  // hover-leave is handled separately.
  useEffect(() => {
    arm();
    return () => {
      if (timers.current.dismiss) clearTimeout(timers.current.dismiss);
      if (timers.current.remove) clearTimeout(timers.current.remove);
    };
  }, []);

  return (
    <div
      className={leaving ? 'uk-sheet uk-sheet-leaving' : 'uk-sheet'}
      data-uk-toast={toast.kind}
      data-uk-toast-leaving={leaving ? '' : undefined}
      // Hovering holds the toast open (read a long message, reach an action);
      // leaving restarts the full countdown.
      onMouseEnter={pause}
      onMouseLeave={() => { if (!leaving) arm(); }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: space.px10,
        minWidth: 280,
        padding: '10px 12px',
        borderRadius: space.radius,
        background: t.surface,
        color: t.ink,
        border: `1px solid ${isError ? t.err : t.line2}`,
        borderLeft: `3px solid ${isError ? t.err : t.ok}`,
        boxShadow: t.shadowLg,
        fontFamily: typography.ui,
        fontSize: typography.size.sm,
        lineHeight: 1.5,
      }}
    >
      <span style={{ flex: '0 0 auto', marginTop: 1, color: isError ? t.err : t.ok }}>
        <Icon name={isError ? 'err' : 'ok'} />
      </span>
      <div style={{ flex: 1 }}>{toast.message}</div>
      {toast.action && onAction && (
        <button
          type="button"
          data-uk-toast-action=""
          onClick={() => onAction(toast.id)}
          style={{
            flex: '0 0 auto',
            background: 'transparent',
            border: 0,
            padding: space.px2,
            cursor: 'pointer',
            color: t.accent,
            fontFamily: typography.ui,
            fontSize: typography.size.sm,
            fontWeight: 600,
            textDecoration: 'underline',
          }}
        >
          {toast.action}
        </button>
      )}
      <button
        type="button"
        data-uk-toast-dismiss=""
        onClick={() => onDismiss(toast.id)}
        title="Dismiss"
        style={{
          background: 'transparent',
          border: 0,
          padding: space.px2,
          cursor: 'pointer',
          color: t.ink3,
          display: 'flex',
        }}
      >
        <Icon name="x" size={12} />
      </button>
    </div>
  );
}
