// #IoFormats
// Arrow / Feather codec via apache-arrow (pure JS — same code in Node and the
// browser, no DuckDB extension). Reads any Arrow IPC file; writes the Arrow IPC
// *file* format (a.k.a. Feather v2). Per-format notes:
// spec/packages/file-io/formats/arrow.md.
import { Table, Utf8, type Vector, tableFromIPC, tableToIPC, vectorFromArray } from 'apache-arrow';
import { cellAt, type FormatCodec, type ParsedTable, type Row } from '@tamedtable/table-plan';
import { normalizeRows, warnIfHuge } from './values.ts';

function cellToString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

export const arrowCodec: FormatCodec = {
  id: 'arrow',
  extensions: ['.arrow', '.feather', '.arrows'],
  contentTypes: ['arrow', 'feather', 'vnd.apache.arrow'],

  parse(bytes: Uint8Array, name: string): ParsedTable {
    warnIfHuge(bytes, name);
    const table = tableFromIPC(bytes);
    const columns = table.schema.fields.map((f) => f.name);
    const raw = table
      .toArray()
      .map((r) => (r as { toJSON(): Record<string, unknown> }).toJSON());
    return { rows: normalizeRows(raw), columns };
  },

  // `headers` (CSV label handling) does not apply to Arrow — the schema keeps
  // the column ids so a load→save→load round-trip stays stable.
  serialize(rows: Row[], columns: string[]): Uint8Array {
    // Every column is nullable Utf8 — string in, string out — matching the
    // engine's CSV/JSONL cell model and the Parquet codec. An explicit Utf8
    // type keeps the schema stable even when there are zero rows.
    const fields: Record<string, Vector> = {};
    for (const col of columns) {
      const values = rows.map((r) => cellToString(cellAt(r, col)));
      fields[col] = vectorFromArray(values, new Utf8());
    }
    return tableToIPC(new Table(fields), 'file');
  },
};
