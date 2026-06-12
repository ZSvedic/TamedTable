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
  | { kind: "filter";   pred: Expr }                                             // #FilterRows #Dedupe
  | { kind: "mutate";   columns: string | string[]; value: Expr }               // #DataNorm
  | { kind: "select";   columns: string[] }                                     // #ColSelect
  | { kind: "sort";     by: Array<{ key: Expr | string; dir: "asc" | "desc" }> } // #SortRows
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

A single Zod schema (`validateSpec` / `SpecSchema`) covers the whole type
set and runs at three points:

1. When `loadCsv` or `loadJsonl` builds the initial spec.
2. When the `apply_spec_patch` tool merges a patch.
3. When `runCli execute` loads a `.flow` file.

The schema checks: `kind` is one of the nine verbs; `Expr` is one of the
three shapes; `split.into` and `pivot.index` are non-empty (an empty
`group.by` is allowed — it aggregates the whole table into one row);
`validate.threshold` is in `[0, 1]`; `join.with` ends in `.csv` or
`.jsonl`. It does *not* check whether a JS body compiles or whether an
`{Column}` placeholder matches a real column — those errors surface at
evaluation time and flow through the recovery loop. V2.5 removed the
legacy V1-only schema (see [§ V2.5](#v25)); there is no longer a
separate "V2 feature in V1 spec" rejection path.

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
  request(text: string, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; audio?: RequestAudio; onTranscript?: (text: string) => void }): Promise<void>;
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

/** Spoken audio riding along on the patch turn (web voice input). When set,
 *  every patch-turn call in the request sends the audio as a file part next
 *  to the prompt text; `text` carries the instructions and table context.
 *  When audio is attached the apply_spec_patch tool schema gains an optional
 *  `transcript` argument the model fills with a verbatim transcript of the
 *  audio (text requests keep the plain schema, so their request bodies and
 *  recorded cassettes are unchanged); when present, the request's
 *  `onTranscript` callback fires with it (first turn that carries one wins). */
type RequestAudio = { data: Uint8Array; mediaType: string };
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
  onChunk?: (update: ChunkUpdate) => void;     // #LLMCells
  onPlan?: (items: PlanItem[]) => void;
  onDebug?: (info: RequestDebugInfo) => void;  // #DebugOut
  signal?: AbortSignal;       // #CancelOp
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;  // #Cassettes
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

interface CellSample {
  column: string;
  samples: Array<{ in: unknown; out: unknown }>;   // up to 3 before→after pairs
}

interface RequestDebugInfo {
  userRequest: string;
  turns: RequestDebugTurn[];
  expressions: Array<{ label: string; body: string }>;   // success path: primary expr per appended transformation
  cellSamples: CellSample[];   // per-column LLM replies for {llm} mutate transformations
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
`value`, …); `cellSamples` captures up to 3 per-row LLM before→after
pairs for each column that uses a `{llm}` mutate transformation (empty
array when no such transformations ran); `turns` carries the failure
detail; `modelCalls`, `inputTokens`, `outputTokens`, and `elapsedMs`
are filled either way. A
model id shaped `claude-<family>-<major>-<minor>` renders in the debug
block as `<Family> <major>.<minor>` (so `claude-sonnet-4-6` →
`Sonnet 4.6`); any other id renders verbatim.

<!-- #ConfigEnv -->
Env vars:

| Var | Default | Effect |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required. May also be passed via `opts.apiKey`. |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com/v1` | Custom endpoint. |
| `TAMEDTABLE_MODEL` | `claude-sonnet-4-6` | Model that writes the spec patch each turn. |
| `TAMEDTABLE_CELL_MODEL` | `claude-sonnet-4-5` | Model that fills in per-row LLM cells when the main model is Anthropic. Cross-provider mains fall back to a per-provider **text** default — `gemini-3.5-flash` (Google), `gpt-5.4-mini` (OpenAI) — never the main model itself, because an audio-only main like `gpt-audio` rejects text-only cell calls. |
| `TAMEDTABLE_RPM` | `40` | Per-process requests-per-minute cap (org ceiling is 50). |
| `TAMEDTABLE_BATCH_SIZE` | `20` | Rows packed into one LLM request. Set to `1` to disable batching. |
| `TAMEDTABLE_CHUNK_SIZE` | `5` | LLM requests fired concurrently. |
| `TAMEDTABLE_DEBUG` | `on` | On by default — the REPL prints a per-turn debug block after a failed request. Set to `0`, `false`, or `off` to disable. |

### Recording model calls for tests (#Cassettes)

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
| `off` (or any other value) | No recorder is installed; every call hits the network — a live run. |

`cucumber.js` defaults `TAMEDTABLE_CASSETTE` to `replay` when it is
unset, so the suite runs offline unless a command opts into `record`
or `off`. The fingerprint is strict by design: a changed prompt is
always a miss, never a silent stale hit.

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
in [behavior.md §CLI/REPL](behavior.md#cli) (`:help`, in-session) <!-- #ReplCmds -->
and [behavior.md §CLI/Discovery](behavior.md#cli) (`--help` / `-h` /
`help`, binary invocation), <!-- #CliFlags --> both loaded as strings at module init and
emitted unchanged. `runCli` returns instead of calling `process.exit`
so callers can decide what to do with a failure.

`.flow` file shape:

```json
{
  "version": 2,
  "source": "datanorm-input.csv",
  "spec": { /* Spec — see Data model above */ }
}
```

`:save-flow` writes `version: 2`. `execute` <!-- #BatchExec --> accepts a `version` of `1`
or `2` and validates the spec against the single schema either way; any
other `version` exits 2. A relative `source` is read relative to the
`.flow` file's own directory; `--input` overrides it.

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
module-internal string of the same name. Four sections required:
`SYSTEM_PROMPT`, `BATCH_SYSTEM_PROMPT`, `CELL_FORMAT_CONSTRAINT`, and
`PYTHON_EXPORT_PROMPT` (added in V2.5 — the system message for the
`:save-py` translation call). Any required section missing throws at
load time with a clear error pointing at the file.

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

### CSV (and other tabular) output (#FormatOut)

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

### `group` and `join` transformations (#Aggregate #LookupJoin)

```ts
interface GroupTransform { kind: "group"; by: Array<Expr | string>; agg: Record<string, Expr>; }
interface JoinTransform  { kind: "join";  with: string; on: Expr; how?: "inner" | "left"; }
```

The `by` list accepts either a bare column name (string) or a full
`Expr` — same shorthand `sort.by[].key` already uses — and may be
empty, which aggregates the whole table into a single output row. `agg`
expressions evaluate with the group's row slice bound as `rows` for
JS (`(rows, key, allGroups) => …`), and as a relation for SQL — named
`g`, and also reachable as `t` so a fragment that references the table
by name resolves; LLM aggregates receive the group's compact JSON as
`{*}`.

`Runner.loadInput` continues to dispatch on extension; the join's
right-side path is loaded by the same code path. The V2 Zod schema
permits these two `kind` values and enforces a `.csv`/`.jsonl`
extension for `join.with` (other extensions error at validation time,
not at evaluation).

### `split`, `validate`, `pivot`, `unpivot` transformations (#ColSplit #Validate #PivotData)

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

### `{sql}` expression shape (#SqlExpr)

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

### Web UI (#WebUI)

The web app is a separate package under `src/packages/web/` (Vite +
React; no Bun-specific APIs in the renderer code, since it ships as
static assets). It imports `@tamedtable/headless` directly — no HTTP
layer in V2; the model call goes from the browser to Anthropic
through the same SDK, with the API key read from a per-tab settings
panel rather than an env var. File-system access uses the File System
Access API where available, falling back to download/upload for
browsers that don't support it.

`WebController.request` always sends `config.anthropicKey` as the
Anthropic `x-api-key` — text requests route through Anthropic whatever
provider is selected (Google/OpenAI are voice-only here). It rejects
before any network call when `anthropicKey` is null or empty, surfacing
the toast `Text requests require an Anthropic API key — open Settings and
add one.`

Exit codes are CLI-only; web errors surface as toasts inside the
table view and carry the same error strings the recovery loop
produces.

Pagination, cell selection, and the chosen model are `WebController`
state, not spec fields — the same split the CLI keeps for its viewport.
Provider, key, and model config flow through `ResolvedConfig` from
`@tamedtable/model-config` (see [§ Model config](#model-config));
`WebSettings` is replaced by `ResolvedConfig`. `WebController` gains the
surface below.

```ts
// pagination — 20 rows per page; the page index is 1-based and clamps
// to [1, pageCount()]
WebController.pageSize: number;          // 20
WebController.pageRows(): Row[];         // the current page's slice
WebController.currentPage(): number;
WebController.pageCount(): number;
WebController.totalRows(): number;
WebController.goToPage(page: number): void;

// selection + activity — drive the status footer
WebController.selection: { row: number; column: string } | null;
WebController.selectCell(row: number, column: string): void;
WebController.activityStatus(): 'idle' | 'running' | 'saved';

// model — async: rebuilds the engine with the new model and replays
// the current spec against the source, preserving the loaded table
WebController.setModel(model: string): Promise<void>;

// open sources — local file, remote URL, or a bundled sample (samples
// are surfaced inside the URL dialog as one-click "fill the URL"
// entries, not a separate code path)
WebController.openCsv(): Promise<void>;          // native file picker → load
WebController.openUrlDialog(): void;             // show Open URL dialog
WebController.closeUrlDialog(): void;
WebController.urlDialogOpen: boolean;
WebController.loadFromUrl(url: string): Promise<void>;  // fetch + load

// helpers exported from the web package
function detectFormat(pathname: string, contentType: string | null): 'csv' | 'jsonl' | null;
```

`loadFromUrl` validates the URL shape (http/https only), `GET`s the
body, detects the format (path extension first, `Content-Type` as
fallback), and routes the bytes through the same `loadFromPicked`
path local files use. Failures throw; the dialog catches and renders
the message inline and stays open. `WebControllerOptions.fetch`, when
present, replaces the global `fetch` used here — the same hook the
engine uses for cassette replay, so URL-load scenarios run offline.

The toolbar's split-button (`SplitButton`) and the empty-state card's
split-button share one component: the primary action opens the URL
dialog, the dropdown carries **Open local…**. The two halves render
inside one rounded shell with a single hover tint and no internal
divider, so the pair reads as one control.

## V2.5

→ [behavior.md — V2.5](behavior.md#v25)

### One spec schema

`validateV1Spec` and the `V1*Schema` Zod definitions are removed from
`@tamedtable/core`. `validateSpec` (over `SpecSchema`) is the only
validator. `runCli execute` no longer branches on `flow.version`: a
`version` of `1` or `2` both validate through `validateSpec`. The nine
`version: 1` test `.flow` fixtures are bumped to `version: 2`.

### Sorting by a SQL or AI key

`applySort` no longer compiles every `sort.by[].key` as JS. A key is
resolved by `Expr` shape, mirroring `mutate`: a `string` reads the
column; `{js}` compiles; `{sql}` evaluates one scalar per row through
the shared DuckDB connection (`SELECT (<fragment>) AS r FROM t`, input
order preserved); `{llm}` evaluates one cell per row through the cell
model. Multi-key sorts evaluate each key's per-row values up front,
then compare. SQL/LLM key evaluation makes `applySort` async; the
runner already `await`s every transformation.

### A formatter bug never fails a request

The `onPlan` callback dispatch in `Runner.request` is wrapped in
`try/catch`. `computePlan` and the callback can throw without aborting
the request — the plan line is dropped, the commit proceeds.

### `:save-py` (#PyExport)

```ts
interface HeadlessRunner {
  // …
  exportPython(): Promise<string>;   // V2.5 — one model call, returns the script text
}
```

`exportPython` builds a prompt from the current committed spec and
makes one `generateText` call with `PYTHON_EXPORT_PROMPT` as the system
message, returning the generated script as a string. It is recorded by
the cassette recorder like any other model call. The CLI `:save-py`
handler: validates the `.py` extension and the path; scans
`currentSpec().transformations` for any `{llm}` `Expr` and refuses if
one is present; otherwise calls `exportPython` and writes the result.
`:save-py` is REPL-only — no `tamedtable` subcommand in V2.5.

## Model config

→ [spec/packages/model-config/behavior.md](../spec/packages/model-config/behavior.md)

```ts
type Provider = "anthropic" | "gemini" | "openai";

interface ModelDef { id: string; name: string; desc: string; provider: Provider; voiceInput: boolean; default?: boolean; }

interface ResolvedConfig {
  provider: Provider;
  anthropicKey: string | null;
  geminiKey: string | null;
  openaiKey: string | null;
  model: string;
}

interface StoragePort {
  read(): Partial<ResolvedConfig>;
  write(c: Partial<ResolvedConfig>): void;
  clear(): void;
}

const ALL_MODELS: readonly ModelDef[];  // imported from models.json — the catalogue's single source
function resolveConfig(env: Record<string, string | undefined>, stored: Partial<ResolvedConfig>): ResolvedConfig;
function defaultModel(provider: Provider): string;
function providerFor(modelId: string): Provider;
function readConfigFromEnv(): Record<string, string | undefined>;  // Node/Bun only — in env.ts; reads ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, TAMEDTABLE_MODEL
```

```ts
// ModelChooser.tsx entry point — react is a peer dependency
interface ModelChooserProps {
  models: readonly ModelDef[];
  provider: Provider;
  model: string;
  keys: Record<Provider, string>;
  expandedProvider: Provider | null;
  onProviderClick(p: Provider): void;
  onKeyChange(p: Provider, value: string): void;
  onModelSelect(modelId: string): void;
}
function ModelChooser(props: ModelChooserProps): ReactNode;  // styled via --mc-* CSS custom properties
```

`@tamedtable/model-config` has four entry points: the main `index.ts` (no
`process` references, runs in any environment), `env.ts` (reads
`process.env`; Node/Bun only), `ModelChooser.tsx` (React; browser only), and
`storage.ts` (the localStorage `StoragePort` implementation — browser only,
but a safe no-op anywhere without localStorage):

```ts
// storage.ts entry point — implements StoragePort over localStorage
function readStoredConfig(): Partial<ResolvedConfig>;
function writeStoredConfig(c: Partial<ResolvedConfig>): void;
function clearStoredConfig(): void;
```

The web controller imports these from `@tamedtable/model-config/storage`.

## Voice input

→ [behavior.md — Voice input](behavior.md#voice-input-voiceinput)

Web-only. The `VoicePort`, the MediaRecorder→WAV browser implementation, and
`buildVoicePrompt` live in `@tamedtable/voice-input` (#VoicePort); the
`MicButton` component (`@tamedtable/chat-panel`) and the `WebController` voice
methods drive it.

```ts
interface VoiceContext {
  filename: string;
  columns: string[];
  selectedCell?: { col: string; row: number; value: string };
}

function buildVoicePrompt(ctx: VoiceContext): string;   // pure, testable

interface VoicePort {
  startRecording(): Promise<void>;
  stopRecording(): Promise<Blob>;
  cancelRecording(): void;
}
```

`buildVoicePrompt` renders the deterministic instruction text that accompanies
the audio on the patch turn — it says the request is spoken in the attached
audio and adds the table context: the filename, the column list, and the
selected cell when present. It makes no network call, so it is unit/Gherkin
testable.

There is no separate voice network call. `WebController.stopVoice` converts
the recorded `Blob` to bytes and passes it as the `audio` option of the
ordinary `Runner.request` (see [§ Core / runner](#core--runner)); the engine
attaches it as a file part on the patch-turn model call. The request flows
through the engine's normal `fetch` hook, so the cassette recorder covers it
with no extra wiring. The user bubble and the undo-history label for a voice
turn start as the placeholder `🎙 Voice request` and are replaced by
`🎙 <transcript>` when the model returns one.

`VoicePort` is the recording surface. The browser implementation
(`browserVoicePort`) wraps `MediaRecorder`; tests inject a stub returning a
fixed `Blob`. `WebControllerOptions.voice` supplies it; the browser passes
`browserVoicePort()` in `main.tsx`.

`WebController` adds `voiceStatus: 'idle' | 'recording' | 'sending'` and three
methods: `startVoice()` begins recording (auto-stopping after 30 s),
`stopVoice()` ends it, builds a `VoiceContext` from `currentSpec()` and
`selection`, and runs the ordinary `request` with the recorded bytes as the
`audio` option — one patch turn, no transcription call. It posts a
`🎙 Voice request` placeholder user bubble immediately; when `onTranscript`
fires it rewrites that bubble (and, on success, the undo-history label) to
`🎙 <transcript>`. Request failures go through the same `fail()` path a
typed request uses — error toast plus an `Error: Voice input failed: …`
assistant message carrying the request's `RequestDebugInfo`. `cancelVoice()` discards the recording. The mic button is
gated on the selected model's `voiceInput` flag plus a key for the selected
provider. `browserVoicePort` re-encodes the MediaRecorder output to 16 kHz
mono PCM16 WAV before resolving, so the same bytes work for both Gemini
(`inlineData`) and OpenAI (`input_audio`, which accepts only wav/mp3). The
engine routes OpenAI models through the Chat Completions API (`.chat(...)` on
the AI SDK provider) — `gpt-audio` is not served by the Responses API the SDK
would otherwise default to.

Because every text request routes through Anthropic regardless of the selected
provider, `ensureHeadless` builds the engine with the selected model when it is
an Anthropic model and with `defaultModel('anthropic')` otherwise — so a voice
session (provider Google) still issues its follow-up patch call with a valid
Anthropic model.

## Tutorial mode

→ [behavior.md — Tutorial mode](behavior.md#tutorial-mode-tutorialmode)

### Gherkin Tour parser (`@tamedtable/gherkin-tour`)

```ts
export type TourAction =
  | { kind: 'load-file';     filename: string }
  | { kind: 'load-lookup';   filename: string }  // lookup table; no loadInput call
  | { kind: 'prefill-chat';  text: string     }
  | { kind: 'show-golden'                      }
  | { kind: 'golden-source'; filename: string }  // lifted onto scenario.golden
  | { kind: 'display'                          }

export interface TourStep     { keyword: string; text: string; action: TourAction }
export interface TourScenario { name: string; tags: string[]; steps: TourStep[]; golden?: string }

export function parseTours(source: string): TourScenario[]
```

`parseTours` accepts a raw `.feature` file string and returns **every**
scenario (each with its `tags`) and its Background steps prepended; the consumer
filters by tag. Scenario Outlines are skipped. `display` steps (unclassified
verification/narration) are dropped from `steps`; a `golden-source` step is
lifted onto `scenario.golden` and likewise dropped. So a returned `steps` list
holds only `load-file`, `load-lookup`, `prefill-chat`, and `show-golden`.

### TutorialSources (`@tamedtable/web`)

```ts
export interface TutorialSources {
  tours:   TourScenario[];
  inputs:  Record<string, string>;   // filename → raw text (CSV/JSONL)
  goldens: Record<string, string>;   // filename → raw JSONL
}
```

`TutorialSources` is passed to `WebControllerOptions.tutorialSources`. In the
browser it is assembled from `__TT_TUTORIAL__` (a Vite `define` global) at
app start. In tests it is built by reading `spec/test-cases/` via `readFileSync`.

```ts
export interface WebControllerOptions {
  // ...
  tutorialSources?: TutorialSources;
}
```

### Tutorial controller methods

| Method | Description |
|---|---|
| `openTutorial()` | Sets `tutorialOpen = true`. |
| `closeTutorial()` | Sets `tutorialOpen = false`; calls `cancelTutorial()`. |
| `tutorialScenarioNames(): string[]` | Names of `@tutorial` tours (the clickable list). |
| `devScenarioNames(): string[]` | Names of `@web` non-`@tutorial` scenarios (the Dev dropdown). |
| `selectTutorialScenario(name)` | Sets `activeTourIndex` by name; resets step state. |
| `async playTutorial()` | Resets step state; executes step 0. |
| `async nextStep()` | Increments step index; executes the new step. |
| `prevStep()` | Decrements step index; no step execution (display only). |
| `cancelTutorial()` | Clears `tutorialStepIndex`, `goldenRows`, `tutorialPrefill`; keeps `activeTourIndex`. |
| `isTutorialActive(): boolean` | True when `tutorialStepIndex !== null`. |
| `currentTutorialStepNumber(): number \| null` | 1-based step number. |
| `tutorialStepCount(): number` | Total steps in the active tour. |
| `selectedTourName(): string` | Name of the currently selected tour. |
| `currentStepDetail()` | `{ keyword, text }` of the current step, or `null`. |
| `currentStepElementId(): string \| null` | DOM id to spotlight: `tutorial-open-btn`, `tutorial-chat-input`, or `tutorial-table-view`. |

## V3

→ [behavior.md — V3](behavior.md#v3)

Deferred. No V2.5 type or signature changes. The relevant grammar is
already in the `Transformation` union (`split.on` accepts an `Expr`;
`group.agg` accepts a `{sql}` `Expr`); the V3 work is runtime support,
plus a `sort` `limit` field (or a `take` transformation) and a REPL
command for CSV column order.
