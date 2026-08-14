// #MobileShell
// The left slide-in drawer: the phone's home for everything the dock can't
// carry. It renders the SAME menu model the desktop toolbar dropdowns use
// (openMenuSections / saveMenuSections: identical items, icons, order, and
// disabled states: DRY), expanded in full under "Open" and "Save" headings
// with separators between the groups. "Recent" expands in place. Below them:
// the dark-mode toggle, Settings, and Tours.
import { useState, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { Icon, type IconName, type MenuButtonSection } from '@tamedtable/ui-kit/components';
import { Lockup, openMenuSections, saveMenuSections } from '@tamedtable/toolbar/components';
import type { WebController } from '../../controller.ts';
import { recentMenuItems, saveMenus } from '../Toolbar.tsx';

function Item({
  t,
  icon,
  label,
  value,
  tag,
  disabled,
  indent,
  onClick,
}: {
  t: Theme;
  icon?: IconName;
  label: string;
  value?: string;
  /** Small right-aligned badge (a Recent entry's kind). */
  tag?: string;
  disabled?: boolean;
  indent?: boolean;
  onClick: () => void;
}): ReactNode {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      data-mob-menu-item={label}
      disabled={disabled}
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.px12,
        padding: indent ? '9px 18px 9px 48px' : '11px 18px',
        width: '100%',
        border: 0,
        background: hover && !disabled ? t.surface3 : 'transparent',
        color: disabled ? t.ink4 : t.ink,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: typography.ui,
        fontSize: indent ? typography.size.sm : typography.size.base,
        textAlign: 'left',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon && (
        <span style={{ color: t.ink3, display: 'flex' }}>
          <Icon name={icon} size={18} />
        </span>
      )}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {tag && (
        <span
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
      {value && <span style={{ fontFamily: typography.mono, fontSize: typography.size.xs, color: t.ink3 }}>{value}</span>}
    </button>
  );
}

/** One drawer group: the desktop dropdown's sections flattened into the
 *  drawer: separators between sections (their small Data/Recipe headers are
 *  dropped; the item labels carry the meaning), submenu items expanding in
 *  place with their tagged sub-entries. */
function SectionList({
  t,
  sections,
  expanded,
  onToggle,
  onPick,
}: {
  t: Theme;
  sections: MenuButtonSection[];
  expanded: string | null;
  onToggle: (label: string) => void;
  onPick: (action: () => void) => void;
}): ReactNode {
  const sep = <div style={{ height: 1, background: t.line, margin: '7px 0' }} />;
  return (
    <>
      {sections.map((section, si) => (
        <div key={si} style={{ display: 'contents' }}>
          {si > 0 && sep}
          {section.items.map((item) => (
            <div key={item.label} style={{ display: 'contents' }}>
              <Item
                t={t}
                icon={item.icon}
                label={item.label}
                disabled={item.disabled}
                value={item.submenu ? (expanded === item.label ? '▾' : '▸') : undefined}
                onClick={() => {
                  if (item.submenu) onToggle(item.label);
                  else if (item.onClick) onPick(item.onClick);
                }}
              />
              {item.submenu &&
                expanded === item.label &&
                item.submenu.map((sub) => (
                  <Item
                    key={`${sub.label} ${sub.tag ?? ''}`}
                    t={t}
                    indent
                    label={sub.label}
                    tag={sub.tag}
                    onClick={() => onPick(sub.onClick)}
                  />
                ))}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function GroupHeading({ t, label }: { t: Theme; label: string }): ReactNode {
  return (
    <div
      style={{
        fontFamily: typography.ui,
        fontSize: typography.size.xs,
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: t.ink3,
        padding: '10px 18px 4px',
      }}
    >
      {label}
    </div>
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const loaded = controller.isLoaded();
  const busy = controller.streaming;
  const sep = <div style={{ height: 1, background: t.line, margin: '7px 0' }} />;
  const run = (fn: () => void): void => {
    onClose();
    fn();
  };

  const openSections = openMenuSections({
    onOpenSample: () => controller.openSampleDialog(),
    onOpenLocal: () => void controller.openCsv(),
    onOpenUrl: () => controller.openUrlDialog(),
    onOpenFlow: () => void controller.openFlow(),
    recentMenu: recentMenuItems(controller),
    loaded,
  });
  // The desktop Save button disables whole; the drawer disables per item.
  const saveSections = saveMenuSections(saveMenus(controller)).map((s) => ({
    ...s,
    items: s.items.map((item) => ({ ...item, disabled: !loaded || busy })),
  }));

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
        <div style={{ padding: '0 0 8px', display: 'flex', flexDirection: 'column' }}>
          <GroupHeading t={t} label="Open" />
          <SectionList
            t={t}
            sections={openSections}
            expanded={expanded}
            onToggle={(label) => setExpanded((e) => (e === label ? null : label))}
            onPick={run}
          />
          {sep}
          <GroupHeading t={t} label="Save" />
          <SectionList t={t} sections={saveSections} expanded={expanded} onToggle={() => {}} onPick={run} />
          {sep}
          <Item t={t} icon={dark ? 'sun' : 'moon'} label="Dark mode" value={dark ? 'on' : 'off'} onClick={onToggleTheme} />
          <Item t={t} icon="wrench" label="Settings…" onClick={() => run(() => controller.openSettings())} />
          <Item t={t} icon="tour" label="Tours…" onClick={() => run(() => controller.openTutorial())} />
        </div>
      </div>
    </div>
  );
}
