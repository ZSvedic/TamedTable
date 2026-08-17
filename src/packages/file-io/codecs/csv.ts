// #FileIO #IoFormats #CsvSerialize
// The pure-JS CSV codec. Parse with `csv-parse` (RFC 4180, trimmed unquoted
// whitespace, BOM tolerated); serialize with `csv-stringify` (RFC 4180 quoting,
// \n line endings, no BOM). Per-format quirks: spec/packages/file-io/formats/csv.md.
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { cellAt, cellDisplay, setCell, type FormatCodec, type ParsedTable, type Row } from '@tamedtable/table-plan';

// #NestedCells: CSV has no nested types, so a cell holding a list or object
// writes as the same compact JSON the grid shows it as.
const csvCellString = cellDisplay;

export const csvCodec: FormatCodec = {
  id: 'csv',
  extensions: ['.csv'],
  contentTypes: ['csv'],

  parse(bytes: Uint8Array): ParsedTable {
    const text = new TextDecoder().decode(bytes);
    // Parse as arrays, not keyed records: the header is the first *record*, so a
    // quoted newline inside a header field stays one record (RFC 4180), and the
    // same `skip_empty_lines` covers both header and rows: a leading blank line
    // no longer yields a phantom `[""]` header. csv-parse still rejects ragged
    // rows (Invalid Record Length) in array mode. Rows are built with `setCell`
    // so a column literally named `__proto__` lands as an own property.
    const records = parse(text, { skip_empty_lines: true, trim: true, bom: true }) as string[][];
    if (records.length === 0) return { rows: [], columns: [] };
    const header = records[0]!;
    const rows: Row[] = records.slice(1).map((rec) => {
      const row: Row = {};
      header.forEach((col, i) => setCell(row, col, rec[i] ?? null));
      return row;
    });
    return { rows, columns: header };
  },

  serialize(rows: Row[], columns: string[], headers?: string[]): Uint8Array {
    const records = rows.map((row) => columns.map((col) => csvCellString(cellAt(row, col))));
    // csv-stringify handles RFC 4180 quoting (commas, quotes, newlines); a lone
    // CR is outside RFC 4180 TEXTDATA, so `quoted_match` forces quotes on any
    // CR-bearing field: otherwise it emits bare and the record-delimiter
    // auto-detection swallows a trailing CR on re-parse (silent data loss).
    // The header row uses `headers` (labels) when given, else the ids.
    return new TextEncoder().encode(
      stringify(records, { header: true, columns: headers ?? columns, quoted_match: /\r/ }),
    );
  },
};
