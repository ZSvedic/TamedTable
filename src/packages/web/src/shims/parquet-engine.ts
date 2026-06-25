// #IoFormats
// Browser Parquet engine. The Vite build redirects file-io's parquet-engine.ts
// (node-api + temp file) to this module. Reading uses hyparquet — a pure-JS
// Parquet reader that works offline, unlike duckdb-wasm's Parquet support, which
// autoloads an extension from extensions.duckdb.org (blocked offline, and in the
// preview build). Writing Parquet from the browser isn't wired (the web "Save
// data" path writes JSONL); the desktop CLI writes Parquet through node-api.
import { parquetMetadata, parquetReadObjects, parquetSchema } from 'hyparquet';
import type { Row } from '@tamedtable/core';

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

export function writeParquetBytes(_rows: Row[], _columns: string[]): Promise<Uint8Array> {
  return Promise.reject(
    new Error('Saving Parquet from the browser is not supported — use the CLI (:save out.parquet).'),
  );
}
