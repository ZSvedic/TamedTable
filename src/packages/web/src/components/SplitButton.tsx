import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography } from '../theme.ts';
import { useTheme } from '../useTheme.tsx';
import { Icon } from './Icons.tsx';

interface MenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface SplitButtonProps {
  /** Main label rendered on the primary part. */
  children: ReactNode;
  /** Primary click — same role as a normal Button onClick. */
  onClick: () => void;
  /** Items shown when the caret half is clicked. */
  menu: MenuItem[];
  disabled?: boolean;
  /** Tooltip for the primary half. */
  title?: string;
  /** Tooltip for the caret half. */
  caretTitle?: string;
}

// A split / dropdown button: a primary action on the left and a caret on
// the right that reveals a small menu of secondary actions. Both halves
// share one outer rounded shell with a divider between them so the pair
// reads as a single toolbar control.
export function SplitButton({
  children,
  onClick,
  menu,
  disabled,
  title,
  caretTitle,
}: SplitButtonProps): ReactNode {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [hoverMain, setHoverMain] = useState(false);
  const [hoverCaret, setHoverCaret] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on click-outside or Escape — the menu is a transient, weightless
  // surface, not a modal.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const baseHalf: CSSProperties = {
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.px6,
    background: 'transparent',
    color: t.ink2,
    border: 0,
    fontFamily: typography.ui,
    fontSize: typography.size.sm,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background .12s, color .12s',
  };

  const mainStyle: CSSProperties = {
    ...baseHalf,
    padding: '0 8px 0 10px',
    borderTopLeftRadius: space.radiusSm,
    borderBottomLeftRadius: space.radiusSm,
    ...(!disabled && hoverMain ? { background: t.surface3 } : {}),
  };

  const caretStyle: CSSProperties = {
    ...baseHalf,
    padding: '0 6px',
    borderTopRightRadius: space.radiusSm,
    borderBottomRightRadius: space.radiusSm,
    borderLeft: `1px solid ${t.line}`,
    ...(!disabled && (hoverCaret || open) ? { background: t.surface3 } : {}),
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        style={{
          display: 'inline-flex',
          border: `1px solid transparent`,
          borderRadius: space.radiusSm,
        }}
      >
        <button
          type="button"
          title={title}
          disabled={disabled}
          onClick={onClick}
          onMouseEnter={() => setHoverMain(true)}
          onMouseLeave={() => setHoverMain(false)}
          style={mainStyle}
        >
          {children}
        </button>
        <button
          type="button"
          title={caretTitle}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => setHoverCaret(true)}
          onMouseLeave={() => setHoverCaret(false)}
          style={caretStyle}
        >
          <Icon name="chevron" size={12} />
        </button>
      </div>
      {open && !disabled && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: '100%',
            background: t.surface,
            border: `1px solid ${t.line2}`,
            borderRadius: space.radius,
            boxShadow: t.shadow,
            padding: space.px4,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            zIndex: 50,
          }}
        >
          {menu.map((item) => (
            <MenuItemButton
              key={item.label}
              label={item.label}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                if (!item.disabled) item.onClick();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItemButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}): ReactNode {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left',
        border: 0,
        background: !disabled && hover ? t.surface3 : 'transparent',
        borderRadius: space.radiusSm,
        padding: '6px 10px',
        cursor: disabled ? 'default' : 'pointer',
        color: t.ink,
        fontFamily: typography.ui,
        fontSize: typography.size.sm,
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}
