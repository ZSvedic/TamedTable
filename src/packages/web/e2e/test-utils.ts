// #E2EPixelTolerance — shared assertion helper for the browser E2E suite.
// Browsers report laid-out pixel sizes as sub-pixel floats, so the same
// measurement can read 40 on one frame and 40.00006103515625 on the next.
// Exact equality (toBe) flakes on that rounding noise; assert measured pixels
// with a ±1px tolerance instead. Use only for *measured* values (heights,
// widths, getBoundingClientRect coords) — discrete values (counts, indices,
// booleans) must still be checked exactly.
import { expect } from '@playwright/test';

/** Assert a measured pixel value is within `tol` px of `expected` (default ±1). */
export function expectPixelsClose(actual: number, expected: number, tol = 1, message?: string): void {
  expect(Math.abs(actual - expected), message ?? `expected ${actual}px within ${tol}px of ${expected}px`).toBeLessThanOrEqual(
    tol,
  );
}
