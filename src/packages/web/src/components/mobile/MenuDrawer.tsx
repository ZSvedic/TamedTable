// #MobileShell
// The left slide-in drawer for the actions the app bar and dock don't carry:
// the dark-mode toggle, Settings, and Tours. The open and save actions live
// in the app bar's Open and Save menus (see MobileShell's BarMenus). Each item
// calls the same WebController method the desktop toolbar does, then closes
// the drawer; Settings and Tours hand off to the shared overlays.
import { useState, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { Icon, type IconName } from '@tamedtable/ui-kit/components';
import { Lockup } from '@tamedtable/toolbar/components';
import type { WebController } from '../../controller.ts';

function Item({
  t,
  icon,
  label,
  value,
  onClick,
}: {
  t: Theme;
  icon?: IconName;
  label: string;
  value?: string;
  onClick: () => void;
}): ReactNode {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      data-mob-menu-item={label}
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.px12,
        padding: '11px 18px',
        width: '100%',
        border: 0,
        background: hover ? t.surface3 : 'transparent',
        color: t.ink,
        cursor: 'pointer',
        fontFamily: typography.ui,
        fontSize: typography.size.base,
        textAlign: 'left',
      }}
    >
      {icon && (
        <span style={{ color: t.ink3, display: 'flex' }}>
          <Icon name={icon} size={18} />
        </span>
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {value && <span style={{ fontFamily: typography.mono, fontSize: typography.size.xs, color: t.ink3 }}>{value}</span>}
    </button>
  );
}

export function MenuDrawer({
  t,
  dark,
  controller,
  onClose,
  onToggleTheme,
}: {
  t: Theme;
  dark: boolean;
  controller: WebController;
  onClose: () => void;
  onToggleTheme: () => void;
}): ReactNode {
  const run = (fn: () => void): void => {
    onClose();
    fn();
  };
  return (
    <div style={{ display: 'contents' }}>
      {/* Fixed, not absolute: the shell flows with the document-scrolled page,
          but the drawer must cover the screen wherever the table is scrolled. */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: t.overlay, zIndex: 40 }}
      />
      <div
        data-mob-drawer=""
        className="tt-sheet"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '80%',
          maxWidth: 320,
          zIndex: 41,
          background: t.surface,
          borderRight: `1px solid ${t.line2}`,
          boxShadow: t.shadowLg,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', borderBottom: `1px solid ${t.line}` }}>
          <Lockup size={typography.size.lg} color={t.ink} dark={dark} />
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={{ background: 'transparent', border: 0, padding: 4, color: t.ink3, cursor: 'pointer', display: 'flex' }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
          <Item t={t} icon={dark ? 'sun' : 'moon'} label="Dark mode" value={dark ? 'on' : 'off'} onClick={onToggleTheme} />
          <Item t={t} icon="wrench" label="Settings…" onClick={() => run(() => controller.openSettings())} />
          <Item t={t} icon="tour" label="Tours…" onClick={() => run(() => controller.openTutorial())} />
        </div>
      </div>
    </div>
  );
}
