import type { ReactNode } from 'react';
import { theme } from '../theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../useController.ts';
import { Button } from './Button.tsx';

export function Toolbar({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const loaded = controller.isLoaded();
  const busy = controller.streaming;

  return (
    <header
      style={{
        height: theme.layout.headerHeight,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: theme.space.sm,
        padding: `0 ${theme.space.lg}`,
        background: theme.color.surface,
        borderBottom: `1px solid ${theme.color.border}`,
      }}
    >
      <span
        style={{
          fontSize: theme.font.size.xl,
          fontWeight: 700,
          color: theme.color.text,
          marginRight: theme.space.md,
        }}
      >
        TamedTable
      </span>
      <Button onClick={() => void controller.openCsv()} disabled={busy} title="Open a CSV or JSONL file">
        Open file
      </Button>
      <Button onClick={() => void controller.saveData()} disabled={!loaded || busy} title="Save the current rows">
        Save data
      </Button>
      <Button onClick={() => void controller.saveFlow()} disabled={!loaded || busy} title="Save the flow (.flow)">
        Save flow
      </Button>
      <div style={{ width: '1px', height: '24px', background: theme.color.border, margin: `0 ${theme.space.xs}` }} />
      <Button onClick={() => void controller.undo()} disabled={!controller.canUndo() || busy} title="Undo">
        Undo
      </Button>
      <Button onClick={() => void controller.redo()} disabled={!controller.canRedo() || busy} title="Redo">
        Redo
      </Button>
      <div style={{ flex: 1 }} />
      <Button onClick={() => controller.openSettings()} title="API key and settings">
        Settings
      </Button>
    </header>
  );
}
