// #Cassettes
// Record/replay recorder for model API calls — test infrastructure.
// See spec/code-contract.md § Headless ("Recording model calls for tests").

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

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

// `fetch` already decoded the upstream response and the saved body is plain
// text, so these transfer headers would misdescribe the reconstructed body.
const DROP_HEADERS = new Set(['content-encoding', 'content-length']);

/** SHA-256 hex digest of `method + "\n" + url + "\n" + body`. */
export function fingerprint(method: string, url: string, body: string): string {
  return createHash('sha256').update(`${method}\n${url}\n${body}`).digest('hex');
}

function requestUrl(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requestBody(init?: RequestInit): string {
  const body = init?.body;
  if (body == null) return '';
  return typeof body === 'string' ? body : String(body);
}

function toEntry(res: Response, body: string): CassetteEntry {
  const headers: Record<string, string> = {};
  for (const [k, v] of res.headers.entries()) {
    if (!DROP_HEADERS.has(k.toLowerCase())) headers[k] = v;
  }
  return { status: res.status, statusText: res.statusText, headers, body };
}

function toResponse(entry: CassetteEntry): Response {
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
  });
}

/** A `fetch`-shaped wrapper that records to / replays from the cassette file. */
export function cassetteFetch(opts: CassetteOptions): FetchLike {
  const { mode, file } = opts;
  const upstream: FetchLike = opts.upstream ?? globalThis.fetch;
  let tape: Record<string, CassetteEntry> | undefined;

  const load = (): Record<string, CassetteEntry> => {
    if (!tape) {
      tape = existsSync(file)
        ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, CassetteEntry>)
        : {};
    }
    return tape;
  };

  // Keys sorted so re-recording produces reviewable diffs.
  const flush = (cassette: Record<string, CassetteEntry>): void => {
    mkdirSync(dirname(file), { recursive: true });
    const sorted = Object.fromEntries(
      Object.entries(cassette).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
    writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
  };

  return async (input, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const url = requestUrl(input);
    const fp = fingerprint(method, url, requestBody(init));

    const cassette = load();
    const hit = cassette[fp];
    if (hit) return toResponse(hit);

    if (mode === 'replay') {
      throw new Error(`no recording for this request: ${fp} (${method} ${url})`);
    }

    const res = await upstream(input, init);
    const entry = toEntry(res, await res.text());
    // Only cache a success. A retryable error (429, 5xx) is returned unsaved so
    // the SDK's own retry reaches the live API and the eventual success — not
    // the transient error — is what lands in the cassette.
    if (res.status >= 200 && res.status < 300) {
      cassette[fp] = entry;
      flush(cassette);
    }
    return toResponse(entry);
  };
}
