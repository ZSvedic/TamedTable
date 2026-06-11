// Binds WebController to the generic Open-URL dialog — the dialog itself lives
// in @tamedtable/toolbar. The bundled sample list and the URL composition
// (import.meta.env / window.location) stay here: they are app build data.
import { useMemo, type ReactNode } from 'react';
import { OpenUrlDialog as UrlDialog } from '@tamedtable/toolbar/components';
import type { ToolbarSample } from '@tamedtable/toolbar';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

// Sample files bundled into the deployed site by vite.config.ts. Frozen at
// build time; surfaced in the dialog as one-click quick-picks.
declare const __TT_SAMPLE_FILES__: readonly string[];

/** Compose a full URL to a bundled sample file (so the URL field shows the
 *  exact location the user can copy and paste back later). */
function sampleUrl(name: string): string {
  // import.meta.env.BASE_URL is "/TamedTable/" on the deployed site and
  // "/" in some test configurations; both compose correctly through URL().
  return new URL(`${import.meta.env.BASE_URL}samples/${name}`, window.location.href).toString();
}

export function OpenUrlDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);

  // Sorted at build time; map each filename to its composed URL once.
  const samples = useMemo<ToolbarSample[]>(
    () => [...__TT_SAMPLE_FILES__].map((name) => ({ name, url: sampleUrl(name) })),
    [],
  );

  return (
    <UrlDialog
      open={controller.urlDialogOpen}
      samples={samples}
      onSubmit={(url) => controller.loadFromUrl(url)}
      onClose={() => controller.closeUrlDialog()}
    />
  );
}
