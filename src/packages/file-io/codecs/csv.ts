// #FileIO #IoFormats #CsvSerialize
// The pure-JS CSV codec. Parse with `csv-parse` (RFC 4180, trimmed unquoted
// whitespace, BOM tolerated); serialize with `csv-stringify` (RFC 4180 quoting,
// \n line endings, no BOM). Per-format quirks: spec/packages/file-io/formats/csv.md.
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import type { FormatCodec, ParsedTable, Row } from '@tamedtable/table-plan';

function csvCellString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export const csvCodec: FormatCodec = {
  id: 'csv',
  extensions: ['.csv'],
  contentTypes: ['csv'],

  parse(bytes: Uint8Array): ParsedTable {
    const text = new TextDecoder().decode(bytes);
    const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Row[];
    const header = parse(text, { to_line: 1, trim: true, bom: true })[0] as string[] | undefined;
    return { rows, columns: header ?? [] };
  },

  serialize(rows: Row[], columns: string[]): Uint8Array {
    const records = rows.map((row) =>
      columns.map((col) => csvCellString(col in row ? row[col] : null)),
    );
    // csv-stringify handles RFC 4180 quoting (commas, quotes, newlines).
    return new TextEncoder().encode(stringify(records, { header: true, columns }));
  },
};
