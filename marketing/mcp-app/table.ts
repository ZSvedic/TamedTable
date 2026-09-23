/**
 * @file CSV in, CSV out. No state.
 *
 * Every function takes the table it should work on and returns a new one. The
 * table itself lives in the view, and travels to the server inside tool
 * arguments. See LEARNINGS.md for why it cannot live here.
 */

export type TableData = {
  columns: string[];
  rows: string[][];
  /** Where the table came from, for display. */
  source: string;
};

export const SAMPLE_CSV = `name,country,phone
Ada Lovelace,UK,+44 20 7946 0958
Grace Hopper,USA,(202) 555-0172
Alan Turing,UK,020 7946 1234
Hedy Lamarr,Austria,+43 1 2345678
`;

/**
 * Splits one CSV line, honouring double quotes.
 *
 * A phone number like `"(202) 555-0172, ext 4"` has to survive the round trip
 * from the grid to the server and back, so commas inside quotes stay put and
 * `""` means a literal quote.
 */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (line[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/** Embedded newlines are still out of scope; quoted commas are not. */
export function parseCsv(text: string, source: string): TableData {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error("The CSV is empty.");
  const columns = splitCsvLine(lines[0]!);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    // Pad or trim so every row matches the header width.
    return columns.map((_, i) => cells[i] ?? "");
  });
  return { columns, rows, source };
}

/** Quotes a cell only when it needs it, so plain tables stay readable. */
export function escapeCsvCell(cell: string): string {
  return /[",]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

export function toCsv(t: TableData): string {
  const line = (cells: string[]) => cells.map(escapeCsvCell).join(",");
  return [line(t.columns), ...t.rows.map(line)].join("\n") + "\n";
}

function columnIndex(t: TableData, name: string): number {
  const i = t.columns.findIndex((c) => c.toLowerCase() === name.toLowerCase());
  if (i === -1) throw new Error(`No column named "${name}". Have: ${t.columns.join(", ")}`);
  return i;
}

export function setCell(t: TableData, row: number, column: string, value: string): TableData {
  if (row < 0 || row >= t.rows.length) throw new Error(`Row ${row} is out of range.`);
  const col = columnIndex(t, column);
  return {
    ...t,
    rows: t.rows.map((r, i) => (i === row ? r.map((c, j) => (j === col ? value : c)) : r)),
  };
}

export function addRow(t: TableData, values: string[]): TableData {
  return { ...t, rows: [...t.rows, t.columns.map((_, i) => values[i] ?? "")] };
}

export function deleteRow(t: TableData, row: number): TableData {
  if (row < 0 || row >= t.rows.length) throw new Error(`Row ${row} is out of range.`);
  return { ...t, rows: t.rows.filter((_, i) => i !== row) };
}

export function sortByColumn(t: TableData, column: string, direction: "asc" | "desc"): TableData {
  const col = columnIndex(t, column);
  const sign = direction === "desc" ? -1 : 1;
  return { ...t, rows: [...t.rows].sort((a, b) => sign * a[col]!.localeCompare(b[col]!)) };
}

export function filterRows(t: TableData, column: string, contains: string): TableData {
  const col = columnIndex(t, column);
  const needle = contains.toLowerCase();
  return { ...t, rows: t.rows.filter((r) => r[col]!.toLowerCase().includes(needle)) };
}

export function renameColumn(t: TableData, from: string, to: string): TableData {
  const col = columnIndex(t, from);
  return { ...t, columns: t.columns.map((c, i) => (i === col ? to : c)) };
}
