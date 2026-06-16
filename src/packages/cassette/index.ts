// #Cassettes
// Shared cassette primitives — the fingerprint, the on-tape entry shape, and a
// replay-only fetch — used by BOTH the Cucumber suite (src/tests/cassette.ts,
// which adds the Node-fs record/replay file layer) and the browser web shell
// (tutorial playback replays a fetched cassette so a key-free visitor can run a
// full tour). No Node imports, so it loads unchanged in a browser; the hash
// goes through Web Crypto, which Node, Bun, and browsers all expose.
//
// See spec/code-contract.md § Headless ("Recording model calls for tests") and
// § Tutorial mode ("Key-free playback").

/** The plain call signature a custom fetch wrapper actually implements. The
 *  SDK's own fetch field is typed `typeof globalThis.fetch` (which also carries
 *  `preconnect`); the headless runner bridges the two when it forwards. */
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface CassetteEntry {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

/** A cassette file's in-memory shape: fingerprint → recorded response. */
export type Cassette = Record<string, CassetteEntry>;

// `fetch` already decoded the upstream response and the saved body is plain
// text, so these transfer headers would misdescribe the reconstructed body.
const DROP_HEADERS = new Set(['content-encoding', 'content-length']);

/** SHA-256 hex digest of `method + "\n" + url + "\n" + body`. Hashed through
 *  Web Crypto so the same digest is reachable from Node, Bun, and the browser;
 *  the hex output matches what `node:crypto`'s `createHash` produced before, so
 *  cassettes recorded by the old synchronous path still match. */
export async function fingerprint(method: string, url: string, body: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${method}\n${url}\n${body}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function requestUrl(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function requestBody(init?: RequestInit): string {
  const body = init?.body;
  if (body == null) return '';
  return typeof body === 'string' ? body : String(body);
}

export function entryFromResponse(res: Response, body: string): CassetteEntry {
  const headers: Record<string, string> = {};
  for (const [k, v] of res.headers.entries()) {
    if (!DROP_HEADERS.has(k.toLowerCase())) headers[k] = v;
  }
  return { status: res.status, statusText: res.statusText, headers, body };
}

export function responseFromEntry(entry: CassetteEntry): Response {
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
  });
}

/** A replay-only `fetch` over an already-loaded tape: a hit returns the
 *  recorded response; a miss throws (never the network). The browser tutorial
 *  player and the test recorder's replay mode share this lookup so a stale hit
 *  is impossible and a changed prompt is simply a loud miss. */
export function replayFetch(tape: Cassette): FetchLike {
  return async (input, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const url = requestUrl(input);
    const fp = await fingerprint(method, url, requestBody(init));
    const hit = tape[fp];
    if (!hit) throw new Error(`no recording for this request: ${fp} (${method} ${url})`);
    return responseFromEntry(hit);
  };
}
