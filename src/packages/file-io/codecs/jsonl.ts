// #FileIO #IoFormats
// The pure-JS JSONL codec: one JSON object per line, native JSON.parse /
// JSON.stringify. Columns are the union of keys in first-seen order. Per-format
// quirks: spec/packages/file-io/formats/jsonl.md.
import { cellAt, setCell, type FormatCodec, type ParsedTable, type Row } from '@tamedtable/table-plan';

export const jsonlCodec: FormatCodec = {
  id: 'jsonl',
  extensions: ['.jsonl', '.ndjson'],
  contentTypes: ['jsonl', 'ndjson'],

  parse(bytes: Uint8Array, name: string): ParsedTable {
    const text = new TextDecoder().decode(bytes);
    const rows: Row[] = [];
    text.split('\n').forEach((raw, i) => {
      const line = raw.trim();
      if (line === '') return;
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch (e) {
        throw new Error(`${name}:${i + 1} malformed JSON: ${(e as Error).message}`);
      }
      // JSONL is one JSON *object* per line: a null, array, number, string, or
      // boolean line is not a table row and would otherwise load as a garbage
      // row (or crash on Object.keys(null)).
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${name}:${i + 1} not a JSON object: ${line}`);
      }
      rows.push(value as Row);
    });
    const columns: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) { seen.add(key); columns.push(key); }
      }
    }
    return { rows, columns };
  },

  // `columns` is optional for JSONL: when omitted, each row is written verbatim
  // in its own key order; when given, keys are emitted in that order (missing
  // ones filled with null) followed by any extra keys not in the list.
  serialize(rows: Row[], columns?: string[]): Uint8Array {
    const lines = rows
      .map((row) => {
        if (!columns) return JSON.stringify(row);
        const ordered: Row = {};
        // Read/write through the prototype-safe helpers so a `__proto__` column
        // survives the round-trip; JS `undefined` renders as `null` (a listed
        // column always carries a key), matching the CSV save's empty cell.
        for (const col of columns) setCell(ordered, col, cellAt(row, col) ?? null);
        for (const k of Object.keys(row)) if (!Object.hasOwn(ordered, k)) setCell(ordered, k, row[k] ?? null);
        return JSON.stringify(ordered);
      })
      .join('\n');
    return new TextEncoder().encode(lines + (lines.length ? '\n' : ''));
  },
};
