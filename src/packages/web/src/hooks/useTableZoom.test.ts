// #MobileShell — the pinch arithmetic behind useTableZoom.
import { describe, expect, test } from 'bun:test';
import { pinchedZoom, scrollAfterZoom, ZOOM_MAX, ZOOM_MIN } from './useTableZoom.ts';

describe('pinchedZoom', () => {
  test('scales the starting zoom by the finger-distance ratio', () => {
    expect(pinchedZoom(1, 100, 150)).toBe(1.5);
    expect(pinchedZoom(1.5, 200, 100)).toBe(0.75);
  });

  test('clamps to the floor and ceiling', () => {
    expect(pinchedZoom(1, 100, 300)).toBe(ZOOM_MAX);
    expect(pinchedZoom(1, 300, 50)).toBe(ZOOM_MIN);
  });

  test('a degenerate zero start distance keeps the current zoom', () => {
    expect(pinchedZoom(1.3, 0, 200)).toBe(1.3);
  });
});

describe('scrollAfterZoom', () => {
  test('ratio 1 leaves the scroll position alone', () => {
    expect(scrollAfterZoom(120, 200, 46, 1)).toBe(120);
  });

  test('keeps the content point under the fingers stationary', () => {
    // Content begins at document offset 46 (the app bar). A point rendered at
    // viewport position `focal` before the zoom must render there after it.
    const origin = 46;
    const scroll = 300;
    const focal = 180;
    const oldZoom = 1;
    const newZoom = 1.6;
    const contentPoint = (scroll + focal - origin) / oldZoom;
    const scrolled = scrollAfterZoom(scroll, focal, origin, newZoom / oldZoom);
    const viewportPosAfter = origin + contentPoint * newZoom - scrolled;
    expect(viewportPosAfter).toBeCloseTo(focal);
  });

  test('zoom around the content origin scales the scrolled distance only', () => {
    expect(scrollAfterZoom(100, 0, 0, 2)).toBe(200);
  });
});
