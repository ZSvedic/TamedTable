// #Cassettes
// Record/replay recorder for model API calls — test infrastructure. The
// fingerprint, entry shape, and replay lookup live in @tamedtable/cassette so
// the browser web shell can replay the same recordings; this file keeps the
// Node-only file layer (read/write the cassette JSON on disk, record on a miss).
// See spec/code-contract.md § Headless ("Recording model calls for tests").

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  entryFromResponse,
  fingerprint,
  requestBody,
  requestUrl,
  responseFromEntry,
  type Cassette,
  type CassetteEntry,
  type FetchLike,
} from '@tamedtable/cassette';

export { fingerprint };
export type { CassetteEntry, FetchLike };

export type CassetteMode = 'record' | 'replay';

export interface CassetteOptions {
  mode: CassetteMode;
  file: string;
  upstream?: FetchLike;
}

// #Cassettes
/** A `fetch`-shaped wrapper that records to / replays from the cassette file. */
export function cassetteFetch(opts: CassetteOptions): FetchLike {
  const { mode, file } = opts;
  const upstream: FetchLike = opts.upstream ?? globalThis.fetch;
  let tape: Cassette | undefined;

  const load = (): Cassette => {
    if (!tape) {
      tape = existsSync(file)
        ? (JSON.parse(readFileSync(file, 'utf8')) as Cassette)
        : {};
    }
    return tape;
  };

  // Keys sorted so re-recording produces reviewable diffs.
  const flush = (cassette: Cassette): void => {
    mkdirSync(dirname(file), { recursive: true });
    const sorted = Object.fromEntries(
      Object.entries(cassette).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
    writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
  };

  return async (input, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const url = requestUrl(input);
    const fp = await fingerprint(method, url, requestBody(init));

    const cassette = load();
    const hit = cassette[fp];
    if (hit) return responseFromEntry(hit);

    if (mode === 'replay') {
      throw new Error(`no recording for this request: ${fp} (${method} ${url})`);
    }

    const res = await upstream(input, init);
    const entry = entryFromResponse(res, await res.text());
    // Only cache a success. A retryable error (429, 5xx) is returned unsaved so
    // the SDK's own retry reaches the live API and the eventual success — not
    // the transient error — is what lands in the cassette.
    if (res.status >= 200 && res.status < 300) {
      cassette[fp] = entry;
      flush(cassette);
    }
    return responseFromEntry(entry);
  };
}
