import type { ReactNode } from 'react';
import { theme } from '../theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../useController.ts';

export function Toasts({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  if (controller.toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: theme.space.lg,
        bottom: theme.space.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.space.sm,
        zIndex: 200,
        maxWidth: '380px',
      }}
    >
      {controller.toasts.map((toast) => {
        const isError = toast.kind === 'error';
        return (
          <div
            key={toast.id}
            onClick={() => controller.dismissToast(toast.id)}
            title="Dismiss"
            style={{
              cursor: 'pointer',
              padding: `${theme.space.sm} ${theme.space.md}`,
              borderRadius: theme.radius.md,
              background: isError ? theme.color.errorBg : theme.color.infoBg,
              border: `1px solid ${isError ? theme.color.error : theme.color.info}`,
              color: isError ? theme.color.error : theme.color.info,
              fontSize: theme.font.size.md,
              boxShadow: `0 6px 20px ${theme.color.shadow}`,
            }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
