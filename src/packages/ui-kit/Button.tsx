// #UiKit
import { useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography } from './index.ts';
import { useTheme } from './ThemeProvider.tsx';

type Variant = 'ghost' | 'chrome' | 'primary' | 'danger';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  title?: string;
}

// Primary is Ink (Aubergine) — the Pale Sky accent is reserved for the mark
// and focus rings, never a button fill.
export function Button({
  children,
  onClick,
  disabled,
  variant = 'ghost',
  title,
}: ButtonProps): ReactNode {
  const t = useTheme();
  const [hover, setHover] = useState(false);

  const base: CSSProperties = {
    height: 28,
    padding: '0 10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.px6,
    border: '1px solid transparent',
    borderRadius: space.radiusSm,
    background: 'transparent',
    color: t.ink2,
    fontFamily: typography.ui,
    fontSize: typography.size.sm,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background .12s, color .12s, border-color .12s',
  };

  const variants: Record<Variant, CSSProperties> = {
    ghost: {},
    chrome: { color: t.ink, borderColor: t.line },
    primary: { background: t.ink, color: t.inkOnInk, borderColor: t.ink, fontWeight: 600 },
    danger: { color: t.err, borderColor: t.line },
  };

  const hoverFill =
    !disabled && hover && (variant === 'ghost' || variant === 'chrome')
      ? { background: t.surface3 }
      : !disabled && hover && variant === 'primary'
        ? { background: t.ink2, borderColor: t.ink2 }
        : !disabled && hover && variant === 'danger'
          ? { background: t.errSoft }
          : {};

  return (
    <button
      type="button"
      data-uk-button={variant}
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...variants[variant], ...hoverFill }}
    >
      {children}
    </button>
  );
}
