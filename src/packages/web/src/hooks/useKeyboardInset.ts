// #MobileShell
// How far the on-screen keyboard intrudes into the layout viewport, in px.
// iOS Safari and Android Chrome slide the keyboard over the page without
// resizing the layout viewport, so `position: fixed; bottom: 0` chrome stays
// anchored behind the keys. The visual viewport reports the uncovered region;
// a fixed bottom element must rise by the difference to stay visible.
import { useEffect, useState } from 'react';

/** The visual-viewport → inset arithmetic, separated for unit testing.
 *  `innerHeight - (offsetTop + height)` is the gap between the layout
 *  viewport's bottom and the visual viewport's bottom — the keyboard. */
export function keyboardInset(
  vv: { height: number; offsetTop: number } | null | undefined,
  innerHeight: number,
): number {
  if (!vv) return 0;
  return Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
}

/** How far the bottom region lifts off the screen bottom. Only the Type
 *  composer rides the keyboard; the dock and the Speak/History sheets stay
 *  pinned. Gating on `composerOpen` keeps a stray visual-viewport inset —
 *  reported mid-scroll as the address bar collapses or the table rubber-bands
 *  at its end — from lifting the pinned chrome, the scroll-to-bottom jitter. */
export function bottomInset(composerOpen: boolean, keyboardInset: number): number {
  return composerOpen ? keyboardInset : 0;
}

/** Live keyboard inset — 0 while the keyboard is down or on browsers without
 *  the VisualViewport API. */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = (): void => setInset(keyboardInset(vv, window.innerHeight));
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return inset;
}
