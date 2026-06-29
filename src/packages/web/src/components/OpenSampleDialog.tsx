// Binds WebController to the generic Open-sample picker — the dialog itself
// lives in @tamedtable/toolbar. The bundled sample list (frozen at build time)
// is app data, composed in ../samples.ts.
import { useMemo, type ReactNode } from 'react';
import { OpenSampleDialog as SampleDialog } from '@tamedtable/toolbar/components';
import type { ToolbarSample } from '@tamedtable/toolbar';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { bundledSamples } from '../samples.ts';

export function OpenSampleDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const samples = useMemo<ToolbarSample[]>(() => bundledSamples(), []);

  return (
    <SampleDialog
      open={controller.sampleDialogOpen}
      samples={samples}
      onPick={(url) => void controller.loadFromUrl(url)}
      onClose={() => controller.closeSampleDialog()}
    />
  );
}
