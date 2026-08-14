// #MobileShell
// The persistent bottom action bar: five borderless, white icons over a dark
// bar (Menu · Undo · History · Type · Speak). In light theme the bar is the
// Aubergine ink; in dark theme `t.ink` is near-white, so the bar drops to a
// fixed near-black. Every dock button is disabled (dimmed, inert) until a
// table is loaded.
import type { ReactNode } from 'react';
import { typography, type Theme } from '@tamedtable/ui-kit';
import { Icon, type IconName } from '@tamedtable/ui-kit/components';

export interface DockAction {
  key: string;
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled: boolean;
  /** DOM id (the tour spotlight targets the Menu button as the open control). */
  id?: string;
}

function DockButton({ a, fg }: { a: DockAction; fg: string }): ReactNode {
  return (
    <button
      type="button"
      id={a.id}
      title={a.label}
      data-mob-dock={a.key}
      disabled={a.disabled}
      onClick={() => { if (!a.disabled) a.onClick(); }}
      style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        width: 58,
        height: 66,
        background: 'transparent',
        border: 'none',
        color: fg,
        cursor: a.disabled ? 'default' : 'pointer',
        opacity: a.disabled ? 0.34 : 1,
        transition: 'opacity .12s',
      }}
    >
      <Icon name={a.icon} size={28} strokeWidth={1.15} />
      <span style={{ fontFamily: typography.ui, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.2, lineHeight: 1 }}>
        {a.label}
      </span>
    </button>
  );
}

export function Dock({ t, actions }: { t: Theme; actions: DockAction[] }): ReactNode {
  return (
    <div
      data-mob-dock=""
      style={{
        flex: '0 0 auto',
        height: 80,
        // Clear the iOS home indicator / Safari toolbar so the dock isn't cramped.
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: t.dockBg,
        borderTop: `1px solid ${t.dockBorder}`,
      }}
    >
      {actions.map((a) => (
        <DockButton key={a.key} a={a} fg={t.dockInk} />
      ))}
    </div>
  );
}
