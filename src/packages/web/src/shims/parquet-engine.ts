// #IoFormats
// Browser Parquet engine. The Vite build redirects file-io's parquet-engine.ts
// (node-api + temp file) to this module. Reading uses hyparquet, a pure-JS
// Parquet reader that works offline, unlike duckdb-wasm's Parquet support, which
// autoloads an extension from extensions.duckdb.org (blocked offline, and in the
// preview build). Writing Parquet from the browser isn't wired (the web "Save
// data" path writes JSONL); the desktop CLI writes Parquet through node-api.
import { parquetMetadata, parquetReadObjects, parquetSchema } from 'hyparquet';
import { parquetWriteBuffer } from 'hyparquet-writer';
import { cellAt, type Row } from '@tamedtable/core';

export interface RawTable {
  rows: Array<Record<string, unknown>>;
  columns: string[];
}

export async function readParquetBytes(bytes: Uint8Array): Promise<RawTable> {
  // hyparquet reads from a plain ArrayBuffer; copy the view into a fresh,
  // zero-offset buffer (also sidesteps SharedArrayBuffer typing).
  const file = new Uint8Array(bytes).buffer;
  const columns = parquetSchema(parquetMetadata(file)).children.map((c) => c.element.name);
  const rows = (await parquetReadObjects({ file })) as Array<Record<string, unknown>>;
  return { rows, columns };
}

export function writeParquetBytes(rows: Row[], columns: string[]): Promise<Uint8Array> {
  // Every column as STRING (string in, string out) matching the Node engine
  // and the CSV/JSONL/Arrow codecs, so a load→save→load round-trip is stable.
  const cell = (v: unknown): string | null =>
    v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const columnData = columns.map((name) => ({
    name,
    data: rows.map((r) => cell(cellAt(r, name))),
    type: 'STRING' as const,
  }));
  return Promise.resolve(new Uint8Array(parquetWriteBuffer({ columnData })));
}
