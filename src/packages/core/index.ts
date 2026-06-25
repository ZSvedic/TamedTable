import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { validateTablePlan, type Row, type TablePlan } from '@tamedtable/table-plan';

// #TablePlanSchema
// The TablePlan model now lives in @tamedtable/table-plan (zero-dependency base
// package). Core re-exports everything it used to define here, so every existing
// `from '@tamedtable/core'` import keeps working unchanged.
export * from '@tamedtable/table-plan';

async function readText(label: string, path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (e) {
    throw new Error(`${label}: could not read ${path}: ${(e as Error).message}`);
  }
}

// #IoFormats
export async function loadCsv(path: string): Promise<{ spec: TablePlan; rows: Row[]; sourcePath: string }> {
  const text = await readText('loadCsv', path);
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Row[];
  const header = parse(text, { to_line: 1, trim: true, bom: true })[0] as string[] | undefined;
  if (!header || header.length === 0) throw new Error(`loadCsv: ${path} has no header row`);
  const seen = new Set<string>();
  for (const id of header) {
    if (seen.has(id)) throw new Error(`loadCsv: ${path} has duplicate column "${id}"`);
    seen.add(id);
  }
  const spec: TablePlan = validateTablePlan({
    table: path,
    columns: header.map((id) => ({ id })),
    transformations: [],
  });
  return { spec, rows: records, sourcePath: path };
}

export async function readJsonl(path: string): Promise<Row[]> {
  const text = await readText('readJsonl', path);
  const rows: Row[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (line === '') return;
    try { rows.push(JSON.parse(line) as Row); }
    catch (e) { throw new Error(`readJsonl: ${path}:${i + 1} malformed JSON: ${(e as Error).message}`); }
  });
  return rows;
}

export async function loadJsonl(path: string): Promise<{ spec: TablePlan; rows: Row[]; sourcePath: string }> {
  const rows = await readJsonl(path);
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) { seen.add(key); columns.push(key); }
    }
  }
  const spec: TablePlan = validateTablePlan({
    table: path,
    columns: columns.map((id) => ({ id })),
    transformations: [],
  });
  return { spec, rows, sourcePath: path };
}

export function loadEnv(envPath?: string): void {
  const filePath = envPath ?? findEnvFile(process.cwd());
  if (!filePath) return;
  let text: string;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function findEnvFile(startDir: string): string | undefined {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, '.env');
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

export async function writeJsonl(path: string, rows: Row[], columnOrder?: string[]): Promise<void> {
  const lines = rows
    .map((row) => {
      if (!columnOrder) return JSON.stringify(row);
      const ordered: Row = {};
      for (const col of columnOrder) ordered[col] = col in row ? row[col] : null;
      for (const k of Object.keys(row)) if (!(k in ordered)) ordered[k] = row[k];
      return JSON.stringify(ordered);
    })
    .join('\n');
  try {
    await writeFile(path, lines + (lines.length ? '\n' : ''), 'utf8');
  } catch (e) {
    throw new Error(`writeJsonl: could not write ${path}: ${(e as Error).message}`);
  }
}

function csvCellString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// #IoFormats #CsvSerialize
export async function writeCsv(filePath: string, rows: Row[], columnOrder: string[]): Promise<void> {
  const records = rows.map((row) =>
    columnOrder.map((col) => csvCellString(col in row ? row[col] : null))
  );
  // csv-stringify handles RFC 4180 quoting (commas, quotes, newlines).
  const body = stringify(records, { header: true, columns: columnOrder });
  try {
    await writeFile(filePath, body, 'utf8');
  } catch (e) {
    throw new Error(`writeCsv: could not write ${filePath}: ${(e as Error).message}`);
  }
}

// #FormatOut
/** Dispatch on file extension. .jsonl → writeJsonl, .csv → writeCsv. Any other
 *  extension throws an "unknown file type" error that callers surface inline. */
export async function writeRows(filePath: string, rows: Row[], columnOrder: string[]): Promise<void> {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (ext === '.jsonl') return writeJsonl(filePath, rows, columnOrder);
  if (ext === '.csv') return writeCsv(filePath, rows, columnOrder);
  throw new Error(`unknown file type: ${filePath}`);
}
