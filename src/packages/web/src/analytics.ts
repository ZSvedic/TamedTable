// #WebAnalytics — action tracking for Cloudflare Web Analytics.
//
// With `"spa":true` (see index.html) the beacon reports a Page View for the
// route you *leave* — it sends the previous route's measurement on the *next*
// route change (Cloudflare FAQ: "send the measurement of the route before the
// route is changed"). A push-then-replace never fires: replaceState isn't
// hooked, so the fake route stays pending until the tab closes.
//
// So we push twice. The first push makes `/action/<name>` the current route
// (and reports the real page we left); the second push, back to the real URL,
// is the route change that reports `/action/<name>` as the page we left —
// which is the Page View we want. Trade-off: this leaves the fake path as a
// back-button history entry.
export function trackAction(name: string): void {
  const current = location.pathname + location.search;
  history.pushState({}, '', `/action/${name}`);
  history.pushState({}, '', current);
}
