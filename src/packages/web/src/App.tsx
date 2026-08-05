import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { typography } from '@tamedtable/ui-kit';
import type { WebController } from './controller.ts';
import { ThemeProvider, useTheme } from '@tamedtable/ui-kit/components';
import { Toolbar } from './components/Toolbar.tsx';
import { ChatSidebar } from './components/ChatSidebar.tsx';
import { TableView } from './components/TableView.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { OpenUrlDialog } from './components/OpenUrlDialog.tsx';
import { OpenSampleDialog } from './components/OpenSampleDialog.tsx';
import { Toasts } from './components/Toasts.tsx';
import { ErrorDialog } from './components/ErrorDialog.tsx';
import { ReplaceDialog } from './components/ReplaceDialog.tsx';
import { LookupDialog } from './components/LookupDialog.tsx';
import { LargeFileDialog, RunAllDialog, SaveGateDialog } from './components/LazyDialogs.tsx';
import { TutorialPanel } from './components/TutorialPanel.tsx';
import { MobileShell } from './components/mobile/MobileShell.tsx';
import { useIsMobile } from './hooks/useIsMobile.ts';
import { useIsNarrow } from './hooks/useIsNarrow.ts';

// The desktop layout: top toolbar over a chat sidebar beside the table. On the
// medium band (wider than the phone breakpoint but too narrow for full button
// labels) the toolbar condenses to icons so it never overflows.
// Chat-sidebar width bounds + persistence (a view setting, like the theme).
const CHAT_W_KEY = 'tamedtable.chatWidth';
const CHAT_W_MIN = 280;
const CHAT_W_MAX = 640;

function clampChatWidth(w: number): number {
  return Math.min(CHAT_W_MAX, Math.max(CHAT_W_MIN, w));
}

function storedChatWidth(): number {
  try {
    const n = Number(globalThis.localStorage?.getItem(CHAT_W_KEY));
    return Number.isFinite(n) && n > 0 ? clampChatWidth(n) : 360;
  } catch {
    return 360;
  }
}

function DesktopShell({ controller }: { controller: WebController }): ReactNode {
  const condensed = useIsNarrow();
  const t = useTheme();
  const [chatWidth, setChatWidth] = useState(storedChatWidth);

  // The sidebar/table boundary is a drag handle: col-resize cursor on hover,
  // drag resizes the sidebar, the width persists like a setting.
  const startResize = (e: ReactMouseEvent): void => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidth;
    const widthAt = (ev: MouseEvent): number => clampChatWidth(startW + ev.clientX - startX);
    const move = (ev: MouseEvent): void => setChatWidth(widthAt(ev));
    const up = (ev: MouseEvent): void => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      try {
        localStorage.setItem(CHAT_W_KEY, String(widthAt(ev)));
      } catch { /* storage full or unavailable — the width just won't persist */ }
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Toolbar controller={controller} condensed={condensed} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ChatSidebar controller={controller} width={chatWidth} />
        <div
          data-tt-chat-resize=""
          title="Drag to resize the chat panel"
          onMouseDown={startResize}
          style={{
            flex: '0 0 6px',
            marginLeft: -6,
            cursor: 'col-resize',
            zIndex: 3,
            background: 'transparent',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.accentSoft; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        />
        <TableView controller={controller} />
      </div>
    </div>
  );
}

function AppShell({ controller }: { controller: WebController }): ReactNode {
  const t = useTheme();
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        // Desktop fills the viewport; the mobile shell flows with the document
        // so the page itself can scroll the table (see MobileShell).
        height: isMobile ? undefined : '100%',
        display: 'flex',
        flexDirection: 'column',
        background: t.bg,
        color: t.ink,
        fontFamily: typography.ui,
      }}
    >
      {isMobile ? (
        <MobileShell controller={controller} />
      ) : (
        <DesktopShell controller={controller} />
      )}
      {/* Shared overlays — fixed-position modals, identical on both layouts. */}
      <SettingsPanel controller={controller} />
      <TutorialPanel controller={controller} />
      <OpenSampleDialog controller={controller} />
      <OpenUrlDialog controller={controller} />
      <LargeFileDialog controller={controller} />
      <RunAllDialog controller={controller} />
      <SaveGateDialog controller={controller} />
      <ReplaceDialog controller={controller} />
      <LookupDialog controller={controller} />
      <ErrorDialog controller={controller} />
      <Toasts controller={controller} />
    </div>
  );
}

// Theme persistence is the app's job — ui-kit's provider owns no storage.
const MODE_STORAGE = 'tamedtable.theme';

export function App({ controller }: { controller: WebController }): ReactNode {
  return (
    <ThemeProvider
      initialMode={localStorage.getItem(MODE_STORAGE) === 'dark' ? 'dark' : 'light'}
      onModeChange={(mode) => localStorage.setItem(MODE_STORAGE, mode)}
    >
      <AppShell controller={controller} />
    </ThemeProvider>
  );
}
