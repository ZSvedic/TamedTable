// Config persistence — stored client-side in localStorage as a single JSON
// blob under 'tamedtable.config'. All three helpers are no-ops in headless/test
// environments with no DOM, and swallow exceptions from Safari private mode and
// quota errors.
//
// Backward compat: if the old 'tamedtable.apiKey' key exists and the new key
// doesn't, migrate the old value to { anthropicKey: oldValue } on first read
// and remove the old key.

import type { ResolvedConfig } from '@tamedtable/model-config';

const CONFIG_STORAGE = 'tamedtable.config';
const LEGACY_KEY_STORAGE = 'tamedtable.apiKey';

/** Read the stored config, if any. Returns {} in headless/test environments
 *  with no DOM, or when localStorage access throws. */
export function readStoredConfig(): Partial<ResolvedConfig> {
  try {
    if (typeof localStorage === 'undefined') return {};

    const raw = localStorage.getItem(CONFIG_STORAGE);
    if (raw) {
      return JSON.parse(raw) as Partial<ResolvedConfig>;
    }

    // Backward compat: migrate the old single-key entry.
    const legacy = localStorage.getItem(LEGACY_KEY_STORAGE);
    if (legacy) {
      const migrated: Partial<ResolvedConfig> = { anthropicKey: legacy };
      try {
        localStorage.setItem(CONFIG_STORAGE, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_KEY_STORAGE);
      } catch {
        // Swallow: if migration write fails the legacy value still works for
        // this session; we'll retry on the next read.
      }
      return migrated;
    }

    return {};
  } catch {
    return {};
  }
}

export function writeStoredConfig(c: Partial<ResolvedConfig>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CONFIG_STORAGE, JSON.stringify(c));
  } catch {
    // Swallow: storage may be unavailable or quota-bound; the in-memory
    // config still works for this session.
  }
}

export function clearStoredConfig(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(CONFIG_STORAGE);
    localStorage.removeItem(LEGACY_KEY_STORAGE);
  } catch {
    // Swallow as above.
  }
}
