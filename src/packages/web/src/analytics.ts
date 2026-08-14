// #WebAnalytics — action tracking for Cloudflare Web Analytics.
//
// Cloudflare counts a Page View for every SPA route change once the beacon is
// loaded with `"spa":true` (see index.html). We don't have real routes, so to
// register a discrete action we briefly push a fake `/action/<name>` URL and
// immediately restore the real one. The push is what the beacon reports as a
// Page View; the replace hides the fake path from the address bar and history.
export function trackAction(name: string): void {
  const current = location.pathname + location.search;
  history.pushState({}, '', `/action/${name}`);
  history.replaceState({}, '', current);
}
