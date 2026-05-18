# TamedTable code contract

Types, signatures, library choices, env vars, exit codes. Section structure
mirrors [behavior.md](behavior.md); each section links back to its behavior
twin.

## Data model

→ [behavior.md — Data model](behavior.md#data-model)

```ts
type Expr =
  | { js:  string }                              // arrow function BODY (V1)
  | { sql: string }                              // DuckDB SQL expression (V2)
  | { llm: string; model?: string };             // prompt template, {Column} + {*} placeholders

type Transformation =
  | { kind: "filter"; pred: Expr }
  | { kind: "mutate"; columns: string | string[]; value: Expr }
  | { kind: "select"; columns: string[] }
  | { kind: "sort";   by: Array<{ key: Expr | string; dir: "asc" | "desc" }> }
  | { kind: "group";  by: Array<Expr | string>; agg: Record<string, Expr> }   // V2
  | { kind: "join";   with: string; on: Expr; how?: "inner" | "left" };       // V2

type Row = Record<string, unknown>;

interface Spec {
  table?: string;
  columns: Array<{ id: string; label?: string; format?: string }>;
  transformations: Transformation[];
  filter?: unknown;
  sort?: unknown;
  page?: { size?: number; offset?: number };
  summary?: { groupBy: unknown[]; aggregates: unknown[] };  // V1: both must be []
}
```

A single Zod schema covers the V1 type set and runs at three points:

1. When `loadCsv` or `loadJsonl` builds the initial spec.
2. When the `apply_spec_patch` tool merges a patch.
3. When `runCli execute` loads a `.flow` file.

The schema checks: `kind` is one of the four V1 verbs; `Expr` is one of the
two V1 shapes; `summary.groupBy` and `summary.aggregates` are empty; nothing
uses a V2-only feature (a `kind: "group"` or `Expr.sql` gets a clear *"V2
feature in V1 spec"* error rather than being silently ignored). It does
*not* check whether a JS body compiles or whether an `{Column}` placeholder
matches a real column — those errors surface at evaluation time and flow
through the recovery loop.

Patches: RFC 6902 via `fast-json-patch`; RFC 7396 merge hand-rolled
(~20 LOC).

## Core / runner

→ [behavior.md — Core / runner](behavior.md#core--runner)

```ts
function loadCsv(path: string):   Promise<{ spec: Spec; rows: Row[]; sourcePath: string }>;
function loadJsonl(path: string): Promise<{ spec: Spec; rows: Row[]; sourcePath: string }>;
function readJsonl(path: string): Promise<Row[]>;
function writeJsonl(path: string, rows: Row[], columnOrder?: string[]): Promise<void>;

interface Runner {
  loadInput(path: string): Promise<void>;
  request(text: string, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void }): Promise<void>;
  setSpec(spec: Spec): Promise<void>;
  currentRows(): Row[];
  currentSpec(): Spec;
  exportAs(path: string): Promise<void>;
}

type ChunkUpdate = {
  transformationIndex: number;
  rowIndex: number;
  column: string;
  before: unknown;
  after: unknown;
};
```

CSV parsing uses `csv-parse` with `trim: true` (unquoted leading/trailing
whitespace stripped; quoted fields preserved verbatim). `loadJsonl` reads the file with the same
streaming reader as `readJsonl` and derives the initial column list from
the union of keys across rows (insertion order from the first row each key
appears in). `Runner.loadInput` dispatches on file extension — `.csv` to
`loadCsv`, `.jsonl` to `loadJsonl`; any other extension throws with a clear
*"unknown file type"* error that the REPL surfaces inline. `writeJsonl`
overwrites the file; the parent directory must already exist. The recovery
budget is 3 turns; running out throws an error carrying a `debug` field
with the per-turn ops and outcomes.

`Runner` is the surface step definitions drive ([common.steps.ts](../src/tests/common.steps.ts));
the CLI and headless packages both return Runners with the same method
signatures, differing only in what each does under the hood.

## Headless

→ [behavior.md — Headless](behavior.md#headless)

```ts
function createHeadlessRunner(opts?: HeadlessRunnerOptions): Runner;

interface HeadlessRunnerOptions {
  model?: string;
  cellModel?: string;
  apiKey?: string;
  baseURL?: string;
  chunkSize?: number;
  batchSize?: number;
  recoveryBudget?: number;
  maxRetries?: number;
  rpm?: number;
  onChunk?: (update: ChunkUpdate) => void;
  onPlan?: (items: PlanItem[]) => void;
  signal?: AbortSignal;
}

type PlanItem =
  | { kind: 'add-column'; id: string }
  | { kind: 'remove-column'; id: string }
  | { kind: 'reorder-columns'; from: string[]; to: string[] }
  | { kind: 'add-transformation'; transformation: Transformation }
  | { kind: 'remove-transformation'; transformation: Transformation };
```

Built on the Vercel AI SDK (`ai` + `@ai-sdk/anthropic`). The
`apply_spec_patch` tool's input schema is a JSON Schema describing the RFC
6902 operations list. Anthropic prompt caching uses
`providerOptions.anthropic.cacheControl = { type: 'ephemeral' }` on the
system-prompt prefix.

Env vars:

| Var | Default | Effect |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required. May also be passed via `opts.apiKey`. |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com/v1` | Custom endpoint. |
| `TAMEDTABLE_MODEL` | `claude-sonnet-4-6` | Model that writes the spec patch each turn. |
| `TAMEDTABLE_CELL_MODEL` | `claude-sonnet-4-5` | Model that fills in per-row LLM cells. |
| `TAMEDTABLE_RPM` | `40` | Per-process requests-per-minute cap (org ceiling is 50). |
| `TAMEDTABLE_BATCH_SIZE` | `20` | Rows packed into one LLM request. Set to `1` to disable batching. |
| `TAMEDTABLE_CHUNK_SIZE` | `5` | LLM requests fired concurrently. |
| `TAMEDTABLE_DEBUG` | unset | When set, the REPL prints a per-turn debug block after a failed request. |

## CLI

→ [behavior.md — CLI](behavior.md#cli)

```ts
function createCliRunner(options?: CliRunnerOptions): Runner;
function runCli(argv: string[]): Promise<{ exitCode: number; stderr: string }>;
```

REPL uses `node:readline/promises`. The ASCII renderer is hand-rolled
`padEnd` (~30 LOC) and paginates at `REPL_PAGE_SIZE = 10` rows and
`REPL_COL_PAGE_SIZE = 5` columns; when rows or columns fall outside the
current viewport, the truncated edge renders `...{N} more rows.` or
`...{N} more cols.` markers in place of cells. The CLI runner holds the
viewport cursor `(rowOffset, colOffset)` and the undo/redo journal —
neither surfaces on the `Runner` interface, since headless callers
don't need them. The `:help` usage screen is the verbatim fenced block
in [behavior.md §CLI/REPL](behavior.md#cli), loaded at module init.
`runCli` returns instead of calling `process.exit` so callers can
decide what to do with a failure.

`.flow` file shape:

```json
{
  "version": 1,
  "source": "datanorm-input.csv",
  "spec": { /* V1 Spec — see Data model above */ }
}
```

A relative `source` is read relative to the `.flow` file's own directory;
`--input` overrides it. A `version` mismatch exits 2.

Exit codes:

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | unrecognized subcommand or missing required flag |
| 2 | `.flow` file unreadable, invalid JSON, or fails Zod validation |
| 3 | a transformation references a column the loaded input lacks, or a JS expression throws |
| 4 | couldn't write to `--output` |

`stderr` carries one human-readable line per non-zero exit.

## System prompts

→ [behavior.md — System prompts](behavior.md#system-prompts)

[`spec/prompt-app-edit.md`](prompt-app-edit.md) is parsed at module load.
The file is split on top-level `## ` headers; each section becomes a
module-internal string of the same name. Currently three sections required:
`SYSTEM_PROMPT`, `BATCH_SYSTEM_PROMPT`, `CELL_FORMAT_CONSTRAINT`. Any
required section missing throws at load time with a clear error pointing at
the file.

The runtime uses `SYSTEM_PROMPT` as the system message on every patch-turn
call and `BATCH_SYSTEM_PROMPT` as the system message on every multi-row
cell evaluation. `CELL_FORMAT_CONSTRAINT` is loaded so spec-driven tools
(WoZ, future validators) can reference it; it already appears verbatim as
a substring inside `SYSTEM_PROMPT`'s few-shots.

Editing `prompt-app-edit.md` is the way to tune any of these. `src/` does
not contain the prompt text directly.

## V2 — web

→ [behavior.md — V2 — web](behavior.md#v2--web)

V2 types and signatures are not yet defined. The wire model is unchanged
from V1: `(spec, row_stream)` to the renderer; the spec is the contract.
Additional V2 shapes already reserved in the type union above (`group`,
`join`, `{sql}`) parse against a V2 schema but throw V1's *"V2 feature in
V1 spec"* error in V1.
