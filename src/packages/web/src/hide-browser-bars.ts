// #MobileShell — browser-bar auto-hide, the JS half (index.css carries the
// 1px scroll room and the pinned #root). In a normal tab, Android Chrome and
// iOS Safari draw an address bar on top and (Chrome, iOS Safari on some
// devices) a navigation bar at the bottom, and only slide them away when the
// page scrolls. This module scrolls that 1px with window.scrollTo — on load
// and again after each touch, because the bars come back on rotation, focus,
// or an edge swipe.
const NUDGE_DELAY_MS = 100;

/** Install the scrollTo nudge. No-op on mouse-pointer (desktop) browsers. */
export function installBrowserBarAutoHide(win: Window = window): void {
  if (!win.matchMedia('(pointer: coarse)').matches) return;

  const nudge = (): void => {
    // Some contexts have no scroll room despite the CSS — added to the home
    // screen (no bars, lvh = svh), or an in-app webview that sizes the page
    // itself. scrollTo would be a silent no-op, so skip cleanly. Also skip
    // when the user has already scrolled the slack away.
    const room = win.document.documentElement.scrollHeight - win.innerHeight;
    if (room < 1 || win.scrollY > 0) return;
    win.scrollTo(0, 1);
  };

  // Let layout settle before each nudge: after load the fonts/first paint,
  // after a touch the tap's own scrolling, after rotation the new viewport.
  const later = (): void => void win.setTimeout(nudge, NUDGE_DELAY_MS);
  if (win.document.readyState === 'complete') later();
  else win.addEventListener('load', later, { once: true });
  win.addEventListener('touchend', later, { passive: true });
  win.addEventListener('orientationchange', later);
}
