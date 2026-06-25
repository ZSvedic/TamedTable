// #UiKit
// Fixed bottom-right toast stack — pure props in, callbacks out. The host
// owns the list; each item gets a dismiss button that reports its id back.
// The slide-in animation ships inside the component so the stack looks the
// same standalone (demo page) and inside an app.

import type { ReactNode } from 'react';
import { space, typography } from './index.ts';
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

const SHEET_CSS =
  '@keyframes uk-sheet-kf { from { opacity: 0; transform: translateY(6px); }' +
  ' to { opacity: 1; transform: translateY(0); } }' +
  ' .uk-sheet { animation: uk-sheet-kf 0.14s ease-out; }';

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
  const t = useTheme();
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
      {toasts.map((toast) => {
        const isError = toast.kind === 'error';
        return (
          <div
            key={toast.id}
            className="uk-sheet"
            data-uk-toast={toast.kind}
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
      })}
    </div>
  );
}
