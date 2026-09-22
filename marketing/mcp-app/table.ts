/**
 * @file The prototype's whole "database": one table, held in memory by the
 * server process. Both the chat model and the App mutate it through tools, so
 * there is exactly one source of truth and the UI never has to merge state.
 */

export type Table = {
  columns: string[];
  rows: string[][];
  /** Bumped on every mutation. The App polls it to notice chat-driven edits. */
  version: number;
  /** Where the table came from, for display. */
  source: string;
};

const SAMPLE_CSV = `name,country,phone
Ada Lovelace,UK,+44 20 7946 0958
Grace Hopper,USA,(202) 555-0172
Alan Turing,UK,020 7946 1234
Hedy Lamarr,Austria,+43 1 2345678
`;

let table: Table = { ...parseCsv(SAMPLE_CSV), version: 1, source: "sample" };

export function getTable(): Table {
  return table;
}

function mutate(next: Omit<Table, "version">): Table {
  table = { ...next, version: table.version + 1 };
  return table;
}

/** Minimal CSV: no quoted commas, no embedded newlines. Enough for a spike. */
export function parseCsv(text: string): { columns: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };
  const columns = lines[0]!.split(",").map((c) => c.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    // Pad or trim so every row matches the header width.
    return columns.map((_, i) => cells[i] ?? "");
  });
  return { columns, rows };
}

export function toCsv(t: Table = table): string {
  return [t.columns.join(","), ...t.rows.map((r) => r.join(","))].join("\n") + "\n";
}

export function replaceTable(csv: string, source: string): Table {
  const { columns, rows } = parseCsv(csv);
  if (columns.length === 0) throw new Error("No columns found in the input.");
  return mutate({ columns, rows, source });
}

function columnIndex(name: string): number {
  const i = table.columns.findIndex((c) => c.toLowerCase() === name.toLowerCase());
  if (i === -1) throw new Error(`No column named "${name}". Have: ${table.columns.join(", ")}`);
  return i;
}

export function setCell(row: number, column: string, value: string): Table {
  if (row < 0 || row >= table.rows.length) throw new Error(`Row ${row} is out of range.`);
  const col = columnIndex(column);
  const rows = table.rows.map((r, i) => (i === row ? r.map((c, j) => (j === col ? value : c)) : r));
  return mutate({ columns: table.columns, rows, source: table.source });
}

export function addRow(values: string[]): Table {
  const row = table.columns.map((_, i) => values[i] ?? "");
  return mutate({ columns: table.columns, rows: [...table.rows, row], source: table.source });
}

export function deleteRow(row: number): Table {
  if (row < 0 || row >= table.rows.length) throw new Error(`Row ${row} is out of range.`);
  return mutate({
    columns: table.columns,
    rows: table.rows.filter((_, i) => i !== row),
    source: table.source,
  });
}

export function sortByColumn(column: string, direction: "asc" | "desc"): Table {
  const col = columnIndex(column);
  const sign = direction === "desc" ? -1 : 1;
  const rows = [...table.rows].sort((a, b) => sign * a[col]!.localeCompare(b[col]!));
  return mutate({ columns: table.columns, rows, source: table.source });
}

export function filterRows(column: string, contains: string): Table {
  const col = columnIndex(column);
  const needle = contains.toLowerCase();
  const rows = table.rows.filter((r) => r[col]!.toLowerCase().includes(needle));
  return mutate({ columns: table.columns, rows, source: table.source });
}

export function renameColumn(from: string, to: string): Table {
  const col = columnIndex(from);
  const columns = table.columns.map((c, i) => (i === col ? to : c));
  return mutate({ columns, rows: table.rows, source: table.source });
}
