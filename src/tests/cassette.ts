// Record/replay recorder for model API calls — test infrastructure.
// See spec/code-contract.md § Headless ("Recording model calls for tests").
//
// Phase 3 (TDD red): types and signatures only. The recorder body lands in
// phase 4 — until then every call throws so cassettes.feature stays red.

// The plain call signature a custom fetch wrapper actually implements. The
// SDK's own fetch field is typed `typeof globalThis.fetch` (which also carries
// `preconnect`); the headless runner bridges the two when it forwards.
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type CassetteMode = 'record' | 'replay';

export interface CassetteEntry {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface CassetteOptions {
  mode: CassetteMode;
  file: string;
  upstream?: FetchLike;
}

/** SHA-256 hex digest of `method + "\n" + url + "\n" + body`. */
export function fingerprint(_method: string, _url: string, _body: string): string {
  throw new Error('cassette: fingerprint not implemented (phase 4)');
}

/** A `fetch`-shaped wrapper that records to / replays from the cassette file. */
export function cassetteFetch(_opts: CassetteOptions): FetchLike {
  throw new Error('cassette: cassetteFetch not implemented (phase 4)');
}
