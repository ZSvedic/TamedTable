import type { ReactNode } from 'react';
import { theme } from './theme.ts';
import type { WebController } from './controller.ts';
import { Toolbar } from './components/Toolbar.tsx';
import { ChatSidebar } from './components/ChatSidebar.tsx';
import { TableView } from './components/TableView.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { Toasts } from './components/Toasts.tsx';

export function App({ controller }: { controller: WebController }): ReactNode {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.color.bg,
        color: theme.color.text,
        fontFamily: theme.font.sans,
      }}
    >
      <Toolbar controller={controller} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ChatSidebar controller={controller} />
        <TableView controller={controller} />
      </div>
      <SettingsPanel controller={controller} />
      <Toasts controller={controller} />
    </div>
  );
}
