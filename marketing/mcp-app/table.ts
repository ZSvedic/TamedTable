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

/** Minimal CSV: no quoted commas, no embedded newlines. Enough for a spike. */
export function parseCsv(text: string, source: string): TableData {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error("The CSV is empty.");
  const columns = lines[0]!.split(",").map((c) => c.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    // Pad or trim so every row matches the header width.
    return columns.map((_, i) => cells[i] ?? "");
  });
  return { columns, rows, source };
}

export function toCsv(t: TableData): string {
  return [t.columns.join(","), ...t.rows.map((r) => r.join(","))].join("\n") + "\n";
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
