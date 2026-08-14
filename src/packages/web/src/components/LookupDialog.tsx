// #LookupJoin
// The "this join needs its second file" modal: one fixed wording, whether
// the join names a file (the browser has no working directory to read it
// from) or names none (`with: null`; the picked file's name is written into
// the step). The run pauses here and asks.
//
// #SaveGate: it renders through the same GateDialog as the save gate, for the
// same reason: a typed request's click is long spent by the time the model
// answers, and a browser only opens a picker from a fresh one. Cancel drops the
// step whole. See spec/behavior.md § Web UI and § The save gate.
import type { ReactNode } from 'react';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { useIsMobile } from '../hooks/useIsMobile.ts';
import { GateDialog } from './Modal.tsx';

export function LookupDialog({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const isMobile = useIsMobile();
  if (!controller.lookupDialog) return null;
  return (
    <GateDialog
      testId="lookup"
      isMobile={isMobile}
      title="This join needs another file"
      body="Pick the file with the rows the join should match against."
      cancelLabel="Cancel"
      confirmLabel="Choose file…"
      onCancel={() => controller.dismissLookupDialog()}
      onConfirm={() => void controller.chooseLookupFile()}
    />
  );
}
