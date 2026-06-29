// #WebUI #MobileShell
// The phone-width (≤768px) layout: a compact app bar with a page pager, the
// table filling the screen, and a persistent bottom dock (menu · undo ·
// keyboard · voice). The menu opens a left drawer of the desktop toolbar's
// actions; keyboard/voice raise the chat panel as a bottom sheet. Everything
// drives the same WebController — only the chrome differs from the desktop
// shell. The shared overlays (settings, tutorial, dialogs, toasts) are rendered
// by App alongside this shell.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { useTheme, useThemeControls, Icon, type IconName } from '@tamedtable/ui-kit/components';
import { Mark } from '@tamedtable/toolbar/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { TableView } from './TableView.tsx';
import { ChatSidebar } from './ChatSidebar.tsx';

function IconButton({
  icon,
  onClick,
  disabled,
  title,
  solid,
  t,
  rotate,
}: {
  icon: IconName;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  solid?: boolean;
  t: Theme;
  rotate?: number;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        width: 40,
        height: 40,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: space.radius,
        border: solid ? 'none' : `1.5px solid ${t.ink3}`,
        background: solid ? t.accent : 'transparent',
        color: solid ? t.inkOnAcc : t.ink,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'opacity .12s',
      }}
    >
      <span style={{ display: 'flex', transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
        <Icon name={icon} size={20} />
      </span>
    </button>
  );
}

function MobileAppBar({ controller }: { controller: WebController }): ReactNode {
  const t = useTheme();
  const loaded = controller.isLoaded();
  const spec = controller.displaySpec();
  const fileName = spec.table ? (spec.table.split('/').pop() ?? spec.table) : null;
  const page = controller.currentPage();
  const pageCount = controller.pageCount();
  const hasPager = loaded && pageCount > 1;

  return (
    <header
      data-mb-appbar=""
      style={{
        height: 48,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: space.px8,
        padding: `0 ${space.px8}px`,
        borderBottom: `1px solid ${t.line}`,
        background: t.surface,
      }}
    >
      <IconButton
        icon="chevron"
        rotate={90}
        title="Previous page"
        disabled={!hasPager || page <= 1}
        onClick={() => controller.goToPage(page - 1)}
        t={t}
      />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: 'center',
          fontFamily: typography.ui,
          fontSize: typography.size.sm,
          fontWeight: 600,
          color: loaded ? t.ink : t.ink3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {loaded ? (fileName ?? 'Untitled') : 'No file open'}
        {hasPager && (
          <span style={{ color: t.ink4, fontWeight: 400 }}>
            {' · '}
            {page}/{pageCount}
          </span>
        )}
      </span>
      <IconButton
        icon="chevron"
        rotate={-90}
        title="Next page"
        disabled={!hasPager || page >= pageCount}
        onClick={() => controller.goToPage(page + 1)}
        t={t}
      />
    </header>
  );
}

function MobileDock({
  controller,
  onMenu,
  onChat,
  onVoice,
}: {
  controller: WebController;
  onMenu: () => void;
  onChat: () => void;
  onVoice: () => void;
}): ReactNode {
  const t = useTheme();
  const loaded = controller.isLoaded();
  const voice = controller.voiceAvailable();

  return (
    <nav
      data-mb-dock=""
      style={{
        height: 60,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: `0 ${space.px12}px`,
        borderTop: `1px solid ${t.line}`,
        background: t.surface2,
      }}
    >
      {/* Menu stays live even with no file — it carries Settings, Tours, and the
          open actions, so the app is never a dead end. */}
      <IconButton icon="menu" title="Menu" onClick={onMenu} t={t} />
      <IconButton
        icon="undo"
        title="Undo"
        disabled={!controller.canUndo()}
        onClick={() => void controller.undo()}
        t={t}
      />
      <IconButton icon="keyboard" title="Type a request" disabled={!loaded} onClick={onChat} t={t} />
      <IconButton
        icon="mic"
        title={voice ? 'Voice request' : 'Type a request'}
        solid
        disabled={!loaded}
        onClick={voice ? onVoice : onChat}
        t={t}
      />
    </nav>
  );
}

interface DrawerItem {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function MenuDrawer({
  controller,
  onClose,
}: {
  controller: WebController;
  onClose: () => void;
}): ReactNode {
  const t = useTheme();
  const { mode, toggle } = useThemeControls();
  const loaded = controller.isLoaded();

  // Run an action and close the drawer behind it.
  const act = (fn: () => void) => () => {
    onClose();
    fn();
  };

  const groups: DrawerItem[][] = [
    [
      { icon: 'sparkle', label: 'Open sample…', onClick: act(() => controller.openSampleDialog()) },
      { icon: 'folder', label: 'Open local…', onClick: act(() => void controller.openCsv()) },
      { icon: 'link', label: 'Open URL…', onClick: act(() => controller.openUrlDialog()) },
    ],
    [
      { icon: 'undo', label: 'Undo', onClick: act(() => void controller.undo()), disabled: !controller.canUndo() },
      { icon: 'redo', label: 'Redo', onClick: act(() => void controller.redo()), disabled: !controller.canRedo() },
    ],
    [
      { icon: 'save', label: 'Save data', onClick: act(() => void controller.saveData()), disabled: !loaded },
      { icon: 'save', label: 'Save flow', onClick: act(() => void controller.saveFlow()), disabled: !loaded },
      { icon: 'save', label: 'Save as Python…', onClick: act(() => void controller.savePython()), disabled: !loaded },
    ],
    [
      { icon: mode === 'dark' ? 'sun' : 'moon', label: `Dark mode: ${mode === 'dark' ? 'on' : 'off'}`, onClick: act(toggle) },
      { icon: 'cog', label: 'Settings…', onClick: act(() => controller.openSettings()) },
      { icon: 'sparkle', label: 'Tours…', onClick: act(() => controller.openTutorial()) },
    ],
  ];

  const itemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: space.px12,
    padding: '11px 18px',
    border: 0,
    background: 'transparent',
    color: t.ink,
    fontFamily: typography.ui,
    fontSize: typography.size.base,
    textAlign: 'left',
    width: '100%',
    cursor: 'pointer',
  };

  return (
    <div
      data-mb-drawer=""
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: t.overlay, zIndex: 120, display: 'flex' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '78%',
          maxWidth: 320,
          height: '100%',
          background: t.surface,
          borderRight: `2px solid ${t.line2}`,
          boxShadow: t.shadowLg,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: `${space.px12}px 0`,
        }}
      >
        <div
          style={{
            padding: `0 ${space.px16}px ${space.px8}px`,
            fontFamily: typography.ui,
            fontSize: typography.size.xs,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: t.ink3,
          }}
        >
          Menu
        </div>
        {groups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div style={{ height: 1, background: t.line, margin: `${space.px6}px ${space.px14}px` }} />}
            {group.map((item) => (
              <button
                key={item.label}
                type="button"
                data-mb-menu-item={item.label}
                onClick={item.onClick}
                disabled={item.disabled}
                style={{ ...itemStyle, opacity: item.disabled ? 0.4 : 1, cursor: item.disabled ? 'default' : 'pointer' }}
              >
                <span style={{ color: t.ink3, display: 'flex' }}>
                  <Icon name={item.icon} size={18} />
                </span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatSheet({
  controller,
  onClose,
}: {
  controller: WebController;
  onClose: () => void;
}): ReactNode {
  const t = useTheme();
  return (
    <div
      data-mb-chat-sheet=""
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: t.overlay, zIndex: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          height: '72%',
          background: t.surface2,
          borderTopLeftRadius: space.radiusLg,
          borderTopRightRadius: space.radiusLg,
          borderTop: `2px solid ${t.line2}`,
          boxShadow: t.shadowLg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: `${space.px8}px 0 0` }}>
          <span style={{ width: 42, height: 5, borderRadius: 3, background: t.line2 }} />
        </div>
        <ChatSidebar controller={controller} fill />
      </div>
    </div>
  );
}

export function MobileShell({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const openChat = (): void => setChatOpen(true);
  const openVoice = (): void => {
    setChatOpen(true);
    void controller.startVoice();
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileAppBar controller={controller} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <TableView controller={controller} />
      </div>
      <MobileDock controller={controller} onMenu={() => setDrawerOpen(true)} onChat={openChat} onVoice={openVoice} />
      {drawerOpen && <MenuDrawer controller={controller} onClose={() => setDrawerOpen(false)} />}
      {chatOpen && <ChatSheet controller={controller} onClose={() => setChatOpen(false)} />}
    </div>
  );
}
