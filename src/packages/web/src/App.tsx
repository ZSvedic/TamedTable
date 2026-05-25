import type { ReactNode } from 'react';
import { typography } from './theme.ts';
import type { WebController } from './controller.ts';
import { ThemeProvider, useTheme } from './useTheme.tsx';
import { Toolbar } from './components/Toolbar.tsx';
import { ChatSidebar } from './components/ChatSidebar.tsx';
import { TableView } from './components/TableView.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { OpenUrlDialog } from './components/OpenUrlDialog.tsx';
import { Toasts } from './components/Toasts.tsx';

function AppShell({ controller }: { controller: WebController }): ReactNode {
  const t = useTheme();
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: t.bg,
        color: t.ink,
        fontFamily: typography.ui,
      }}
    >
      <Toolbar controller={controller} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ChatSidebar controller={controller} />
        <TableView controller={controller} />
      </div>
      <SettingsPanel controller={controller} />
      <OpenUrlDialog controller={controller} />
      <Toasts controller={controller} />
    </div>
  );
}

export function App({ controller }: { controller: WebController }): ReactNode {
  return (
    <ThemeProvider>
      <AppShell controller={controller} />
    </ThemeProvider>
  );
}
