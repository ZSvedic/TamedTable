// #Toolbar
// The top bar: pure props in, callbacks out. The host owns the load state,
// the file readout, and the undo/redo flags; the toolbar knows nothing about
// engines or files. The brand lockup at the left lives in ./Brand.
import type { ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import {
  useTheme,
  Button,
  MenuButton,
  Icon,
  type MenuButtonSection,
} from '@tamedtable/ui-kit/components';
import { Lockup } from './Brand.tsx';

/** One "Save …" dropdown entry. The host owns the targets, the package
 *  knows nothing about CSV/JSONL/Parquet/Arrow formats or flow/Python exports. */
export interface SaveMenuItem {
  label: string;
  onClick: () => void;
}

/** One entry of the Open menu's "Recent" submenu. The host owns the
 *  storage and the reload behavior: the package only renders the rows. */
export interface RecentMenuItem {
  label: string;
  /** The entry's kind badge: "sample", "URL", "local", or "flow". */
  tag: string;
  onClick: () => void;
}

export interface ToolbarProps {
  /** A table is loaded: enables the save menu and shows the readout. */
  loaded: boolean;
  /** A request is running: disables the loading/saving/history actions. */
  busy: boolean;
  /** File-name part of the readout (null hides it, e.g. an in-memory table). */
  fileName?: string | null;
  rowCount?: number;
  colCount?: number;
  canUndo: boolean;
  canRedo: boolean;
  /** DOM id for the Open menu button: the Driver.js tutorial spotlight. */
  openButtonId?: string;
  /** Medium width: hide the file readout and drop button labels to icons
   *  (tooltips retained) so the row fits instead of overflowing. */
  condensed?: boolean;
  onOpenSample: () => void;
  onOpenUrl: () => void;
  onOpenLocal: () => void;
  /** "Open .flow & run on current data…": pick a saved flow and replay it. */
  onOpenFlow: () => void;
  /** Last-loaded files, newest first (at most 5); empty greys the Recent entry. */
  recentMenu: RecentMenuItem[];
  /** "Save <format>…" entries for the Save menu's Data group. */
  saveDataMenu: SaveMenuItem[];
  /** "Save recipe as …" entries for the Save menu's Recipe group. */
  saveFlowMenu: SaveMenuItem[];
  onUndo: () => void;
  onRedo: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
}

/** The Open menu's grouped sections: shared by the desktop toolbar and the
 *  mobile Menu drawer so both render the identical menu model. */
export function openMenuSections(opts: {
  onOpenSample: () => void;
  onOpenLocal: () => void;
  onOpenUrl: () => void;
  onOpenFlow: () => void;
  recentMenu: RecentMenuItem[];
  /** A table is loaded: enables "Open .flow & run on current data…". */
  loaded: boolean;
}): MenuButtonSection[] {
  const sections: MenuButtonSection[] = [
    {
      items: [
        {
          label: 'Recent',
          icon: 'clock',
          // Greyed until something has been loaded: the entry stays visible
          // so the feature is discoverable from the first open.
          disabled: opts.recentMenu.length === 0,
          submenu: opts.recentMenu.map((r) => ({ label: r.label, tag: r.tag, onClick: r.onClick })),
        },
      ],
    },
  ];
  sections.push(
    {
      header: 'Data',
      items: [
        { label: 'Open sample…', icon: 'sparkle', onClick: opts.onOpenSample },
        { label: 'Open local…', icon: 'upload', onClick: opts.onOpenLocal },
        { label: 'Open URL…', icon: 'link', onClick: opts.onOpenUrl },
      ],
    },
    {
      header: 'Recipe',
      // The flow runs on the open table, so the entry needs one.
      items: [
        {
          label: 'Open .flow & run on current data…',
          icon: 'play',
          disabled: !opts.loaded,
          onClick: opts.onOpenFlow,
        },
      ],
    },
  );
  return sections;
}

/** The Save menu's grouped sections: shared by desktop and mobile. */
export function saveMenuSections(opts: {
  saveDataMenu: SaveMenuItem[];
  saveFlowMenu: SaveMenuItem[];
}): MenuButtonSection[] {
  return [
    { header: 'Data', items: opts.saveDataMenu },
    { header: 'Recipe', items: opts.saveFlowMenu },
  ];
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
  onOpenFlow,
  recentMenu,
  saveDataMenu,
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

      <MenuButton
        id={openButtonId}
        disabled={busy}
        title="Open a table or a saved flow"
        sections={openMenuSections({ onOpenSample, onOpenLocal, onOpenUrl, onOpenFlow, recentMenu, loaded })}
      >
        <Icon name="file" />
        {!condensed && 'Open'}
      </MenuButton>
      <MenuButton
        disabled={!loaded || busy}
        title="Save the data or the recipe"
        sections={saveMenuSections({ saveDataMenu, saveFlowMenu })}
      >
        <Icon name="save" />
        {!condensed && 'Save'}
      </MenuButton>

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
      <Button onClick={onOpenTutorial} title="Interactive tours, no API key required">
        {condensed ? <Icon name="tour" /> : 'Tours'}
      </Button>
    </header>
  );
}
