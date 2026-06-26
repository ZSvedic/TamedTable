// Binds WebController to the generic top bar — the bar itself (brand lockup,
// file readout, action buttons) lives in @tamedtable/toolbar. Only the
// controller wiring stays here.
import type { ReactNode } from 'react';
import { useThemeControls } from '@tamedtable/ui-kit/components';
import { Toolbar as ToolbarBar, type SaveMenuItem } from '@tamedtable/toolbar/components';
import type { FormatId } from '@tamedtable/file-io';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

// The formats "Save as…" offers, in toolbar order. The label is what the menu
// shows; the id picks the codec the controller serializes through.
const SAVE_FORMATS: { id: FormatId; label: string }[] = [
  { id: 'csv', label: 'CSV' },
  { id: 'jsonl', label: 'JSONL' },
  { id: 'parquet', label: 'Parquet' },
  { id: 'arrow', label: 'Arrow' },
];

export function Toolbar({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const { toggle } = useThemeControls();

  const spec = controller.displaySpec();
  const fileName = spec.table ? (spec.table.split('/').pop() ?? spec.table) : null;

  const saveDataMenu: SaveMenuItem[] = SAVE_FORMATS.map((f) => ({
    label: `Save as ${f.label}…`,
    onClick: () => void controller.saveDataAs(f.id),
  }));

  // The flow can be saved as a replayable .flow or translated to a Python
  // script (model-backed — the controller guards on key / AI cells).
  const saveFlowMenu: SaveMenuItem[] = [
    { label: 'Save as Flow…', onClick: () => void controller.saveFlow() },
    { label: 'Save as Python…', onClick: () => void controller.savePython() },
  ];

  return (
    <ToolbarBar
      openButtonId="tutorial-open-btn"
      loaded={controller.isLoaded()}
      busy={controller.streaming}
      fileName={fileName}
      rowCount={controller.displayRows().length}
      colCount={spec.columns.length}
      canUndo={controller.canUndo()}
      canRedo={controller.canRedo()}
      onOpenUrl={() => controller.openUrlDialog()}
      onOpenLocal={() => void controller.openCsv()}
      onSaveData={() => void controller.saveData()}
      saveDataMenu={saveDataMenu}
      onSaveFlow={() => void controller.saveFlow()}
      saveFlowMenu={saveFlowMenu}
      onUndo={() => void controller.undo()}
      onRedo={() => void controller.redo()}
      onToggleTheme={toggle}
      onOpenSettings={() => controller.openSettings()}
      onOpenTutorial={() => controller.openTutorial()}
    />
  );
}
