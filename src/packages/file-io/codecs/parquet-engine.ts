// #IoFormats #DuckDB
// Node-side Parquet engine: reads/writes Parquet bytes through `@duckdb/node-api`
// using a short-lived temp file (node-api has no in-memory file registration).
// The web build aliases this module to web/src/shims/parquet-engine.ts, which
// does the same over duckdb-wasm's registerFileBuffer / copyFileToBuffer. Both
// expose the identical { readParquetBytes, writeParquetBytes } surface, so the
// parquet codec is runtime-agnostic.
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cellAt, type Row } from '@tamedtable/table-plan';
import type { DuckDBConnection } from '@duckdb/node-api';

// `@duckdb/node-api` is a native addon (it `require`s a platform-specific
// `.node` binary), so it must never be bundled for a browser. The browser
// build already aliases this whole module to the wasm engine, but standalone
// demo bundles (`bun build`, no alias) would still follow a static import into
// the addon and fail to resolve its binaries. Loading it through a computed
// specifier keeps bundlers from following it; in Node it resolves normally.
const NODE_API_SPECIFIER = '@duckdb/node-api';
type NodeApi = typeof import('@duckdb/node-api');
let apiPromise: Promise<NodeApi> | undefined;
function nodeApi(): Promise<NodeApi> {
  return (apiPromise ??= import(NODE_API_SPECIFIER) as Promise<NodeApi>);
}

/** Raw rows (DuckDB values, BIGINT still `bigint`) plus column order. The codec
 *  normalizes; the engine stays a thin DuckDB wrapper. */
export interface RawTable {
  rows: Array<Record<string, unknown>>;
  columns: string[];
}

let connPromise: Promise<DuckDBConnection> | undefined;
function conn(): Promise<DuckDBConnection> {
  return (connPromise ??= (async () => {
    const { DuckDBInstance } = await nodeApi();
    const instance = await DuckDBInstance.create(':memory:');
    return instance.connect();
  })());
}

let tmpSeq = 0;
function tmpFile(ext: string): string {
  return join(tmpdir(), `tamedtable-${process.pid}-${Date.now()}-${tmpSeq++}.${ext}`);
}

const sqlString = (s: string): string => `'${s.replace(/'/g, "''")}'`;
const sqlIdent = (s: string): string => `"${s.replace(/"/g, '""')}"`;

function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return sqlString(s);
}

export async function readParquetBytes(bytes: Uint8Array): Promise<RawTable> {
  const c = await conn();
  const path = tmpFile('parquet');
  await writeFile(path, bytes);
  try {
    const reader = await c.runAndReadAll(`SELECT * FROM read_parquet(${sqlString(path)})`);
    return { rows: reader.getRowObjects(), columns: reader.columnNames() };
  } finally {
    await unlink(path).catch(() => {});
  }
}

export async function writeParquetBytes(rows: Row[], columns: string[]): Promise<Uint8Array> {
  // DuckDB cannot CREATE a table with no columns — the raw parser error
  // ("must have at least one column") would leak to the user. Refuse cleanly.
  if (columns.length === 0) {
    throw new Error('Cannot save a table with no columns as Parquet — add a column or choose another format.');
  }
  const c = await conn();
  const path = tmpFile('parquet');
  // All columns ingest as VARCHAR, mirroring how the engine treats CSV/JSONL
  // cells — string in, string out — so a load→save→load roundtrip is stable.
  await c.run('DROP TABLE IF EXISTS _tt_save');
  const colDefs = columns.map((col) => `${sqlIdent(col)} VARCHAR`).join(', ');
  await c.run(`CREATE TABLE _tt_save (${colDefs})`);
  if (rows.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const valuesSql = slice
        .map((row) => '(' + columns.map((col) => sqlValue(cellAt(row, col))).join(', ') + ')')
        .join(', ');
      await c.run(`INSERT INTO _tt_save VALUES ${valuesSql}`);
    }
  }
  try {
    await c.run(`COPY _tt_save TO ${sqlString(path)} (FORMAT PARQUET)`);
    return new Uint8Array(await readFile(path));
  } finally {
    await unlink(path).catch(() => {});
    await c.run('DROP TABLE IF EXISTS _tt_save').catch(() => {});
  }
}
