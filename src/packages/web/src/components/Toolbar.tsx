// Binds WebController to the generic top bar: the bar itself (brand lockup,
// file readout, action buttons) lives in @tamedtable/toolbar. Only the
// controller wiring stays here.
import type { ReactNode } from 'react';
import { useThemeControls } from '@tamedtable/ui-kit/components';
import {
  Toolbar as ToolbarBar,
  type RecentMenuItem,
  type SaveMenuItem,
} from '@tamedtable/toolbar/components';
import type { FormatId } from '@tamedtable/file-io';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

// The formats the Save menu offers, in toolbar order. The label is what the
// menu shows; the id picks the codec the controller serializes through.
const SAVE_FORMATS: { id: FormatId; label: string }[] = [
  { id: 'csv', label: 'CSV' },
  { id: 'jsonl', label: 'JSONL' },
  { id: 'parquet', label: 'Parquet' },
  { id: 'arrow', label: 'Arrow' },
];

/** The Save menu's entries: shared by the desktop toolbar and the mobile
 *  app bar so both render the identical menu. */
export function saveMenus(controller: WebController): {
  saveDataMenu: SaveMenuItem[];
  saveFlowMenu: SaveMenuItem[];
} {
  return {
    saveDataMenu: SAVE_FORMATS.map((f) => ({
      label: `Save ${f.label}…`,
      onClick: () => void controller.saveDataAs(f.id),
    })),
    // The recipe can be saved as a replayable .flow or translated to a Python
    // script (model-backed: the controller guards on key / AI cells).
    saveFlowMenu: [
      { label: 'Save recipe as .flow…', onClick: () => void controller.saveFlow() },
      { label: 'Save recipe as Python…', onClick: () => void controller.savePython() },
    ],
  };
}

/** The Open menu's Recent rows: controller recents mapped to menu items. */
export function recentMenuItems(controller: WebController): RecentMenuItem[] {
  return controller.recents().map((entry) => ({
    label: entry.label,
    tag: entry.kind === 'url' ? 'URL' : entry.kind,
    onClick: () => void controller.openRecent(entry),
  }));
}

export function Toolbar({
  controller,
  condensed = false,
}: {
  controller: WebController;
  condensed?: boolean;
}): ReactNode {
  useController(controller);
  const { toggle } = useThemeControls();

  const spec = controller.displaySpec();
  const fileName = spec.table ? (spec.table.split('/').pop() ?? spec.table) : null;

  const { saveDataMenu, saveFlowMenu } = saveMenus(controller);

  return (
    <ToolbarBar
      openButtonId="tutorial-open-btn"
      condensed={condensed}
      loaded={controller.isLoaded()}
      busy={controller.streaming}
      fileName={fileName}
      rowCount={controller.displayRows().length}
      colCount={spec.columns.length}
      canUndo={controller.canUndo()}
      canRedo={controller.canRedo()}
      onOpenSample={() => controller.openSampleDialog()}
      onOpenUrl={() => controller.openUrlDialog()}
      onOpenLocal={() => void controller.openCsv()}
      onOpenFlow={() => void controller.openFlow()}
      recentMenu={recentMenuItems(controller)}
      saveDataMenu={saveDataMenu}
      saveFlowMenu={saveFlowMenu}
      onUndo={() => void controller.undo()}
      onRedo={() => void controller.redo()}
      onToggleTheme={toggle}
      onOpenSettings={() => controller.openSettings()}
      onOpenTutorial={() => controller.openTutorial()}
    />
  );
}
