// #MobileShell
// The left slide-in drawer that holds every toolbar action the app bar can't:
// the open sources, the save targets, the dark-mode toggle, Settings, and
// Tours. Each item calls the same WebController method the desktop toolbar
// does, then closes the drawer; Settings, Open-URL, and Tours hand off to the
// shared overlays. Save targets are disabled until a table is loaded.
import { useState, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { Icon, type IconName } from '@tamedtable/ui-kit/components';
import { Lockup } from '@tamedtable/toolbar/components';
import type { FormatId } from '@tamedtable/file-io';
import type { WebController } from '../../controller.ts';

const SAVE_FORMATS: { id: FormatId; label: string }[] = [
  { id: 'csv', label: 'CSV' },
  { id: 'jsonl', label: 'JSONL' },
  { id: 'parquet', label: 'Parquet' },
  { id: 'arrow', label: 'Arrow' },
];

function Item({
  t,
  icon,
  label,
  value,
  disabled,
  indent,
  onClick,
}: {
  t: Theme;
  icon?: IconName;
  label: string;
  value?: string;
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
        padding: indent ? `9px 18px 9px 46px` : '11px 18px',
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
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const loaded = controller.isLoaded();
  const busy = controller.streaming;
  const sep = <div style={{ height: 1, background: t.line, margin: '7px 0' }} />;
  const run = (fn: () => void): void => {
    onClose();
    fn();
  };
  return (
    <div style={{ display: 'contents' }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: t.overlay, zIndex: 40 }}
      />
      <div
        data-mob-drawer=""
        className="tt-sheet"
        style={{
          position: 'absolute',
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
          <Item t={t} icon="sparkle" label="Open sample…" onClick={() => run(() => controller.openSampleDialog())} />
          <Item t={t} icon="folder" label="Open local…" onClick={() => run(() => void controller.openCsv())} />
          <Item t={t} icon="link" label="Open URL…" onClick={() => run(() => controller.openUrlDialog())} />
          {sep}
          <Item t={t} icon="save" label="Save data" disabled={!loaded || busy} onClick={() => run(() => void controller.saveData())} />
          <Item
            t={t}
            icon="save"
            label="Save data as…"
            disabled={!loaded || busy}
            value={saveAsOpen ? '▾' : '▸'}
            onClick={() => setSaveAsOpen((o) => !o)}
          />
          {saveAsOpen &&
            SAVE_FORMATS.map((f) => (
              <Item
                key={f.id}
                t={t}
                indent
                label={`Save as ${f.label}…`}
                disabled={!loaded || busy}
                onClick={() => run(() => void controller.saveDataAs(f.id))}
              />
            ))}
          {sep}
          <Item t={t} icon="file" label="Save recipe…" disabled={!loaded || busy} onClick={() => run(() => void controller.saveFlow())} />
          <Item t={t} icon="code" label="Save recipe as Python…" disabled={!loaded || busy} onClick={() => run(() => void controller.savePython())} />
          {sep}
          <Item t={t} icon={dark ? 'sun' : 'moon'} label="Dark mode" value={dark ? 'on' : 'off'} onClick={onToggleTheme} />
          <Item t={t} icon="wrench" label="Settings…" onClick={() => run(() => controller.openSettings())} />
          <Item t={t} icon="tour" label="Tours…" onClick={() => run(() => controller.openTutorial())} />
        </div>
      </div>
    </div>
  );
}
