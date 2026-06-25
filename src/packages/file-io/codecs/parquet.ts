// #IoFormats #DuckDB
// Parquet codec. Reading and writing both go through the shared DuckDB engine
// (./parquet-engine.ts — node-api in Node, duckdb-wasm in the browser). Per-format
// notes: spec/packages/file-io/formats/parquet.md.
import type { FormatCodec, ParsedTable, Row } from '@tamedtable/table-plan';
import { readParquetBytes, writeParquetBytes } from './parquet-engine.ts';
import { normalizeRows, warnIfHuge } from './values.ts';

export const parquetCodec: FormatCodec = {
  id: 'parquet',
  extensions: ['.parquet', '.pq'],
  contentTypes: ['parquet'],

  async parse(bytes: Uint8Array, name: string): Promise<ParsedTable> {
    warnIfHuge(bytes, name);
    const { rows, columns } = await readParquetBytes(bytes);
    return { rows: normalizeRows(rows), columns };
  },

  serialize(rows: Row[], columns: string[]): Promise<Uint8Array> {
    return writeParquetBytes(rows, columns);
  },
};
