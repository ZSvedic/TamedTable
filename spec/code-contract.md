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
  | { kind: "filter";   pred: Expr }
  | { kind: "mutate";   columns: string | string[]; value: Expr }
  | { kind: "select";   columns: string[] }
  | { kind: "sort";     by: Array<{ key: Expr | string; dir: "asc" | "desc" }> }
  | { kind: "group";    by: Array<Expr | string>; agg: Record<string, Expr> }    // V2
  | { kind: "join";     with: string; on: Expr; how?: "inner" | "left" }         // V2
  | { kind: "split";    from: string; into: string[]; on: string | RegExp | Expr; drop?: boolean }  // V2
  | { kind: "validate"; pred: Expr; message?: Expr; threshold?: number }         // V2
  | { kind: "pivot";    index: string[]; on: string; values: string; agg?: "sum" | "count" | "avg" | "min" | "max" | "first" }  // V2
  | { kind: "unpivot";  id: string[]; measures: string[]; names_to?: string; values_to?: string };  // V2

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
budget is 3 turns; running out throws an error carrying a `debug` field —
a `RequestDebugInfo` (see Headless).

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
  onDebug?: (info: RequestDebugInfo) => void;
  signal?: AbortSignal;
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

type PlanItem =
  | { kind: 'add-column'; id: string }
  | { kind: 'remove-column'; id: string }
  | { kind: 'reorder-columns'; from: string[]; to: string[] }
  | { kind: 'add-transformation'; transformation: Transformation }
  | { kind: 'remove-transformation'; transformation: Transformation };

interface RequestDebugTurn {
  ops: unknown[];          // the RFC 6902 patch the model proposed this turn
  outcome: string;         // 'committed', 'rejected', or `evaluation failed: …`
  sentBack?: string;       // the error fed into the next turn, if any
}

interface RequestDebugInfo {
  userRequest: string;
  turns: RequestDebugTurn[];
  expressions: Array<{ label: string; body: string }>;   // success path: primary expr per appended transformation
  modelCalls: Array<{ model: string; calls: number }>;   // distinct models, first-call order
  inputTokens: number;
  outputTokens: number;
  elapsedMs: number;
}
```

Built on the Vercel AI SDK (`ai` + `@ai-sdk/anthropic`). The
`apply_spec_patch` tool's input schema is a JSON Schema describing the RFC
6902 operations list. Anthropic prompt caching uses
`providerOptions.anthropic.cacheControl = { type: 'ephemeral' }` on the
system-prompt prefix.

`onDebug` fires once per `request` — on success and on failure — just
before the call settles, carrying a `RequestDebugInfo`. The
recovery-budget-exhausted error also carries the same struct on its
`debug` field. `expressions` is populated on a successful request (one
entry per appended transformation, `label` naming the field — `pred`,
`value`, …); `turns` carries the failure detail; `modelCalls`,
`inputTokens`, `outputTokens`, and `elapsedMs` are filled either way. A
model id shaped `claude-<family>-<major>-<minor>` renders in the debug
block as `<Family> <major>.<minor>` (so `claude-sonnet-4-6` →
`Sonnet 4.6`); any other id renders verbatim.

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
| `TAMEDTABLE_DEBUG` | `on` | On by default — the REPL prints a per-turn debug block after a failed request. Set to `0`, `false`, or `off` to disable. |

### Recording model calls for tests

Headless makes every model HTTP call through `fetch`.
`createHeadlessRunner` forwards `opts.fetch` into
`createAnthropic({ apiKey, baseURL, fetch })`, so the SDK routes all
HTTP through it. When `opts.fetch` is unset the SDK uses the global
`fetch` and V1 behavior is unchanged. `fetch?` is typed as the plain
`(input, init) => Promise<Response>` call signature a wrapper actually
implements; the SDK's own `fetch` field is `typeof globalThis.fetch`,
so the forward casts to bridge the two.

The cucumber suite passes a `fetch`-shaped *cassette recorder* as
`opts.fetch`. The recorder fingerprints each request — a SHA-256 hex
digest of `method + "\n" + url + "\n" + body` — and looks it up in a
cassette file. The `TAMEDTABLE_CASSETTE` env var selects the mode:

| `TAMEDTABLE_CASSETTE` | Behavior |
|---|---|
| `record` | Hit → return the saved response, no network. Miss → call the wrapped real `fetch`, save a successful response, return it. Needs `ANTHROPIC_API_KEY`. |
| `replay` | Hit → return the saved response. Miss → throw `no recording for this request: <fingerprint>`. No network, no API key. |
| unset / any other value | No recorder is installed; every call hits the network — V1 behavior. |

The fingerprint is strict by design: a changed prompt is always a miss,
never a silent stale hit.

Only `2xx` responses are saved. A transient error (`429`, `5xx`) is
returned to the SDK unsaved, so its built-in retry reaches the live API
and the eventual success — not the transient error — is what lands in
the cassette.

A cassette file is a JSON object keyed by fingerprint; each value is
`{ status, statusText, headers, body }`, with `body` the response body
as text (a JSON payload or an SSE stream, captured verbatim). On replay
a `Response` is reconstructed from those fields. Cassettes live one per
feature file at `src/tests/__cassettes__/<feature>.json` — committed
recorded data, not human-reviewed contract, so they sit under `src/`
rather than `spec/`. They are written pretty-printed with keys sorted
for reviewable diffs and committed to git. In `record` mode each new
entry is flushed to its file as soon as it is captured.

`runnerOptsFor` in [`src/tests/world.ts`](../src/tests/world.ts) wires
this in: for a `@cli` or `@headless` scenario it reads
`TAMEDTABLE_CASSETTE`, and when the value is `record` or `replay` it
adds a recorder — bound to that scenario's feature-named cassette
file — to the runner options bag. That bag also reaches the
`runCli`-based steps, so REPL- and `execute`-driven scenarios record
and replay too. In `replay` mode it sets a placeholder `apiKey` (the
runner needs a non-empty key to build its provider, and the recorder
intercepts every call before that key would be used), and `cucumber.js`
lifts `TAMEDTABLE_RPM` — cassette hits touch no network, so the rate
limiter would only add idle delay. The recorder is test-only code
under `src/tests/`; `src/packages/headless` merely forwards
`opts.fetch`.

## CLI

→ [behavior.md — CLI](behavior.md#cli)

```ts
function createCliRunner(options?: CliRunnerOptions): Runner;
function runCli(argv: string[]): Promise<{ exitCode: number; stderr: string }>;
```

REPL uses `node:readline/promises`. The readline interface is created
with `terminal: stdin.isTTY === true` — interactive runs get raw-mode
line editing (↑/↓ history, ←/→, ⌃A/⌃E, ⌃R, etc.) for free; piped runs
get a plain line reader with no escape-sequence interpretation, so
Cucumber-driven input stays byte-deterministic. The flag is never
hardcoded to `false`; passing an explicit `false` would break
interactive UX (arrow keys echo as `^[[A`). The CLI does not maintain
or persist a history file in V1 — readline's in-memory history is
sufficient for a single session.

The ASCII renderer is hand-rolled `padEnd` (~30 LOC). Page size
`(pageRows, pageCols)` is recomputed at startup, on every `SIGWINCH`,
and after `:viewport` from `process.stdout.columns` /
`process.stdout.rows`:

- `autoRows = max(1, process.stdout.rows - REPL_CHROME_LINES)` where
  `REPL_CHROME_LINES = 5` (header + separator + bottom truncation
  marker + prompt + one line of breathing room).
- `autoCols` is the greedy fit: walk columns in display order summing
  each column's rendered width (the longer of header label or the
  widest cell on the current row page, capped by the per-cell `trunc`
  ellipsis at ~20 chars) plus the inter-column separator, and stop
  just before exceeding `process.stdout.columns`. Minimum 1.

When `process.stdout.isTTY` is false (piped stdout, no controlling
terminal — tests, CI, `tamedtable execute`), both autodetect branches
are skipped and the renderer falls back to
`REPL_FALLBACK_ROWS = 10` and `REPL_FALLBACK_COLS = 5`. The `/dev/tty`
ioctl path is **not** used; non-interactive runs must stay byte-
deterministic so Gherkin tests remain stable.

`:viewport` pins either axis to a manual value held on the CLI runner
as `(pinRows, pinCols)`. A pinned axis ignores `SIGWINCH` until cleared
with `auto`. Effective per-axis size is `pin ?? auto ?? fallback`. When
rows or columns fall outside the current viewport, the truncated edge
renders `...{N} more rows.` or `...{N} more cols.` markers in place of
cells.

The CLI runner holds the viewport cursor `(rowOffset, colOffset)`, the
viewport pins `(pinRows, pinCols)`, and the undo/redo journal — none
of those surface on the `Runner` interface, since headless callers
don't need them. The two help screens are the verbatim fenced blocks
in [behavior.md §CLI/REPL](behavior.md#cli) (`:help`, in-session) and
[behavior.md §CLI/Discovery](behavior.md#cli) (`--help` / `-h` /
`help`, binary invocation), both loaded as strings at module init and
emitted unchanged. `runCli` returns instead of calling `process.exit`
so callers can decide what to do with a failure.

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

## V2

→ [behavior.md — V2](behavior.md#v2)

The wire model is unchanged from V1: `(spec, row_stream)` to the
renderer; the spec is the contract. V2 shapes already reserved in the
type union above (`group`, `join`, `{sql}`) parse against the V2 Zod
schema; in V1 mode the schema still rejects them with the *"V2 feature
in V1 spec"* error.

### CSV (and other tabular) output

`writeCsv` mirrors the `writeJsonl` signature:

```ts
function writeCsv(path: string, rows: Row[], columnOrder: string[]): Promise<void>;
```

`columnOrder` is required for CSV (the header row needs it); for
JSONL it stays optional, matching V1. The writer uses
`csv-stringify/sync` from the `csv` package (already pulled in
transitively by `csv-parse` in V1) with `header: true`, RFC 4180
quoting, `\n` line endings, and no BOM. Nested values
(`typeof === 'object' && !== null`) round-trip through `JSON.stringify`.

`Runner.exportAs` and the REPL `:save` command dispatch on extension:
`.jsonl` → `writeJsonl`, `.csv` → `writeCsv`. Any other extension
throws the *"unknown file type"* error, surfaced inline by the REPL
and as exit code 4 by `tamedtable execute`.

### `group` and `join` transformations

```ts
interface GroupTransform { kind: "group"; by: Array<Expr | string>; agg: Record<string, Expr>; }
interface JoinTransform  { kind: "join";  with: string; on: Expr; how?: "inner" | "left"; }
```

The `by` list accepts either a bare column name (string) or a full
`Expr` — same shorthand `sort.by[].key` already uses. `agg`
expressions evaluate with the group's row slice bound as `rows` for
JS (`(rows, key, allGroups) => …`), and as a relation named
`g` for SQL; LLM aggregates receive the group's compact JSON as
`{*}`.

`Runner.loadInput` continues to dispatch on extension; the join's
right-side path is loaded by the same code path. The V2 Zod schema
permits these two `kind` values and enforces non-empty `by` for
`group` and a `.csv`/`.jsonl` extension for `join.with` (other
extensions error at validation time, not at evaluation).

### `split`, `validate`, `pivot`, `unpivot` transformations

```ts
interface SplitTransform    { kind: "split";    from: string; into: string[]; on: string | RegExp | Expr; drop?: boolean; }
interface ValidateTransform { kind: "validate"; pred: Expr; message?: Expr; threshold?: number; }
interface PivotTransform    { kind: "pivot";    index: string[]; on: string; values: string; agg?: "sum" | "count" | "avg" | "min" | "max" | "first"; }
interface UnpivotTransform  { kind: "unpivot"; id: string[]; measures: string[]; names_to?: string; values_to?: string; }
```

The V2 Zod schema permits these four `kind` values. Schema-level
checks: `split.into` non-empty; `pivot.index` non-empty; `pivot.on`
not in `pivot.index`; `validate.threshold` in `[0, 1]` when present.
Runtime-evaluation errors (predicate throws, regex doesn't compile,
LLM array-returning expression returns the wrong arity) flow through
the recovery loop as plain strings.

`validate` adds two reserved column names: `_valid` (boolean) and
`_validation` (string | null). A spec that already has a user column
named `_valid` or `_validation` and then appends a `validate`
transformation overwrites them — the V2 patch prompt warns the LLM
about this so it picks fresh names when possible.

`pivot` and `unpivot` evaluate in JS in V2; a `{sql}` companion path
(via DuckDB's native PIVOT/UNPIVOT) is reserved for a later release.

### `{sql}` expression shape

```ts
type SqlExpr = { sql: string };
```

V2 brings DuckDB in-process via `@duckdb/node-api`. Module init creates
a single `Database` and `Connection`, registered as the table-level
process state alongside the runner. The current rows are registered as
a relation `t` (`conn.register('t', rows)`) before each
SQL-touching transformation runs; the registration is replaced on
every commit so SQL sees the latest committed state. Errors from
DuckDB (parse, type, runtime) feed back through the recovery loop as
plain strings, no stack traces.

Cancellation: the runner holds the connection in scope while the
query is in flight. On `AbortSignal` abort, the cancel handler calls
`conn.interrupt()` (the `@duckdb/node-api` method that asks DuckDB to
abort its current query). The pending query promise rejects with a
DuckDB *"INTERRUPT"* error, which the runner translates to the same
*"cancelled"* error shape the LLM-cancel path emits. The 2-second
cancel budget applies — if `interrupt()` doesn't take effect within
that window, the runner still signals cancelled and the next request
must wait for the lingering query to drain (`Runner.request` already
throws when a second request starts while one is running). The
DuckDB relation `t` is not unregistered on cancel.

| Env var | Default | Effect |
|---|---|---|
| `TAMEDTABLE_DUCKDB_PATH` | `:memory:` | Path for the DuckDB database; default keeps state in process memory. |
| `TAMEDTABLE_DUCKDB_THREADS` | `4` | `SET threads = N` issued at init. |

### Web UI

The web app is a separate package under `src/packages/web/` (Vite +
React; no Bun-specific APIs in the renderer code, since it ships as
static assets). It imports `@tamedtable/headless` directly — no HTTP
layer in V2; the model call goes from the browser to Anthropic
through the same SDK, with the API key read from a per-tab settings
panel rather than an env var. File-system access uses the File System
Access API where available, falling back to download/upload for
browsers that don't support it.

Exit codes are CLI-only; web errors surface as toasts inside the
table view and carry the same error strings the recovery loop
produces.
