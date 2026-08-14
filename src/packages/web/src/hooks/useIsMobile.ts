// #WebUI
// True when the viewport is phone-width (≤768px). The app switches to the
// table-first dock layout below this width; the controller is unchanged: only
// the chrome differs. Recomputes live as the window (or device) is resized.
import { useMaxWidth } from './useMaxWidth.ts';

/** The width at and below which the mobile dock layout takes over. */
export const MOBILE_MAX_WIDTH = 768;

export function useIsMobile(): boolean {
  return useMaxWidth(MOBILE_MAX_WIDTH);
}
