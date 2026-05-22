import type { ReactNode } from 'react';
import { space, typography } from '../theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../useController.ts';
import { useTheme } from '../useTheme.tsx';
import { Icon } from './Icons.tsx';

export function Toasts({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  if (controller.toasts.length === 0) return null;

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
      {controller.toasts.map((toast) => {
        const isError = toast.kind === 'error';
        return (
          <div
            key={toast.id}
            className="tt-sheet"
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
            <button
              type="button"
              onClick={() => controller.dismissToast(toast.id)}
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
