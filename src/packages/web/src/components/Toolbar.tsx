// Binds WebController to the generic top bar — the bar itself (brand lockup,
// file readout, action buttons) lives in @tamedtable/toolbar. Only the
// controller wiring stays here.
import type { ReactNode } from 'react';
import { useThemeControls } from '@tamedtable/ui-kit/components';
import { Toolbar as ToolbarBar } from '@tamedtable/toolbar/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

export function Toolbar({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const { toggle } = useThemeControls();

  const spec = controller.displaySpec();
  const fileName = spec.table ? (spec.table.split('/').pop() ?? spec.table) : null;

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
      onSaveFlow={() => void controller.saveFlow()}
      onUndo={() => void controller.undo()}
      onRedo={() => void controller.redo()}
      onToggleTheme={toggle}
      onOpenSettings={() => controller.openSettings()}
      onOpenTutorial={() => controller.openTutorial()}
    />
  );
}
