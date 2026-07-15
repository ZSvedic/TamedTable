// #UiKit
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography } from './index.ts';
import { useTheme } from './ThemeProvider.tsx';
import { Icon, type IconName } from './Icon.tsx';

/** A sub-entry of a submenu item (e.g. one recent file). */
export interface MenuButtonSubItem {
  label: string;
  /** Small right-aligned badge, e.g. the recent entry's kind. */
  tag?: string;
  onClick: () => void;
}

export interface MenuButtonItem {
  label: string;
  onClick?: () => void;
  /** Leading glyph. */
  icon?: IconName;
  disabled?: boolean;
  /** Sub-entries shown in a side flyout panel when the item is hovered or
   *  clicked — the menu stays open until a sub-entry (or another item) is
   *  picked. The flyout opens away from the menu's aligned edge. */
  submenu?: MenuButtonSubItem[];
}

/** One menu group: an optional small uppercase header over its items.
 *  Sections after the first draw a separator line above themselves. */
export interface MenuButtonSection {
  header?: string;
  items: MenuButtonItem[];
}

interface MenuButtonProps {
  /** Trigger content (icon and/or label); a chevron is appended. */
  children: ReactNode;
  sections: MenuButtonSection[];
  disabled?: boolean;
  /** Tooltip for the trigger. */
  title?: string;
  /** DOM id forwarded to the root wrapper element (e.g. for Driver.js highlights). */
  id?: string;
  /** Which trigger edge the menu aligns to — 'right' keeps a menu near the
   *  right screen edge (e.g. the mobile app bar) from overflowing. */
  align?: 'left' | 'right';
}

// A plain dropdown button: one trigger (no split default action) that opens
// a grouped menu of actions. Groups carry small uppercase headers and are
// divided by separator lines; an item with a submenu opens a side flyout.
export function MenuButton({
  children,
  sections,
  disabled,
  title,
  id,
  align = 'left',
}: MenuButtonProps): ReactNode {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = (): void => {
    setOpen(false);
    setExpanded(null);
  };

  // Close on click-outside or Escape — the menu is a transient, weightless
  // surface, not a modal.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const tinted = !disabled && (hover || open);

  const triggerStyle: CSSProperties = {
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.px6,
    padding: '0 6px 0 10px',
    background: tinted ? t.surface3 : 'transparent',
    color: t.ink2,
    border: 0,
    borderRadius: space.radiusSm,
    fontFamily: typography.ui,
    fontSize: typography.size.sm,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background .12s',
  };

  return (
    <div ref={rootRef} id={id} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        data-uk-menubtn=""
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={triggerStyle}
      >
        {children}
        <span style={{ color: t.ink3, display: 'inline-flex' }}>
          <Icon name="chevron" size={12} />
        </span>
      </button>
      {open && !disabled && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            [align === 'right' ? 'right' : 'left']: 0,
            marginTop: 4,
            minWidth: 190,
            maxWidth: 'min(320px, 88vw)',
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
          {sections.map((section, si) => (
            <div key={si} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {si > 0 && (
                <div style={{ height: 1, background: t.line, margin: `${space.px4}px 2px` }} />
              )}
              {section.header && (
                <div
                  data-uk-menu-header={section.header}
                  style={{
                    fontFamily: typography.ui,
                    fontSize: typography.size.xs,
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: t.ink3,
                    padding: '4px 10px 2px',
                  }}
                >
                  {section.header}
                </div>
              )}
              {section.items.map((item) => (
                <div
                  key={item.label}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => {
                    if (item.submenu && !item.disabled) setExpanded(item.label);
                  }}
                  onMouseLeave={() => {
                    if (item.submenu) setExpanded((e) => (e === item.label ? null : e));
                  }}
                >
                  <MenuRow
                    label={item.label}
                    icon={item.icon}
                    disabled={item.disabled}
                    trailing={
                      item.submenu ? (
                        // A "›" pointing where the flyout opens.
                        <span
                          style={{
                            color: t.ink3,
                            display: 'inline-flex',
                            transform: align === 'right' ? 'rotate(90deg)' : 'rotate(-90deg)',
                          }}
                        >
                          <Icon name="chevron" size={11} />
                        </span>
                      ) : undefined
                    }
                    onClick={() => {
                      if (item.disabled) return;
                      if (item.submenu) {
                        // Open (never toggle): with a mouse, hover has already
                        // opened the flyout and the click must not close it;
                        // a tap opens it on touch screens.
                        setExpanded(item.label);
                        return;
                      }
                      close();
                      item.onClick?.();
                    }}
                  />
                  {item.submenu && expanded === item.label && (
                    <div
                      role="menu"
                      style={{
                        position: 'absolute',
                        top: -space.px4,
                        // Flyout away from the menu's aligned edge, overlapping
                        // it slightly so the pointer can travel without a gap.
                        [align === 'right' ? 'right' : 'left']: 'calc(100% - 4px)',
                        minWidth: 180,
                        maxWidth: 'min(280px, 70vw)',
                        background: t.surface,
                        border: `1px solid ${t.line2}`,
                        borderRadius: space.radius,
                        boxShadow: t.shadow,
                        padding: space.px4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        zIndex: 51,
                      }}
                    >
                      {item.submenu.map((sub) => (
                        <MenuRow
                          key={`${sub.label} ${sub.tag ?? ''}`}
                          label={sub.label}
                          tag={sub.tag}
                          onClick={() => {
                            close();
                            sub.onClick();
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuRow({
  label,
  icon,
  tag,
  trailing,
  disabled,
  onClick,
}: {
  label: string;
  icon?: IconName;
  tag?: string;
  trailing?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
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
        display: 'flex',
        alignItems: 'center',
        gap: space.px8,
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
      {icon && (
        <span style={{ color: t.ink3, display: 'inline-flex' }}>
          <Icon name={icon} size={14} />
        </span>
      )}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {tag && (
        <span
          data-uk-menu-tag=""
          style={{
            fontFamily: typography.ui,
            fontSize: typography.size.xs,
            color: t.ink3,
            background: t.surface3,
            borderRadius: 4,
            padding: '1px 6px',
          }}
        >
          {tag}
        </span>
      )}
      {trailing}
    </button>
  );
}
