import type { ReactNode } from 'react';
import { typography } from '@tamedtable/ui-kit';
import type { WebController } from './controller.ts';
import { ThemeProvider, useTheme } from '@tamedtable/ui-kit/components';
import { Toolbar } from './components/Toolbar.tsx';
import { ChatSidebar } from './components/ChatSidebar.tsx';
import { TableView } from './components/TableView.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { OpenUrlDialog } from './components/OpenUrlDialog.tsx';
import { OpenSampleDialog } from './components/OpenSampleDialog.tsx';
import { FlowRunDialog } from './components/FlowRunDialog.tsx';
import { Toasts } from './components/Toasts.tsx';
import { TutorialPanel } from './components/TutorialPanel.tsx';
import { MobileShell } from './components/mobile/MobileShell.tsx';
import { useIsMobile } from './hooks/useIsMobile.ts';
import { useIsNarrow } from './hooks/useIsNarrow.ts';

// The desktop layout: top toolbar over a chat sidebar beside the table. On the
// medium band (wider than the phone breakpoint but too narrow for full button
// labels) the toolbar condenses to icons so it never overflows.
function DesktopShell({ controller }: { controller: WebController }): ReactNode {
  const condensed = useIsNarrow();
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Toolbar controller={controller} condensed={condensed} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ChatSidebar controller={controller} />
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
      <FlowRunDialog controller={controller} />
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
