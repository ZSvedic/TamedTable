// #MobileShell: pinch-to-zoom for the phone table only. The browser's own
// page zoom scales the fixed chrome (app bar, dock, sheets) along with the
// cells, so the phone layout suppresses it, the viewport meta locks the page
// scale where honored (Android), and the proprietary gesture events are the
// off-switch where it is not (iOS Safari ignores the viewport lock), and this
// hook handles the pinch itself: a two-finger gesture that starts over the
// table scales a zoom factor the table applies via the CSS `zoom` property,
// anchored at the fingers' midpoint by re-aiming the document scroll.
import { useEffect, useRef, useState } from 'react';

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;

/** The next zoom for a pinch that started at `startDist` finger spacing and
 *  `startZoom`, clamped to the floor and ceiling. */
export function pinchedZoom(startZoom: number, startDist: number, dist: number): number {
  if (startDist <= 0) return startZoom;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, startZoom * (dist / startDist)));
}

/** Where the document must scroll (one axis) so the content point under the
 *  fingers' midpoint stays put as the zoom changes by `ratio`. `origin` is the
 *  document offset where the zoomed content begins; `focal` the midpoint's
 *  viewport position. */
export function scrollAfterZoom(scroll: number, focal: number, origin: number, ratio: number): number {
  return origin + (scroll + focal - origin) * ratio - focal;
}

const dist = (t: TouchList): number =>
  Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY);

interface PinchStart {
  dist: number;
  zoom: number;
  originX: number;
  originY: number;
}

/** The table's zoom factor, driven by two-finger pinches over the table.
 *  Resets to 1 whenever `resetKey` changes (a new file was opened). */
export function useTableZoom(resetKey: string): number {
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  useEffect(() => {
    zoomRef.current = 1;
    setZoom(1);
  }, [resetKey]);

  useEffect(() => {
    let start: PinchStart | null = null;

    const onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length !== 2) return;
      const table = (e.target as Element | null)?.closest?.('[data-mob-table]');
      if (!table) return;
      // The table's document origin: constant through the gesture (only the
      // fixed-height app-bar padding sits above it).
      const rect = table.getBoundingClientRect();
      start = {
        dist: dist(e.touches),
        zoom: zoomRef.current,
        originX: rect.left + window.scrollX,
        originY: rect.top + window.scrollY,
      };
    };

    const onTouchMove = (e: TouchEvent): void => {
      if (!start || e.touches.length !== 2) return;
      e.preventDefault(); // the pinch is ours, no page pan/zoom underneath
      const next = pinchedZoom(start.zoom, start.dist, dist(e.touches));
      const ratio = next / zoomRef.current;
      zoomRef.current = next;
      setZoom(next);
      const focalX = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2;
      const focalY = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2;
      window.scrollTo(
        scrollAfterZoom(window.scrollX, focalX, start.originX, ratio),
        scrollAfterZoom(window.scrollY, focalY, start.originY, ratio),
      );
    };

    const onTouchEnd = (e: TouchEvent): void => {
      if (e.touches.length < 2) start = null;
    };

    // iOS Safari ignores the viewport meta's zoom lock; preventing its gesture
    // events is the reliable way to keep the native page zoom off.
    const swallow = (e: Event): void => e.preventDefault();
    const gestures = ['gesturestart', 'gesturechange', 'gestureend'];

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    for (const g of gestures) document.addEventListener(g, swallow);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      for (const g of gestures) document.removeEventListener(g, swallow);
    };
  }, []);

  return zoom;
}
