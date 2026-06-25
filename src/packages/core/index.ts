import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { validateTablePlan, type Row, type TablePlan } from '@tamedtable/table-plan';
import { formatForExtension, loadCodec } from '@tamedtable/file-io';

// #TablePlanSchema
// The TablePlan model now lives in @tamedtable/table-plan (zero-dependency base
// package). Core re-exports everything it used to define here, so every existing
// `from '@tamedtable/core'` import keeps working unchanged.
export * from '@tamedtable/table-plan';

async function readBytes(label: string, path: string): Promise<Uint8Array> {
  try {
    return await readFile(path);
  } catch (e) {
    throw new Error(`${label}: could not read ${path}: ${(e as Error).message}`);
  }
}

// #IoFormats
// Byte-acquisition (node:fs) lives here; parsing is delegated to the file-io
// codec registry. core reads the file's raw bytes, hands them to the codec, and
// builds the initial TablePlan from the columns the codec recovers.
export async function loadCsv(path: string): Promise<{ spec: TablePlan; rows: Row[]; sourcePath: string }> {
  const bytes = await readBytes('loadCsv', path);
  const codec = await loadCodec('csv');
  const { rows, columns } = await codec.parse(bytes, path);
  if (columns.length === 0) throw new Error(`loadCsv: ${path} has no header row`);
  const seen = new Set<string>();
  for (const id of columns) {
    if (seen.has(id)) throw new Error(`loadCsv: ${path} has duplicate column "${id}"`);
    seen.add(id);
  }
  const spec: TablePlan = validateTablePlan({
    table: path,
    columns: columns.map((id) => ({ id })),
    transformations: [],
  });
  return { spec, rows, sourcePath: path };
}

// #IoFormats
/** Generic load for any registered format (Parquet, Arrow, …): pick the codec
 *  by extension, parse the bytes, and build a fresh-load TablePlan. CSV/JSONL
 *  keep their own loaders above (CSV adds header/duplicate-column checks); this
 *  is the dispatch target for every other format. */
export async function loadFile(path: string): Promise<{ spec: TablePlan; rows: Row[]; sourcePath: string }> {
  const id = formatForExtension(path);
  if (!id) throw new Error(`load: unknown file type: ${path}`);
  const bytes = await readBytes('load', path);
  const codec = await loadCodec(id);
  const { rows, columns } = await codec.parse(bytes, path);
  const spec: TablePlan = validateTablePlan({
    table: path,
    columns: columns.map((id) => ({ id })),
    transformations: [],
  });
  return { spec, rows, sourcePath: path };
}

export async function readJsonl(path: string): Promise<Row[]> {
  const bytes = await readBytes('readJsonl', path);
  const codec = await loadCodec('jsonl');
  return (await codec.parse(bytes, path)).rows;
}

export async function loadJsonl(path: string): Promise<{ spec: TablePlan; rows: Row[]; sourcePath: string }> {
  const bytes = await readBytes('loadJsonl', path);
  const codec = await loadCodec('jsonl');
  const { rows, columns } = await codec.parse(bytes, path);
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
  const codec = await loadCodec('jsonl');
  const body = await codec.serialize(rows, columnOrder as string[]);
  try {
    await writeFile(path, body);
  } catch (e) {
    throw new Error(`writeJsonl: could not write ${path}: ${(e as Error).message}`);
  }
}

// #IoFormats #CsvSerialize
export async function writeCsv(filePath: string, rows: Row[], columnOrder: string[]): Promise<void> {
  const codec = await loadCodec('csv');
  const body = await codec.serialize(rows, columnOrder);
  try {
    await writeFile(filePath, body);
  } catch (e) {
    throw new Error(`writeCsv: could not write ${filePath}: ${(e as Error).message}`);
  }
}

// #FormatOut
/** Dispatch on file extension through the codec registry (.jsonl, .csv,
 *  .parquet, .arrow, …). Any unregistered extension throws an "unknown file
 *  type" error that callers surface inline. */
export async function writeRows(filePath: string, rows: Row[], columnOrder: string[]): Promise<void> {
  const id = formatForExtension(filePath);
  if (!id) throw new Error(`unknown file type: ${filePath}`);
  const codec = await loadCodec(id);
  const body = await codec.serialize(rows, columnOrder);
  try {
    await writeFile(filePath, body);
  } catch (e) {
    throw new Error(`writeRows: could not write ${filePath}: ${(e as Error).message}`);
  }
}
