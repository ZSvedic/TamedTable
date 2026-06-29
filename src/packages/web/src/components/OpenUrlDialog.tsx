// Binds WebController to the generic Open-URL dialog — the dialog itself lives
// in @tamedtable/toolbar. URL-only now; samples have their own picker
// (OpenSampleDialog).
import type { ReactNode } from 'react';
import { OpenUrlDialog as UrlDialog } from '@tamedtable/toolbar/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

export function OpenUrlDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);

  return (
    <UrlDialog
      open={controller.urlDialogOpen}
      onSubmit={(url) => controller.loadFromUrl(url)}
      onClose={() => controller.closeUrlDialog()}
    />
  );
}
