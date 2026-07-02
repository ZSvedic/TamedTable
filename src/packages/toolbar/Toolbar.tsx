// #Toolbar
// The top bar — pure props in, callbacks out. The host owns the load state,
// the file readout, and the undo/redo flags; the toolbar knows nothing about
// engines or files. The brand lockup at the left lives in ./Brand.
import type { ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Button, SplitButton, Icon } from '@tamedtable/ui-kit/components';
import { Lockup } from './Brand.tsx';

/** One "Save as …" dropdown entry. The host owns the targets — the package
 *  knows nothing about CSV/JSONL/Parquet/Arrow formats or flow/Python exports. */
export interface SaveMenuItem {
  label: string;
  onClick: () => void;
}

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
  /** Medium width: hide the file readout and drop button labels to icons
   *  (tooltips retained) so the row fits instead of overflowing. */
  condensed?: boolean;
  onOpenSample: () => void;
  onOpenUrl: () => void;
  onOpenLocal: () => void;
  onSaveData: () => void;
  /** "Save as <format>…" entries for the Save-data dropdown. */
  saveDataMenu: SaveMenuItem[];
  onSaveFlow: () => void;
  /** "Save as Flow…" / "Save as Python…" entries for the Save-flow dropdown. */
  saveFlowMenu: SaveMenuItem[];
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
  condensed = false,
  onOpenSample,
  onOpenUrl,
  onOpenLocal,
  onSaveData,
  saveDataMenu,
  onSaveFlow,
  saveFlowMenu,
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

      {loaded && !condensed && (
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
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {fileName && <>{fileName} <span style={{ color: t.ink4 }}>·</span> </>}
          {rowCount} rows × {colCount} cols
        </span>
      )}

      <div style={{ flex: 1 }} />

      <SplitButton
        id={openButtonId}
        onClick={onOpenSample}
        disabled={busy}
        title="Open a bundled sample file"
        caretTitle="More open options"
        menu={[
          { label: 'Open local…', onClick: onOpenLocal },
          { label: 'Open URL…', onClick: onOpenUrl },
        ]}
      >
        <Icon name="folder" />
        {!condensed && 'Open sample…'}
      </SplitButton>
      <SplitButton
        onClick={onSaveData}
        disabled={!loaded || busy}
        title="Save the current rows (:save)"
        caretTitle="Save a copy in a different format"
        menu={saveDataMenu}
      >
        <Icon name="save" />
        {!condensed && 'Save data'}
      </SplitButton>
      <SplitButton
        onClick={onSaveFlow}
        disabled={!loaded || busy}
        title="Save the flow as a replayable .flow file (:save-flow)"
        caretTitle="Save the flow as a .flow file or a Python script"
        menu={saveFlowMenu}
      >
        {condensed ? <Icon name="code" /> : 'Save flow'}
      </SplitButton>

      {divider}

      <Button onClick={onUndo} disabled={!canUndo || busy} title="Undo (:undo)">
        <Icon name="undo" />
        {!condensed && 'Undo'}
      </Button>
      <Button onClick={onRedo} disabled={!canRedo || busy} title="Redo (:redo)">
        <Icon name="redo" />
        {!condensed && 'Redo'}
      </Button>

      {divider}

      <Button
        onClick={onToggleTheme}
        title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        <Icon name={dark ? 'sun' : 'moon'} />
      </Button>
      <Button onClick={onOpenSettings} title="API key and settings">
        <Icon name="wrench" />
        {!condensed && 'Settings'}
      </Button>
      <Button onClick={onOpenTutorial} title="Interactive tours — no API key required">
        {condensed ? <Icon name="tour" /> : 'Tours'}
      </Button>
    </header>
  );
}
