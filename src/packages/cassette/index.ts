// #Cassettes
// Shared cassette primitives: the fingerprint, the on-tape entry shape, and a
// replay-only fetch: used by BOTH the Cucumber suite (src/tests/cassette.ts,
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

/** Human-readable record of the request an entry answers. `prefixId` names an
 *  entry in the file's `_prefixes` map (or is null when the body shares no long
 *  prefix with any other recording); `prefix + suffix` reconstructs the exact
 *  original body bytes, and `fingerprint(method, url, prefix + suffix)` equals
 *  the entry key. */
export interface CassetteRequest {
  method: string;
  url: string;
  prefixId: string | null;
  suffix: string;
}

export interface CassetteEntry {
  /** Absent on entries recorded before the readable-request format; they
   *  replay as-is and gain one when their cassette is re-recorded. */
  request?: CassetteRequest;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

/** A cassette's in-memory shape: the deduplicated request boilerplate plus
 *  fingerprint → recorded response. On disk the prefixes sit under the
 *  reserved `_prefixes` key, which can never collide with an entry key
 *  (always a 64-char hex fingerprint). */
export interface Cassette {
  prefixes: Record<string, string>;
  entries: Record<string, CassetteEntry>;
}

const PREFIXES_KEY = '_prefixes';

/** A body must share at least this many leading chars with another recording
 *  before the run is worth deduplicating into `_prefixes`. */
export const MIN_SHARED_PREFIX = 200;

export function parseCassette(text: string): Cassette {
  const raw = JSON.parse(text) as Record<string, unknown>;
  const { [PREFIXES_KEY]: prefixes, ...entries } = raw;
  return {
    prefixes: (prefixes ?? {}) as Record<string, string>,
    entries: entries as Record<string, CassetteEntry>,
  };
}

/** Pretty-printed with `_prefixes` first and entry keys sorted, so
 *  re-recording produces reviewable diffs. Prefixes no entry references
 *  anymore (orphaned by a re-split) are dropped. */
export function serializeCassette(tape: Cassette): string {
  const used = new Set(
    Object.values(tape.entries).map((e) => e.request?.prefixId).filter((id): id is string => id != null),
  );
  const prefixes = Object.fromEntries(
    Object.entries(tape.prefixes).filter(([id]) => used.has(id)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  const entries = Object.entries(tape.entries)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([fp, e]) => [fp, { request: e.request, status: e.status, statusText: e.statusText, headers: e.headers, body: e.body }]);
  const file: Record<string, unknown> = Object.keys(prefixes).length ? { [PREFIXES_KEY]: prefixes } : {};
  for (const [fp, e] of entries) file[fp as string] = e;
  return JSON.stringify(file, null, 2) + '\n';
}

/** The exact request body an entry answers, or undefined for a pre-format
 *  entry that recorded no request. */
export function entryBody(tape: Cassette, entry: CassetteEntry): string | undefined {
  const r = entry.request;
  if (!r) return undefined;
  return (r.prefixId ? tape.prefixes[r.prefixId] ?? '' : '') + r.suffix;
}

function commonPrefixLen(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

/** Split a request body against the tape's known prefixes: reuse the longest
 *  prefix the body starts with, or mint a new one from the longest common run
 *  (≥ MIN_SHARED_PREFIX) it shares with an already-recorded body: re-splitting
 *  the entries that share it so the boilerplate is stored once. May add to
 *  `tape.prefixes` and rewrite existing entries' `request`. */
export function splitBody(tape: Cassette, body: string): { prefixId: string | null; suffix: string } {
  let best: { id: string; len: number } | null = null;
  for (const [id, p] of Object.entries(tape.prefixes)) {
    if (body.startsWith(p) && (best === null || p.length > best.len)) best = { id, len: p.length };
  }
  if (best !== null) return { prefixId: best.id, suffix: body.slice(best.len) };

  let sharedLen = 0;
  for (const e of Object.values(tape.entries)) {
    const other = entryBody(tape, e);
    if (other !== undefined) sharedLen = Math.max(sharedLen, commonPrefixLen(body, other));
  }
  if (sharedLen < MIN_SHARED_PREFIX) return { prefixId: null, suffix: body };

  const prefix = body.slice(0, sharedLen);
  let n = Object.keys(tape.prefixes).length + 1;
  while (tape.prefixes[`p${n}`] !== undefined) n++;
  const prefixId = `p${n}`;
  tape.prefixes[prefixId] = prefix;
  for (const e of Object.values(tape.entries)) {
    const full = entryBody(tape, e);
    if (full === undefined || !full.startsWith(prefix)) continue;
    const current = e.request!.prefixId ? (tape.prefixes[e.request!.prefixId!] ?? '').length : 0;
    if (prefix.length > current) e.request = { ...e.request!, prefixId, suffix: full.slice(prefix.length) };
  }
  return { prefixId, suffix: body.slice(sharedLen) };
}

function excerpt(text: string, at: number): string {
  const from = Math.max(0, at - 20);
  return JSON.stringify(`${from > 0 ? '…' : ''}${text.slice(from, at + 40)}${at + 40 < text.length ? '…' : ''}`);
}

/** The replay-miss error message. When some entry recorded its request, names
 *  the nearest one and the byte where the two first diverge. */
export function missMessage(tape: Cassette, fp: string, method: string, url: string, body: string): string {
  const target = `${method}\n${url}\n${body}`;
  let bestLen = -1;
  let bestKey: string | undefined;
  let bestText: string | undefined;
  for (const [key, e] of Object.entries(tape.entries)) {
    const recorded = entryBody(tape, e);
    if (recorded === undefined) continue;
    const text = `${e.request!.method}\n${e.request!.url}\n${recorded}`;
    const n = commonPrefixLen(target, text);
    if (n > bestLen) { bestLen = n; bestKey = key; bestText = text; }
  }
  let msg = `no recording for this request: ${fp} (${method} ${url})`;
  if (bestText !== undefined) {
    msg += `; nearest entry ${bestKey!.slice(0, 12)}… differs at byte ${bestLen}: recorded ${excerpt(bestText, bestLen)}, requested ${excerpt(target, bestLen)}`;
  }
  return msg;
}

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
    const body = requestBody(init);
    const fp = await fingerprint(method, url, body);
    const hit = tape.entries[fp];
    if (!hit) throw new Error(missMessage(tape, fp, method, url, body));
    return responseFromEntry(hit);
  };
}
