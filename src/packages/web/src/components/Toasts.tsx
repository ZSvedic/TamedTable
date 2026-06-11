// Binds the controller's toast list to the ui-kit toast stack — the stack
// itself (layout, styling, dismiss buttons) lives in @tamedtable/ui-kit.
import type { ReactNode } from 'react';
import { Toasts as ToastStack } from '@tamedtable/ui-kit/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

export function Toasts({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  return (
    <ToastStack toasts={controller.toasts} onDismiss={(id) => controller.dismissToast(id)} />
  );
}
