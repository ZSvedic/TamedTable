// #ModelConfig — browser localStorage entry point.
// StoragePort implementation: config persisted as a single JSON blob under
// 'tamedtable.config'. All three helpers are no-ops in environments with no
// localStorage (Node, headless tests), and swallow exceptions from Safari
// private mode and quota errors. Shared by the web app and the demo page.
//
// Backward compat: if the old 'tamedtable.apiKey' key exists and the new key
// doesn't, migrate the old value to { anthropicKey: oldValue } on first read
// and remove the old key.

import type { Provider, ResolvedConfig, Tier } from './index.ts';
import type { ModelMeasure } from './probe.ts';

const CONFIG_STORAGE = 'tamedtable.config';
const LEGACY_KEY_STORAGE = 'tamedtable.apiKey';
const PROBE_STORAGE = 'tamedtable.probes';

// Minimal localStorage surface, looked up via globalThis: this file is part
// of the Node typecheck, which has no DOM lib.
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function store(): StorageLike | undefined {
  return (globalThis as { localStorage?: StorageLike }).localStorage;
}

/** Read the stored config, if any. Returns {} in environments with no
 *  localStorage, or when localStorage access throws. */
export function readStoredConfig(): Partial<ResolvedConfig> {
  try {
    const localStorage = store();
    if (localStorage === undefined) return {};

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
    const localStorage = store();
    if (localStorage === undefined) return;
    localStorage.setItem(CONFIG_STORAGE, JSON.stringify(c));
  } catch {
    // Swallow: storage may be unavailable or quota-bound; the in-memory
    // config still works for this session.
  }
}

export function clearStoredConfig(): void {
  try {
    const localStorage = store();
    if (localStorage === undefined) return;
    localStorage.removeItem(CONFIG_STORAGE);
    localStorage.removeItem(LEGACY_KEY_STORAGE);
  } catch {
    // Swallow as above.
  }
}

// ── Measurement cache ──────────────────────────────────────────────────────
// What each connected provider's models cost and how fast they are, so a
// reopened panel shows its numbers without paying for the calls again. This is
// a display cache, not config: the engine never reads it, and losing it costs a
// re-measure rather than a working setup. That is why it lives in its own blob
// — the config blob stays exactly what the engine is built from.

/** One provider's card contents, beyond what the config already says. A role
 *  is absent while it has not been measured, null when its measurement failed,
 *  and the numbers once they are in. */
export interface ProviderProbe {
  tier: Tier;
  primary?: ModelMeasure | null;
  secondary?: ModelMeasure | null;
}

export type StoredProbes = Partial<Record<Provider, ProviderProbe>>;

export function readStoredProbes(): StoredProbes {
  try {
    const localStorage = store();
    if (localStorage === undefined) return {};
    const raw = localStorage.getItem(PROBE_STORAGE);
    return raw ? (JSON.parse(raw) as StoredProbes) : {};
  } catch {
    return {};
  }
}

export function writeStoredProbes(p: StoredProbes): void {
  try {
    const localStorage = store();
    if (localStorage === undefined) return;
    localStorage.setItem(PROBE_STORAGE, JSON.stringify(p));
  } catch {
    // Swallow as above — an unwritable cache just means measuring again.
  }
}

export function clearStoredProbes(): void {
  try {
    const localStorage = store();
    if (localStorage === undefined) return;
    localStorage.removeItem(PROBE_STORAGE);
  } catch {
    // Swallow as above.
  }
}
