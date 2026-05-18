import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

export type Row = Record<string, unknown>;

const V2_KINDS = ['group', 'join'] as const;

export const ExprSchema = z.union([
  z.object({ js: z.string() }).strict(),
  z.object({ llm: z.string(), model: z.string().optional() }).strict(),
  z.object({ sql: z.string() }).strict().superRefine((_, ctx) => {
    ctx.addIssue({ code: 'custom', message: 'V2 feature in V1 spec: Expr.sql' });
  }),
]);
export type Expr = { js: string } | { llm: string; model?: string };

const ColumnsField = z.union([z.string(), z.array(z.string())]);

const V1TransformationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('filter'), pred: ExprSchema }).strict(),
  z.object({ kind: z.literal('mutate'), columns: ColumnsField, value: ExprSchema }).strict(),
  z.object({ kind: z.literal('select'), columns: z.array(z.string()) }).strict(),
  z.object({
    kind: z.literal('sort'),
    by: z.array(z.object({ key: z.union([z.string(), ExprSchema]), dir: z.enum(['asc', 'desc']) })),
  }).strict(),
]);

export const TransformationSchema = z.preprocess((t) => {
  const kind = (t as { kind?: unknown } | null | undefined)?.kind;
  if (typeof kind === 'string' && (V2_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`V2 feature in V1 spec: kind="${kind}"`);
  }
  return t;
}, V1TransformationSchema);
export type Transformation =
  | { kind: 'filter'; pred: Expr }
  | { kind: 'mutate'; columns: string | string[]; value: Expr }
  | { kind: 'select'; columns: string[] }
  | { kind: 'sort'; by: Array<{ key: Expr | string; dir: 'asc' | 'desc' }> };

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
        groupBy: z.array(z.unknown()).max(0, 'V2 feature in V1 spec: summary.groupBy'),
        aggregates: z.array(z.unknown()).max(0, 'V2 feature in V1 spec: summary.aggregates'),
      })
      .optional(),
    transformations: z.array(TransformationSchema),
  })
  .strict();
export type Spec = z.infer<typeof SpecSchema>;

export function validateSpec(spec: unknown): Spec {
  const result = SpecSchema.safeParse(spec);
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    throw new Error(`Spec validation failed: ${msg}`);
  }
  return result.data;
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
