import type { ReactNode } from 'react';
import { space, typography } from '../theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../useController.ts';
import { useTheme, useThemeControls } from '../useTheme.tsx';
import { Button } from './Button.tsx';
import { SplitButton } from './SplitButton.tsx';
import { Lockup } from './Brand.tsx';
import { Icon } from './Icons.tsx';

export function Toolbar({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const { mode, toggle } = useThemeControls();
  const loaded = controller.isLoaded();
  const busy = controller.streaming;

  const spec = controller.displaySpec();
  const fileName = spec.table ? (spec.table.split('/').pop() ?? spec.table) : null;
  const rowCount = controller.displayRows().length;
  const colCount = spec.columns.length;

  const divider = (
    <span
      style={{ width: 1, height: 16, background: t.line, margin: `0 ${space.px6}px` }}
    />
  );

  return (
    <header
      style={{
        height: space.topbarH,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: space.px10,
        padding: `0 ${space.px12}px`,
        background: t.surface,
        borderBottom: `1px solid ${t.line}`,
      }}
    >
      <Lockup size={typography.size.md} color={t.ink} dark={t.name === 'dark'} />

      {loaded && (
        <span
          style={{
            fontFamily: typography.mono,
            fontSize: typography.size.sm,
            color: t.ink3,
            marginLeft: space.px6,
            paddingLeft: space.px10,
            borderLeft: `1px solid ${t.line}`,
            whiteSpace: 'nowrap',
          }}
        >
          {fileName && <>{fileName} <span style={{ color: t.ink4 }}>·</span> </>}
          {rowCount} rows × {colCount} cols
        </span>
      )}

      <div style={{ flex: 1 }} />

      <SplitButton
        onClick={() => controller.openUrlDialog()}
        disabled={busy}
        title="Open a CSV or JSONL file from a URL"
        caretTitle="More open options"
        menu={[
          { label: 'Open local…', onClick: () => void controller.openCsv() },
        ]}
      >
        <Icon name="folder" />
        Open URL…
      </SplitButton>
      <Button onClick={() => void controller.saveData()} disabled={!loaded || busy} title="Save the current rows">
        <Icon name="save" />
        Save data
      </Button>
      <Button onClick={() => void controller.saveFlow()} disabled={!loaded || busy} title="Save the flow (.flow)">
        Save flow
      </Button>

      {divider}

      <Button onClick={() => void controller.undo()} disabled={!controller.canUndo() || busy} title="Undo">
        <Icon name="undo" />
        Undo
      </Button>
      <Button onClick={() => void controller.redo()} disabled={!controller.canRedo() || busy} title="Redo">
        <Icon name="redo" />
        Redo
      </Button>

      {divider}

      <Button
        onClick={toggle}
        title={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        <Icon name={mode === 'dark' ? 'sun' : 'moon'} />
      </Button>
      <Button onClick={() => controller.openSettings()} title="API key and settings">
        <Icon name="cog" />
        Settings
      </Button>
    </header>
  );
}
