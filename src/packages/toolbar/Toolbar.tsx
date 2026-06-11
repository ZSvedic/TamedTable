// #Toolbar
// The top bar — pure props in, callbacks out. The host owns the load state,
// the file readout, and the undo/redo flags; the toolbar knows nothing about
// engines or files. The brand lockup at the left lives in ./Brand.
import type { ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button, SplitButton, Icon } from '@tamedtable/ui-kit/components';
import { Lockup } from './Brand.tsx';

export interface ToolbarProps {
  /** A table is loaded — enables the save buttons and shows the readout. */
  loaded: boolean;
  /** A request is running — disables the loading/saving/history actions. */
  busy: boolean;
  /** File-name part of the readout (null hides it, e.g. an in-memory table). */
  fileName?: string | null;
  rowCount?: number;
  colCount?: number;
  canUndo: boolean;
  canRedo: boolean;
  /** DOM id for the Open split button — the Driver.js tutorial spotlight. */
  openButtonId?: string;
  onOpenUrl: () => void;
  onOpenLocal: () => void;
  onSaveData: () => void;
  onSaveFlow: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
}

export function Toolbar({
  loaded,
  busy,
  fileName = null,
  rowCount = 0,
  colCount = 0,
  canUndo,
  canRedo,
  openButtonId,
  onOpenUrl,
  onOpenLocal,
  onSaveData,
  onSaveFlow,
  onUndo,
  onRedo,
  onToggleTheme,
  onOpenSettings,
  onOpenTutorial,
}: ToolbarProps): ReactNode {
  const t = useTheme();
  const dark = t.name === 'dark';

  const divider = (
    <span
      style={{ width: 1, height: 16, background: t.line, margin: `0 ${space.px6}px` }}
    />
  );

  return (
    <header
      data-tb-toolbar=""
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
      <Lockup size={typography.size.md} color={t.ink} dark={dark} />

      {loaded && (
        <span
          data-tb-info=""
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
        id={openButtonId}
        onClick={onOpenUrl}
        disabled={busy}
        title="Open a CSV or JSONL file from a URL"
        caretTitle="More open options"
        menu={[{ label: 'Open local…', onClick: onOpenLocal }]}
      >
        <Icon name="folder" />
        Open URL…
      </SplitButton>
      <Button onClick={onSaveData} disabled={!loaded || busy} title="Save the current rows (:save)">
        <Icon name="save" />
        Save data
      </Button>
      <Button onClick={onSaveFlow} disabled={!loaded || busy} title="Save the flow as a replayable .flow file (:save-flow)">
        Save flow
      </Button>

      {divider}

      <Button onClick={onUndo} disabled={!canUndo || busy} title="Undo (:undo)">
        <Icon name="undo" />
        Undo
      </Button>
      <Button onClick={onRedo} disabled={!canRedo || busy} title="Redo (:redo)">
        <Icon name="redo" />
        Redo
      </Button>

      {divider}

      <Button
        onClick={onToggleTheme}
        title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        <Icon name={dark ? 'sun' : 'moon'} />
      </Button>
      <Button onClick={onOpenSettings} title="API key and settings">
        <Icon name="cog" />
        Settings
      </Button>
      <Button onClick={onOpenTutorial} title="Interactive tutorials — no API key required">
        Tutorial
      </Button>
    </header>
  );
}
