import { useSyncExternalStore } from 'react';
import type { WebController } from '../controller.ts';

/** Re-render the calling component whenever the controller's state changes.
 *  The returned revision number is otherwise unused: components read state
 *  fields off the controller directly. */
export function useController(controller: WebController): number {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getRevision,
    controller.getRevision,
  );
}
