// #TablePlanSchema
// The declarative table definition (formerly named `Spec`) plus its Zod schema
// and validator, and the FormatCodec interface every format plugs into. This is
// the zero-dependency base package both `core` (engine) and `file-io` (codecs,
// dialogs, fetch) import — the clean DAG `core → file-io → table-plan` with no
// cycle. Spec: spec/packages/file-io/behavior.md.

import { z } from 'zod';

// Zod declares `"sideEffects": false` and registers its English locale with a
// bare `config(en())` call in its own entry point — which Rollup is free to
// drop, and does, from the production web bundle. Without the locale every
// issue message degrades to a bare "Invalid input", so the browser describes a
// bad spec differently from the CLI. That text is quoted verbatim into the
// recovery prompt ("Your previous patch failed: …"), which is part of a
// request's cassette fingerprint — so the drift also breaks tutorial replay in
// the deployed app. Configuring the locale by reference keeps it in the bundle.
z.config(z.locales.en());

export type Row = Record<string, unknown>;

// ── TablePlan schema (one schema for every plan — fresh load, patch, replay) ──

const ColumnsField = z.union([z.string(), z.array(z.string())]);

export const ExprSchema: z.ZodTypeAny = z.union([
  z.object({ js: z.string() }).strict(),
  z.object({ llm: z.string(), model: z.string().optional() }).strict(),
  z.object({ sql: z.string() }).strict(),
]);

const JsonLikeFileExtRe = /\.(csv|jsonl)$/i;

// Provenance metadata every kind accepts. The runner stamps it at commit:
// `query` — the chat request (voice: the transcript) — on the first step a
// turn added or changed; `name` — the step's human describeStep label — on
// every one. The engine ignores both; the model never sees them.
const QueryMeta = { query: z.string().optional(), name: z.string().optional() };

const TransformationUnionSchema: z.ZodTypeAny = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('filter'), pred: ExprSchema, ...QueryMeta }).strict(),
  z.object({ kind: z.literal('mutate'), columns: ColumnsField, value: ExprSchema, ...QueryMeta }).strict(),
  z.object({ kind: z.literal('select'), columns: z.array(z.string()), ...QueryMeta }).strict(),
  z.object({
    kind: z.literal('sort'),
    by: z.array(z.object({ key: z.union([z.string(), ExprSchema]), dir: z.enum(['asc', 'desc']) }))
      .min(1, 'sort.by must be non-empty'),
    limit: z.number().int().positive().optional(),
    ...QueryMeta,
  }).strict(),
  z.object({
    kind: z.literal('group'),
    // An empty `by` aggregates the whole table into a single output row.
    by: z.array(z.union([z.string(), ExprSchema])),
    agg: z.record(z.string(), ExprSchema),
    ...QueryMeta,
  }).strict(),
  z.object({
    kind: z.literal('join'),
    with: z.string().refine((s) => JsonLikeFileExtRe.test(s), {
      message: 'join.with: unknown file type (must be .csv or .jsonl)',
    }),
    on: ExprSchema,
    how: z.enum(['inner', 'left']).optional(),
    ...QueryMeta,
  }).strict(),
  z.object({
    kind: z.literal('split'),
    from: z.string(),
    into: z.array(z.string()).min(1, 'split.into must be non-empty'),
    on: z.union([z.string(), z.instanceof(RegExp), ExprSchema]),
    drop: z.boolean().optional(),
    ...QueryMeta,
  }).strict(),
  z.object({
    kind: z.literal('validate'),
    pred: ExprSchema,
    message: ExprSchema.optional(),
    threshold: z.number().min(0).max(1).optional(),
    into: z.string().min(1, 'validate.into must be non-empty').optional(),
    ...QueryMeta,
  }).strict(),
  z.object({
    kind: z.literal('pivot'),
    index: z.array(z.string()).min(1, 'pivot.index must be non-empty'),
    on: z.string(),
    values: z.string(),
    agg: z.enum(['sum', 'count', 'avg', 'min', 'max', 'first']).optional(),
    ...QueryMeta,
  }).strict().refine((p) => !p.index.includes(p.on), { message: 'pivot.on cannot be in pivot.index' }),
  z.object({
    kind: z.literal('unpivot'),
    id: z.array(z.string()),
    measures: z.array(z.string()).min(1, 'unpivot.measures must be non-empty'),
    names_to: z.string().optional(),
    values_to: z.string().optional(),
    ...QueryMeta,
  }).strict(),
]);

export type Expr =
  | { js: string }
  | { llm: string; model?: string }
  | { sql: string };

/** Provenance metadata on every Transformation kind — see QueryMeta above. */
type WithQuery = { query?: string; name?: string };

export type Transformation =
  | ({ kind: 'filter'; pred: Expr } & WithQuery)
  | ({ kind: 'mutate'; columns: string | string[]; value: Expr } & WithQuery)
  | ({ kind: 'select'; columns: string[] } & WithQuery)
  | ({ kind: 'sort'; by: Array<{ key: Expr | string; dir: 'asc' | 'desc' }>; limit?: number } & WithQuery)
  | ({ kind: 'group'; by: Array<Expr | string>; agg: Record<string, Expr> } & WithQuery)
  | ({ kind: 'join'; with: string; on: Expr; how?: 'inner' | 'left' } & WithQuery)
  | ({ kind: 'split'; from: string; into: string[]; on: string | RegExp | Expr; drop?: boolean } & WithQuery)
  | ({ kind: 'validate'; pred: Expr; message?: Expr; threshold?: number; into?: string } & WithQuery)
  | ({ kind: 'pivot'; index: string[]; on: string; values: string; agg?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'first' } & WithQuery)
  | ({ kind: 'unpivot'; id: string[]; measures: string[]; names_to?: string; values_to?: string } & WithQuery);

const ColumnSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  format: z.string().optional(),
});

// The spec describes data only — table, columns, transformations. View knobs
// (page size, pagination) are UI state, so `.strict()` rejects any other
// top-level key (e.g. `filter`, `sort`, `page`, `summary`) as unrecognized.
export const TablePlanSchema = z
  .object({
    table: z.string().optional(),
    columns: z.array(ColumnSchema),
    transformations: z.array(TransformationUnionSchema),
  })
  .strict();
export type TablePlan = z.infer<typeof TablePlanSchema>;

function describeZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
    .join('; ');
}

export function validateTablePlan(spec: unknown): TablePlan {
  const result = TablePlanSchema.safeParse(spec);
  if (!result.success) {
    throw new Error(`Spec validation failed: ${describeZodError(result.error)}`);
  }
  return result.data as TablePlan;
}

// ── FormatCodec ───────────────────────────────────────────────────────────────

/** The rows + column list a codec recovers from a file's content. */
export interface ParsedTable {
  rows: Row[];
  columns: string[];
}

/** One stateless codec per format. `file-io` owns a load-on-demand registry of
 *  these; the engine and the web app reach formats only through it. Pure-JS
 *  codecs (csv, jsonl) implement `parse`/`serialize` synchronously; codecs whose
 *  reader is async (Phase 1's DuckDB-backed Parquet, Arrow via apache-arrow)
 *  return a Promise — every caller `await`s, so both shapes work. */
export interface FormatCodec {
  /** Stable format id, e.g. "csv", "jsonl". */
  id: string;
  /** File extensions this codec claims, lower-case with the dot (`[".csv"]`). */
  extensions: string[];
  /** Content-Type fragments that map to this codec (`["csv"]`). */
  contentTypes: string[];
  /** Parse a file's raw bytes into rows + columns. Text codecs decode the
   *  bytes internally; binary formats (Phase 1) read them directly. `name` is
   *  the source file name, used only for error context. */
  parse(bytes: Uint8Array, name: string): ParsedTable | Promise<ParsedTable>;
  /** Serialize rows to the format's raw bytes, emitting `columns` in order. */
  serialize(rows: Row[], columns: string[]): Uint8Array | Promise<Uint8Array>;
  /** Optional one-time load of a heavy parser/engine before first `parse`. */
  load?: () => Promise<void>;
}
