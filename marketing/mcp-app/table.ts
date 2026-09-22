/**
 * @file The prototype's whole "database": one table, held in memory.
 *
 * One instance per MCP session, so two people on the same public server never
 * see each other's data.
 */

export type TableData = {
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

export class Table {
  private data: TableData;

  constructor() {
    this.data = { ...parseCsv(SAMPLE_CSV), version: 1, source: "sample" };
  }

  get(): TableData {
    return this.data;
  }

  toCsv(): string {
    const { columns, rows } = this.data;
    return [columns.join(","), ...rows.map((r) => r.join(","))].join("\n") + "\n";
  }

  private mutate(next: Omit<TableData, "version">): TableData {
    this.data = { ...next, version: this.data.version + 1 };
    return this.data;
  }

  private columnIndex(name: string): number {
    const i = this.data.columns.findIndex((c) => c.toLowerCase() === name.toLowerCase());
    if (i === -1) {
      throw new Error(`No column named "${name}". Have: ${this.data.columns.join(", ")}`);
    }
    return i;
  }

  replace(csv: string, source: string): TableData {
    const { columns, rows } = parseCsv(csv);
    if (columns.length === 0) throw new Error("No columns found in the input.");
    return this.mutate({ columns, rows, source });
  }

  setCell(row: number, column: string, value: string): TableData {
    const { columns, rows } = this.data;
    if (row < 0 || row >= rows.length) throw new Error(`Row ${row} is out of range.`);
    const col = this.columnIndex(column);
    return this.mutate({
      columns,
      rows: rows.map((r, i) => (i === row ? r.map((c, j) => (j === col ? value : c)) : r)),
      source: this.data.source,
    });
  }

  addRow(values: string[]): TableData {
    const { columns, rows, source } = this.data;
    return this.mutate({ columns, rows: [...rows, columns.map((_, i) => values[i] ?? "")], source });
  }

  deleteRow(row: number): TableData {
    const { columns, rows, source } = this.data;
    if (row < 0 || row >= rows.length) throw new Error(`Row ${row} is out of range.`);
    return this.mutate({ columns, rows: rows.filter((_, i) => i !== row), source });
  }

  sortByColumn(column: string, direction: "asc" | "desc"): TableData {
    const { columns, rows, source } = this.data;
    const col = this.columnIndex(column);
    const sign = direction === "desc" ? -1 : 1;
    return this.mutate({
      columns,
      rows: [...rows].sort((a, b) => sign * a[col]!.localeCompare(b[col]!)),
      source,
    });
  }

  filterRows(column: string, contains: string): TableData {
    const { columns, rows, source } = this.data;
    const col = this.columnIndex(column);
    const needle = contains.toLowerCase();
    return this.mutate({ columns, rows: rows.filter((r) => r[col]!.toLowerCase().includes(needle)), source });
  }

  renameColumn(from: string, to: string): TableData {
    const { columns, rows, source } = this.data;
    const col = this.columnIndex(from);
    return this.mutate({ columns: columns.map((c, i) => (i === col ? to : c)), rows, source });
  }
}
