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
  missMessage,
  parseCassette,
  requestBody,
  requestUrl,
  responseFromEntry,
  serializeCassette,
  splitBody,
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
        ? parseCassette(readFileSync(file, 'utf8'))
        : { prefixes: {}, entries: {} };
    }
    return tape;
  };

  const flush = (cassette: Cassette): void => {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, serializeCassette(cassette));
  };

  return async (input, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const url = requestUrl(input);
    const body = requestBody(init);
    const fp = await fingerprint(method, url, body);

    const cassette = load();
    const hit = cassette.entries[fp];
    if (hit) return responseFromEntry(hit);

    if (mode === 'replay') {
      throw new Error(missMessage(cassette, fp, method, url, body));
    }

    const res = await upstream(input, init);
    const entry = entryFromResponse(res, await res.text());
    // Only cache a success. A retryable error (429, 5xx) is returned unsaved so
    // the SDK's own retry reaches the live API and the eventual success — not
    // the transient error — is what lands in the cassette.
    if (res.status >= 200 && res.status < 300) {
      // The readable-request record: dedupe the boilerplate the body shares
      // with other recordings into the tape's prefixes, keep only the part
      // that varies on the entry.
      entry.request = { method, url, ...splitBody(cassette, body) };
      cassette.entries[fp] = entry;
      flush(cassette);
    }
    return responseFromEntry(entry);
  };
}
