// #UiKit
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography } from './index.ts';
import { useTheme } from './ThemeProvider.tsx';
import { Icon } from './Icon.tsx';

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
  /** DOM id forwarded to the root wrapper element (e.g. for Driver.js highlights). */
  id?: string;
}

// A split / dropdown button: a primary action on the left and a caret on
// the right that reveals a small menu of secondary actions. The two halves
// share one rounded shell and a single hover tint, so the pair reads as
// one unified toolbar control — no internal divider.
export function SplitButton({
  children,
  onClick,
  menu,
  disabled,
  title,
  caretTitle,
  id,
}: SplitButtonProps): ReactNode {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
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

  const tinted = !disabled && (hover || open);

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
  };

  const mainStyle: CSSProperties = {
    ...baseHalf,
    padding: '0 4px 0 10px',
    borderTopLeftRadius: space.radiusSm,
    borderBottomLeftRadius: space.radiusSm,
  };

  const caretStyle: CSSProperties = {
    ...baseHalf,
    padding: '0 6px 0 2px',
    color: t.ink3,
    borderTopRightRadius: space.radiusSm,
    borderBottomRightRadius: space.radiusSm,
  };

  return (
    <div
      ref={rootRef}
      id={id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: space.radiusSm,
          background: tinted ? t.surface3 : 'transparent',
          transition: 'background .12s',
        }}
      >
        <button
          type="button"
          data-uk-split-main=""
          title={title}
          disabled={disabled}
          onClick={onClick}
          style={mainStyle}
        >
          {children}
        </button>
        <button
          type="button"
          data-uk-split-caret=""
          title={caretTitle}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
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
      data-uk-menu-item={label}
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
