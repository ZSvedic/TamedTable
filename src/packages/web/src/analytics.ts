// #Analytics: cookie-less product analytics via Umami Cloud.
//
// One rule everywhere: analytics must never break the app. Every entry point
// swallows its own errors, and `track` is a no-op when the Umami script has
// not loaded (blocked, offline, tests). Events carry fixed names and, at
// most, coarse enum-like properties: never file names, cell values, chat
// text, keys, or anything else user-authored. The full event list is specced
// in spec/code-contract.md § Analytics; the public /privacy page links the
// live aggregate dashboard where these events show up.

/** The www.tamedtable.com website ID from Umami Cloud. Public by design: it
 *  ships inside the page markup of every visitor. Not a secret. */
export const UMAMI_WEBSITE_ID = '4d86471c-f8c7-42e7-9138-23cd1e8a1314';

export const UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';

/** The one host whose visits count. */
export const ANALYTICS_HOSTNAME = 'www.tamedtable.com';

/** PR previews live at `https://www.tamedtable.com/pr-preview/pr-<N>/`: same
 *  host as production, so the path is what tells them apart. */
export const PREVIEW_PATH_PREFIX = '/pr-preview/';

/** True only on the production site. PR previews and local dev builds run the
 *  same bundle, and the only people who open them are us and the coding
 *  agents, so their visits would drown the real numbers. Keeping them out
 *  here beats filtering them out in the dashboard: the hits never happen. */
export function isTrackedLocation(
  loc: Location | undefined = globalThis.location,
): boolean {
  return (
    !!loc && loc.hostname === ANALYTICS_HOSTNAME && !loc.pathname.startsWith(PREVIEW_PATH_PREFIX)
  );
}

/** Every custom event the app may send. Names are stable: dashboards and the
 *  public analytics page key off them, so rename only with both updated. */
export type AnalyticsEvent =
  | 'open-file' // { source: 'local' | 'url' | 'sample' | 'drop' }
  | 'open-flow'
  | 'chat-request'
  | 'chat-answer' // a request settled as an answer (#Analyze)
  | 'voice-request'
  | 'undo'
  | 'redo'
  | 'run-all'
  | 'save-data' // { format: FormatId }
  | 'save-flow'
  | 'export-python'
  | 'tutorial-play' // { tour: scenario name }
  | 'connect-provider'; // { provider: Provider }

/** Coarse, non-identifying properties only: short fixed vocabularies like a
 *  format id or a provider name. The type stops rich objects at compile time;
 *  keeping user-authored strings out is the call sites' contract above. */
export type AnalyticsProps = Record<string, string | number | boolean>;

type UmamiGlobal = { track?: (event: string, data?: AnalyticsProps) => void };

/** Inject the Umami script tag. Call once at startup; does nothing when the
 *  website ID is empty, `document` is absent (tests, SSR), or the page is not
 *  the production site (`isTrackedLocation`). */
export function initAnalytics(
  doc: Document | undefined = globalThis.document,
  loc: Location | undefined = globalThis.location,
): void {
  try {
    if (!UMAMI_WEBSITE_ID || !doc || !isTrackedLocation(loc)) return;
    if (doc.querySelector('script[data-website-id]')) return;
    const s = doc.createElement('script');
    s.defer = true;
    s.src = UMAMI_SCRIPT_URL;
    s.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
    doc.head.appendChild(s);
  } catch {
    // Analytics never breaks the app.
  }
}

/** Record one custom event. Safe to call from anywhere, any time: missing
 *  script, blocked network, or a throwing tracker are all silent no-ops. */
export function track(event: AnalyticsEvent, data?: AnalyticsProps): void {
  try {
    (globalThis as { umami?: UmamiGlobal }).umami?.track?.(event, data);
  } catch {
    // Analytics never breaks the app.
  }
}
