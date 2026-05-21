import type { CSSProperties, ReactNode } from 'react';
import { theme } from '../theme.ts';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  title?: string;
}

export function Button({ children, onClick, disabled, variant = 'default', title }: ButtonProps): ReactNode {
  const background =
    variant === 'primary'
      ? theme.color.accent
      : variant === 'danger'
        ? theme.color.error
        : theme.color.surfaceAlt;
  const style: CSSProperties = {
    fontFamily: theme.font.sans,
    fontSize: theme.font.size.md,
    lineHeight: 1.4,
    padding: `${theme.space.sm} ${theme.space.md}`,
    borderRadius: theme.radius.sm,
    border: `1px solid ${theme.color.border}`,
    background,
    color: variant === 'default' ? theme.color.text : theme.color.accentText,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    whiteSpace: 'nowrap',
  };
  return (
    <button type="button" style={style} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}
