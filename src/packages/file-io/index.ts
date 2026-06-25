// #FileIO
// Browser-safe file input/output for tables: the FilePort dialog interface,
// format detection, URL fetching, and .flow serialization. This entry has no
// DOM dependency — the browser FilePort implementation lives in the separate
// ./browser-fs entry point. Spec: spec/packages/file-io/behavior.md.

import { validateTablePlan, type Row, type TablePlan } from '@tamedtable/table-plan';
import { detectFormat, formatForExtension, loadCodec, type FormatId } from './codecs/registry.ts';

// The codec registry: format detection, lazy codec loading, and the
// FormatCodec interface. `core` and the web app reach every format through it.
export { detectFormat, formatForExtension, loadCodec, type FormatId } from './codecs/registry.ts';
export type { FormatCodec, ParsedTable } from '@tamedtable/table-plan';

/** Parse a picked/fetched file's content into rows plus a fresh-load TablePlan,
 *  with no filesystem: the format is chosen from `name`'s extension, the codec
 *  parses the content, and the plan carries `name` as its table and the codec's
 *  columns. This is the browser's path-free counterpart to core's `loadCsv` —
 *  the web hands the result straight to `Runner.loadParsed`. */
export async function parseTable(name: string, text: string): Promise<{ rows: Row[]; spec: TablePlan }> {
  const id = formatForExtension(name);
  if (!id) throw new Error(`unknown file type: ${name}`);
  const codec = await loadCodec(id);
  const { rows, columns } = codec.parse(text, name);
  if (id === 'csv') {
    if (columns.length === 0) throw new Error(`${name} has no header row`);
    const seen = new Set<string>();
    for (const c of columns) {
      if (seen.has(c)) throw new Error(`${name} has duplicate column "${c}"`);
      seen.add(c);
    }
  }
  const spec = validateTablePlan({ table: name, columns: columns.map((id) => ({ id })), transformations: [] });
  return { rows, spec };
}

/** A file the user picked from an Open dialog. */
export interface PickedFile {
  /** The file's display name, e.g. "customers.csv". */
  name: string;
  /** The full text content of the file. */
  text: string;
}

/** The result of a Save dialog handshake. */
export type SaveOutcome =
  | { status: 'saved'; name: string }
  | { status: 'downloaded'; name: string }
  | { status: 'cancelled' };

/**
 * File input/output dialogs. The browser implementation uses the File System
 * Access API where available and falls back to a download/upload for browsers
 * that lack it; `hasFileSystemAccess` reports which path is live. Tests
 * supply an in-memory stub.
 */
export interface FilePort {
  /** True when the File System Access API is available in this browser. */
  readonly hasFileSystemAccess: boolean;
  /** Show an Open dialog. Resolves with the picked file, or null if cancelled. */
  pickOpen(accept: string[]): Promise<PickedFile | null>;
  /** Show a Save dialog and write `content` to the chosen destination. */
  pickSave(suggestedName: string, accept: string[], content: string): Promise<SaveOutcome>;
}

/** The plain `fetch` call signature a wrapper actually implements. */
export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

/** Derive a friendly file name from a URL — the last path segment, or a
 *  fallback `download.<ext>` for URLs that don't expose one. */
export function sampleNameFromUrl(url: URL, format: FormatId): string {
  const segment = url.pathname.split('/').filter(Boolean).pop() ?? '';
  if (segment) return segment;
  return `download.${format}`;
}

/** A fetched table: a picked file plus the format detection saw — the URL
 *  path's extension, or the response Content-Type when the path has none. */
export type FetchedTable = PickedFile & { format: FormatId };

/** Fetch a CSV or JSONL table from `url` and return it as a picked file.
 *  Throws on any failure with a message the host can show as-is, so a
 *  dialog can keep itself open with an inline error. */
export async function fetchTable(url: string, fetchImpl: FetchLike = fetch): Promise<FetchedTable> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('Enter a URL.');
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('That doesn’t look like a valid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http:// and https:// URLs are supported.');
  }

  let response: Response;
  try {
    response = await fetchImpl(parsed.toString(), { redirect: 'follow' });
  } catch (e) {
    // A network/CORS failure surfaces as a TypeError with no useful
    // detail in the browser. Rewrite to something the user can act on.
    throw new Error(
      `Couldn’t fetch ${parsed.hostname} — network error or CORS blocked. (${(e as Error).message})`,
    );
  }
  if (!response.ok) {
    throw new Error(`Fetch failed: HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  const format = detectFormat(parsed.pathname, contentType);
  if (!format) {
    throw new Error('Could not detect format. URL must end in .csv or .jsonl.');
  }

  const text = await response.text();
  return { name: sampleNameFromUrl(parsed, format), text, format };
}

/** Serialize a spec into the .flow file format: pretty-printed JSON
 *  `{ version: 2, source, spec }` with a trailing newline. `source` is the
 *  basename of `spec.table`, or `input.csv` when the spec has no table. */
export function serializeFlow(spec: TablePlan): string {
  const source = (spec.table ? spec.table.split('/').pop() : '') || 'input.csv';
  return JSON.stringify({ version: 2, source, spec }, null, 2) + '\n';
}
