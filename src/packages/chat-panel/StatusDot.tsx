// #ChatPanel
// The step-state marker the assistant replies use: a solid ok dot for an
// applied step, a hollow circle for an undone one, a solid accent dot for an
// answer that changed nothing (#Analyze). Exported so a host shows
// the same visual language wherever step state appears (the app's mobile
// History sheet) instead of inventing a second icon logic.
import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '@tamedtable/ui-kit/components';

export function StatusDot({
  state,
  size = 6,
  style,
}: {
  state: 'ok' | 'undone' | 'answer';
  /** Dot diameter in px (the hollow ring draws its border outside it). */
  size?: number;
  /** Positioning overrides from the call site (margins, alignment). */
  style?: CSSProperties;
}): ReactNode {
  const t = useTheme();
  const base: CSSProperties = {
    flex: '0 0 auto',
    display: 'inline-block',
    width: size,
    height: size,
    borderRadius: size,
    ...style,
  };
  return state === 'undone' ? (
    <span
      data-status-dot="undone"
      style={{ ...base, border: `1.5px solid ${t.ink3}`, boxSizing: 'content-box' }}
    />
  ) : state === 'answer' ? (
    <span data-status-dot="answer" style={{ ...base, background: t.accent }} />
  ) : (
    <span data-status-dot="ok" style={{ ...base, background: t.ok }} />
  );
}
