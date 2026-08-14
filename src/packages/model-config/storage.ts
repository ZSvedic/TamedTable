// #ModelConfig — browser localStorage entry point.
// StoragePort implementation: config persisted as a single JSON blob under
// 'tamedtable.config'. All three helpers are no-ops in environments with no
// localStorage (Node, headless tests), and swallow exceptions from Safari
// private mode and quota errors. Shared by the web app and the demo page.
//
// Backward compat: if the old 'tamedtable.apiKey' key exists and the new key
// doesn't, migrate the old value to { anthropicKey: oldValue } on first read
// and remove the old key.

import { DEFAULTS, defaultCellModel, defaultModel } from './index.ts';
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

/** How long a speed reading is worth showing. A provider that was slow last
 *  month is not a provider that is slow now. */
const PROBE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** A measurement plus what it was taken from. Both can go stale underneath it
 *  — a `models.json` default change retires the model, and time retires the
 *  numbers — so both are recorded and both are checked on read. */
export interface StoredMeasure extends ModelMeasure {
  /** The model id the numbers came from. */
  model: string;
  /** Milliseconds-since-epoch of the measurement. */
  at: number;
}

/** One provider's card contents, beyond what the config already says. A role
 *  is absent while it has not been measured, null when its measurement failed,
 *  and the numbers once they are in. */
export interface ProviderProbe {
  tier: Tier;
  /** Milliseconds-since-epoch the key was connected — what the card order is
   *  sorted by. Absent in blobs written before card order was tracked. */
  connectedAt?: number;
  chat?: StoredMeasure | null;
  cell?: StoredMeasure | null;
}

export type StoredProbes = Partial<Record<Provider, ProviderProbe>>;

/** Keep a reading only while it still describes the model the card names and
 *  is recent enough to mean anything. Anything else reads as unmeasured, which
 *  the card renders as no `~Z sec` tail at all rather than as a wrong one. */
function stillTrue(
  m: StoredMeasure | null | undefined, wanted: string, now: number,
): StoredMeasure | null | undefined {
  if (m == null) return m;
  if (m.model !== wanted) return undefined;
  return now - m.at > PROBE_TTL_MS ? undefined : m;
}

/** Read the cache, dropping readings that can no longer be trusted. The tier
 *  and `connectedAt` survive — they are not measurements and do not go stale,
 *  so a card whose numbers expired is still a card. `now` is injectable so a
 *  scenario can age a reading without waiting a week. */
export function readStoredProbes(now: number = Date.now()): StoredProbes {
  try {
    const localStorage = store();
    if (localStorage === undefined) return {};
    const raw = localStorage.getItem(PROBE_STORAGE);
    if (!raw) return {};
    const stored = JSON.parse(raw) as StoredProbes;
    const kept: StoredProbes = {};
    for (const id of Object.keys(stored) as Provider[]) {
      const probe = stored[id];
      // A provider this build has no defaults for — written by a newer build,
      // or dropped since. There is no current model to compare against, so
      // there is nothing to show either.
      if (!probe || !(id in DEFAULTS)) continue;
      kept[id] = {
        ...probe,
        chat: stillTrue(probe.chat, defaultModel(id), now),
        cell: stillTrue(probe.cell, defaultCellModel(id), now),
      };
    }
    return kept;
  } catch {
    return {};
  }
}

/** What a card row shows for speed: the numbers once they are in,
 *  `'measuring'` while the call is out, `'failed'` when it came back an error,
 *  and null when the row has never been measured. The last two are separate
 *  states because they are separate facts, and a row that just went blank told
 *  the user neither one. */
export type RoleSpeed = ModelMeasure | 'measuring' | 'failed' | null;

/** Read a stored reading as a row's speed. Absent and null are different
 *  things — never measured versus measured and failed — so they must not
 *  render the same. Lives here rather than in the component because both hosts
 *  (the web app's SettingsPanel and the demo page) build their rows from this
 *  same blob, and only one place should have to remember which is which. */
export function speedOf(
  reading: StoredMeasure | null | undefined, measuring: boolean,
): RoleSpeed {
  if (reading === undefined) return measuring ? 'measuring' : null;
  return reading === null ? 'failed' : reading;
}

/** The `connectedProviders` order map, read out of the probe blob: card order
 *  is display, so the timestamps live with the measurements rather than in the
 *  config the engine is built from. */
export function connectedOrder(probes: StoredProbes): Partial<Record<Provider, number>> {
  const order: Partial<Record<Provider, number>> = {};
  for (const id of Object.keys(probes) as Provider[]) {
    const at = probes[id]?.connectedAt;
    if (at !== undefined) order[id] = at;
  }
  return order;
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
