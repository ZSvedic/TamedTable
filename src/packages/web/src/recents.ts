// #FileIO
// The Open menu's "Recent" list: the last few successful loads, persisted to
// localStorage best-effort (in-memory when it is unavailable: private mode,
// tests). Storage only: what clicking an entry does lives in FilesManager.

/** How an entry was loaded: the badge the menu shows, and what a click does:
 *  `sample`/`url` reload the stored address, `local`/`flow` re-open the
 *  matching picker (a browser cannot silently reopen a local file). */
export type RecentKind = 'sample' | 'url' | 'local' | 'flow';

export interface RecentEntry {
  kind: RecentKind;
  /** Display name, e.g. "customers.csv". */
  label: string;
  /** Reload address: set for `sample` and `url` kinds. */
  url?: string;
}

const STORAGE_KEY = 'tamedtable-recents';
const MAX_ENTRIES = 5;

export class RecentsStore {
  private entries: RecentEntry[];

  constructor() {
    this.entries = RecentsStore.load();
  }

  /** Newest first, at most 5. */
  list(): RecentEntry[] {
    return this.entries;
  }

  /** Put `entry` at the top, dropping any older duplicate and the overflow. */
  record(entry: RecentEntry): void {
    this.entries = [entry, ...this.entries.filter((e) => !RecentsStore.same(e, entry))].slice(0, MAX_ENTRIES);
    this.save();
  }

  /** Drop `entry`: a reload that failed, or a stale address superseded by a
   *  re-resolved one (spec/behavior.md § Web UI, Recent). */
  remove(entry: RecentEntry): void {
    this.entries = this.entries.filter((e) => !RecentsStore.same(e, entry));
    this.save();
  }

  private static same(a: RecentEntry, b: RecentEntry): boolean {
    return a.kind === b.kind && a.label === b.label && a.url === b.url;
  }

  private static load(): RecentEntry[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (e): e is RecentEntry =>
            !!e && typeof (e as RecentEntry).label === 'string' && typeof (e as RecentEntry).kind === 'string',
        )
        .slice(0, MAX_ENTRIES);
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
      }
    } catch {
      // Best-effort persistence: the in-memory list still works this session.
    }
  }
}
