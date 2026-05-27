// API key persistence — the Anthropic API key is stored client-side in
// localStorage so the user does not have to re-enter it on every page load.
// All three helpers are no-ops in headless/test environments with no DOM,
// and swallow exceptions from Safari private mode and quota errors.

const API_KEY_STORAGE = 'tamedtable.apiKey';

/** Read the stored API key, if any. Returns null in headless/test environments
 *  with no DOM, or when localStorage access throws (Safari private mode etc.). */
export function readStoredApiKey(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function writeStoredApiKey(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(API_KEY_STORAGE, key);
  } catch {
    // Swallow: storage may be unavailable or quota-bound; the in-memory key
    // still works for this session.
  }
}

export function removeStoredApiKey(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // Swallow as above.
  }
}
