// #WebUI
// True on the desktop layout's medium band, wider than the phone breakpoint
// but too narrow to fit the toolbar's labelled buttons in one row. Drives the
// Toolbar's `condensed` prop (icon-only, no file readout) so the bar fits
// instead of overflowing the viewport. Must be ≥ the full-label toolbar width
// so there is no width where labels show yet don't fit (see the e2e invariant).
import { useMaxWidth } from './useMaxWidth.ts';

/** At and below this width the desktop toolbar condenses to icon-only buttons. */
export const NARROW_MAX_WIDTH = 1100;

export function useIsNarrow(): boolean {
  return useMaxWidth(NARROW_MAX_WIDTH);
}
