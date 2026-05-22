import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

export type Row = Record<string, unknown>;

// ── Spec schema (one schema for every spec — fresh load, patch, replay) ────

const ColumnsField = z.union([z.string(), z.array(z.string())]);

export const ExprSchema: z.ZodTypeAny = z.union([
  z.object({ js: z.string() }).strict(),
  z.object({ llm: z.string(), model: z.string().optional() }).strict(),
  z.object({ sql: z.string() }).strict(),
]);

const JsonLikeFileExtRe = /\.(csv|jsonl)$/i;

const V2TransformationSchema: z.ZodTypeAny = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('filter'), pred: ExprSchema }).strict(),
  z.object({ kind: z.literal('mutate'), columns: ColumnsField, value: ExprSchema }).strict(),
  z.object({ kind: z.literal('select'), columns: z.array(z.string()) }).strict(),
  z.object({
    kind: z.literal('sort'),
    by: z.array(z.object({ key: z.union([z.string(), ExprSchema]), dir: z.enum(['asc', 'desc']) })),
    limit: z.number().int().positive().optional(),
  }).strict(),
  z.object({
    kind: z.literal('group'),
    // An empty `by` aggregates the whole table into a single output row.
    by: z.array(z.union([z.string(), ExprSchema])),
    agg: z.record(z.string(), ExprSchema),
  }).strict(),
  z.object({
    kind: z.literal('join'),
    with: z.string().refine((s) => JsonLikeFileExtRe.test(s), {
      message: 'join.with: unknown file type (must be .csv or .jsonl)',
    }),
    on: ExprSchema,
    how: z.enum(['inner', 'left']).optional(),
  }).strict(),
  z.object({
    kind: z.literal('split'),
    from: z.string(),
    into: z.array(z.string()).min(1, 'split.into must be non-empty'),
    on: z.union([z.string(), z.instanceof(RegExp), ExprSchema]),
    drop: z.boolean().optional(),
  }).strict(),
  z.object({
    kind: z.literal('validate'),
    pred: ExprSchema,
    message: ExprSchema.optional(),
    threshold: z.number().min(0).max(1).optional(),
  }).strict(),
  z.object({
    kind: z.literal('pivot'),
    index: z.array(z.string()).min(1, 'pivot.index must be non-empty'),
    on: z.string(),
    values: z.string(),
    agg: z.enum(['sum', 'count', 'avg', 'min', 'max', 'first']).optional(),
  }).strict().refine((p) => !p.index.includes(p.on), { message: 'pivot.on cannot be in pivot.index' }),
  z.object({
    kind: z.literal('unpivot'),
    id: z.array(z.string()),
    measures: z.array(z.string()),
    names_to: z.string().optional(),
    values_to: z.string().optional(),
  }).strict(),
]);

// Re-export the V2 transformation schema as the default — patches and live specs
// always validate against V2.
export const TransformationSchema = V2TransformationSchema;

export type Expr =
  | { js: string }
  | { llm: string; model?: string }
  | { sql: string };

export type Transformation =
  | { kind: 'filter'; pred: Expr }
  | { kind: 'mutate'; columns: string | string[]; value: Expr }
  | { kind: 'select'; columns: string[] }
  | { kind: 'sort'; by: Array<{ key: Expr | string; dir: 'asc' | 'desc' }>; limit?: number }
  | { kind: 'group'; by: Array<Expr | string>; agg: Record<string, Expr> }
  | { kind: 'join'; with: string; on: Expr; how?: 'inner' | 'left' }
  | { kind: 'split'; from: string; into: string[]; on: string | RegExp | Expr; drop?: boolean }
  | { kind: 'validate'; pred: Expr; message?: Expr; threshold?: number }
  | { kind: 'pivot'; index: string[]; on: string; values: string; agg?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'first' }
  | { kind: 'unpivot'; id: string[]; measures: string[]; names_to?: string; values_to?: string };

const ColumnSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  format: z.string().optional(),
});

export const SpecSchema = z
  .object({
    table: z.string().optional(),
    columns: z.array(ColumnSchema),
    filter: z.unknown().optional(),
    sort: z.array(z.unknown()).optional(),
    page: z.object({ size: z.number(), offset: z.number() }).optional(),
    summary: z
      .object({
        groupBy: z.array(z.unknown()),
        aggregates: z.array(z.unknown()),
      })
      .optional(),
    transformations: z.array(V2TransformationSchema),
  })
  .strict();
export type Spec = z.infer<typeof SpecSchema>;

function describeZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
    .join('; ');
}

export function validateSpec(spec: unknown): Spec {
  const result = SpecSchema.safeParse(spec);
  if (!result.success) {
    throw new Error(`Spec validation failed: ${describeZodError(result.error)}`);
  }
  return result.data as Spec;
}

async function readText(label: string, path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (e) {
    throw new Error(`${label}: could not read ${path}: ${(e as Error).message}`);
  }
}

export async function loadCsv(path: string): Promise<{ spec: Spec; rows: Row[]; sourcePath: string }> {
  const text = await readText('loadCsv', path);
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Row[];
  const header = parse(text, { to_line: 1, trim: true, bom: true })[0] as string[] | undefined;
  if (!header || header.length === 0) throw new Error(`loadCsv: ${path} has no header row`);
  const seen = new Set<string>();
  for (const id of header) {
    if (seen.has(id)) throw new Error(`loadCsv: ${path} has duplicate column "${id}"`);
    seen.add(id);
  }
  const spec: Spec = validateSpec({
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

export async function loadJsonl(path: string): Promise<{ spec: Spec; rows: Row[]; sourcePath: string }> {
  const rows = await readJsonl(path);
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) { seen.add(key); columns.push(key); }
    }
  }
  const spec: Spec = validateSpec({
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

/** Dispatch on file extension. .jsonl → writeJsonl, .csv → writeCsv. Any other
 *  extension throws an "unknown file type" error that callers surface inline. */
export async function writeRows(filePath: string, rows: Row[], columnOrder: string[]): Promise<void> {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (ext === '.jsonl') return writeJsonl(filePath, rows, columnOrder);
  if (ext === '.csv') return writeCsv(filePath, rows, columnOrder);
  throw new Error(`unknown file type: ${filePath}`);
}
