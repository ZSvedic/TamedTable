# TamedTable code contract

Types, signatures, library choices, env vars, exit codes. Section structure
mirrors [behavior.md](behavior.md); each section links back to its behavior
twin.

## Data model

→ [behavior.md — Data model](behavior.md#data-model)

The model below lives in the zero-dependency base package
`@tamedtable/table-plan`: `Row`, `Expr`, `Transformation` and their schemas,
`TablePlan`, `TablePlanSchema`, `validateTablePlan`, and the `FormatCodec`
interface (see [§ Format codecs](#format-codecs)). `@tamedtable/core`
re-exports the whole surface, so `from '@tamedtable/core'` keeps resolving
every name. The dependency DAG is `core → file-io → table-plan`,
`core → table-plan` — no cycle.

```ts
type Expr =
  | { js:  string }                              // arrow function BODY
  | { sql: string }                              // DuckDB SQL expression
  | { llm: string; model?: string };             // prompt template, {Column} + {*} placeholders

type Transformation =
  | { kind: "filter";   pred: Expr }                                             // #FilterRows #Dedupe
  | { kind: "mutate";   columns: string | string[]; value: Expr }               // #DataNorm
  | { kind: "select";   columns: string[] }                                     // #ColSelect
  | { kind: "sort";     by: Array<{ key: Expr | string; dir: "asc" | "desc" }>; limit?: number } // #SortRows
  | { kind: "group";    by: Array<Expr | string>; agg: Record<string, Expr> }    // #Aggregate
  | { kind: "join";     with: string; on: Expr; how?: "inner" | "left" }         // #LookupJoin
  | { kind: "split";    from: string; into: string[]; on: string | RegExp | Expr; drop?: boolean }  // #ColSplit
  | { kind: "validate"; pred: Expr; message?: Expr; threshold?: number }         // #Validate
  | { kind: "pivot";    index: string[]; on: string; values: string; agg?: "sum" | "count" | "avg" | "min" | "max" | "first" }  // #PivotData
  | { kind: "unpivot";  id: string[]; measures: string[]; names_to?: string; values_to?: string };  // #PivotData

type Row = Record<string, unknown>;

interface TablePlan {
  table?: string;
  columns: Array<{ id: string; label?: string; format?: string }>;
  transformations: Transformation[];
  filter?: unknown;
  sort?: unknown;
  page?: { size?: number; offset?: number };
  summary?: { groupBy: unknown[]; aggregates: unknown[] };  // both must be []
}
```

A single Zod schema (`validateTablePlan` / `TablePlanSchema`) covers the whole type
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
evaluation time and flow through the recovery loop. A single schema
validates every spec; there is no separate legacy rejection path.

The type accepts the full `Expr` union everywhere, but the engine
evaluates only some shapes per slot today; an unsupported shape throws
at evaluation time and flows through the recovery loop:

| Slot | Accepted today |
|---|---|
| `filter.pred` | `{js}`, `{sql}` |
| `mutate.value` | `{js}`, `{sql}`, `{llm}` |
| `sort.by[].key` | string, `{js}`, `{sql}`, `{llm}` |
| `group.by` keys | string, `{js}` |
| `group.agg` values | `{js}`, `{sql}`, `{llm}` |
| `join.on` | `{js}` |
| `split.on` | literal string, `RegExp`, `{js}`, `{llm}` |
| `validate.pred` / `validate.message` | `{js}` |

Patches: RFC 6902 via `fast-json-patch`; RFC 7396 merge hand-rolled
(~20 LOC).

## Core / runner

→ [behavior.md — Core / runner](behavior.md#core--runner)

```ts
function loadCsv(path: string):   Promise<{ spec: TablePlan; rows: Row[]; sourcePath: string }>;
function loadJsonl(path: string): Promise<{ spec: TablePlan; rows: Row[]; sourcePath: string }>;
function readJsonl(path: string): Promise<Row[]>;
function writeJsonl(path: string, rows: Row[], columnOrder?: string[]): Promise<void>;

interface Runner {
  loadInput(path: string): Promise<void>;
  // Path-free sibling of loadInput: load already-parsed rows + a fresh-load
  // plan. The web parses a picked/fetched file through the file-io codec
  // registry and loads the rows here, so the browser needs no filesystem.
  loadParsed(rows: Row[], spec: TablePlan): Promise<void>;
  // Stage a lookup table by name so a `join` whose `with` matches resolves
  // against these rows instead of reading the file by path — lets joins run
  // in the browser. An unregistered name falls back to the by-path read.
  registerLookup(name: string, rows: Row[]): void;
  request(text: string, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; audio?: RequestAudio; onTranscript?: (text: string) => void }): Promise<void>;
  setSpec(spec: TablePlan): Promise<void>;
  currentRows(): Row[];
  currentSpec(): TablePlan;
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

`core` owns byte-acquisition (`node:fs`) only; the parse/serialize of each
format lives in the `file-io` codec registry (see [§ Format codecs](#format-codecs)).
`loadCsv` reads the file's raw bytes and hands them to the CSV codec (which
decodes and parses with `csv-parse`, `trim: true` — unquoted leading/trailing
whitespace stripped, quoted fields verbatim), then builds the initial plan from
the codec's columns; it still throws `loadCsv: <path> has no header row` /
`… duplicate column "…"`. `loadJsonl` and `readJsonl` hand the bytes to the
JSONL codec, which derives the column list from the union of keys across rows
(insertion order from the first row each key appears in). `Runner.loadInput` dispatches on file extension — `.csv`
to `loadCsv`, `.jsonl` to `loadJsonl`, and any other registered extension
(`.parquet`, `.arrow`, …) through the codec registry; an extension no codec
claims throws a clear *"unknown file type"* error that the REPL surfaces
inline. `writeJsonl`
overwrites the file; the parent directory must already exist. The recovery
budget is 3 turns; running out throws an error carrying a `debug` field —
a `RequestDebugInfo` (see Headless).

`Runner` is the surface step definitions drive ([common.steps.ts](../src/tests/common.steps.ts));
the CLI and headless packages both return Runners with the same method
signatures, differing only in what each does under the hood.

## Format codecs

→ [spec/packages/file-io/behavior.md](packages/file-io/behavior.md)

Every table format is a `FormatCodec` (declared in `@tamedtable/table-plan`),
held in a load-on-demand registry inside `@tamedtable/file-io`:

```ts
interface ParsedTable { rows: Row[]; columns: string[] }

interface FormatCodec {
  id: string;                 // "csv", "jsonl", …
  extensions: string[];       // [".csv"]
  contentTypes: string[];     // ["csv"]
  parse(bytes: Uint8Array, name: string): ParsedTable;   // text codecs decode internally
  serialize(rows: Row[], columns: string[]): Uint8Array;
  load?: () => Promise<void>; // dynamic import of a heavy parser/engine
}

// file-io registry surface
type FormatId = 'csv' | 'jsonl' | 'parquet' | 'arrow';
function detectFormat(pathname: string, contentType: string | null): FormatId | null;
function formatForExtension(pathname: string): FormatId | null;
function loadCodec(id: FormatId): Promise<FormatCodec>;
```

`detectFormat`/`formatForExtension` read a synchronous descriptor table
(id + extensions + content types); `loadCodec` pulls the codec — and its
parser — only on first use, so a run that never touches a format never imports
its parser. `core`'s `loadCsv`/`loadJsonl`/`readJsonl`/`writeJsonl`/`writeCsv`
delegate parse/serialize to the registry; `writeRows` dispatches on extension
and routes `.csv`→`writeCsv`, `.jsonl`→`writeJsonl`. Adding a format is one
codec file plus one registry row.

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
  onPlanEdits?: (items: PlanEdit[]) => void;
  onDebug?: (info: RequestDebugInfo) => void;  // #DebugOut
  signal?: AbortSignal;       // #CancelOp
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;  // #Cassettes
}

type PlanEdit =
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
6902 operations list. Each op's `value` is a JSON-encoded **string**;
the runner decodes it with `JSON.parse`. A near-miss encoding — valid
JSON but for a stray invalid escape the model slipped in (e.g. an
apostrophe escaped as `\'`, which JSON does not allow) — is repaired
(the stray backslash dropped, valid escapes including `\\` kept) and
parsed once more before the value is left as a plain literal. Anthropic
prompt caching uses `providerOptions.anthropic.cacheControl =
{ type: 'ephemeral' }` on the system-prompt prefix.

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
| `ANTHROPIC_API_KEY` | — | Anthropic key. May also be passed via `opts.apiKey`. |
| `GEMINI_API_KEY` | — | Google Gemini key. |
| `OPENAI_API_KEY` | — | OpenAI key. |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com/v1` | Custom endpoint. |
| `TAMEDTABLE_MODEL` | `gemini-3.5-flash` | Model that writes the spec patch each turn. |
| `TAMEDTABLE_CELL_MODEL` | `gemini-3.1-flash-lite` | Secondary model that fills in per-row LLM cells. Must share the main model's provider; a cross-provider value is coerced to that provider's **text** default — `gemini-3.1-flash-lite` (Google), `claude-haiku-4-5` (Anthropic), `gpt-5.4-mini` (OpenAI). |
| `TAMEDTABLE_RPM` | `40` | Per-process requests-per-minute cap (org ceiling is 50). |
| `TAMEDTABLE_BATCH_SIZE` | `20` | Rows packed into one LLM request. Set to `1` to disable batching. |
| `TAMEDTABLE_CHUNK_SIZE` | `5` | LLM requests fired concurrently. |
| `TAMEDTABLE_DEBUG` | `on` | On by default — the REPL prints a debug block after every request: executed expressions on success, per-turn detail on failure, a usage summary either way. Set to `0`, `false`, or `off` to disable. |

Exactly one provider key is required — `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
or `OPENAI_API_KEY`. `resolveConfig` picks the provider from whichever is set
(Gemini > OpenAI > Anthropic when several are), and `TAMEDTABLE_MODEL` must
name a model from that provider.

The CLI calls `core`'s `loadEnv()` at startup: it looks for a `.env`
file in the working directory and up to four parent directories,
parses it, and sets each variable only when the environment doesn't
already define it — real env vars always win.

### Recording model calls for tests (#Cassettes)

Headless makes every model HTTP call through `fetch`.
`createHeadlessRunner` forwards `opts.fetch` into
`createAnthropic({ apiKey, baseURL, fetch })`, so the SDK routes all
HTTP through it. When `opts.fetch` is unset the SDK uses the global
`fetch` and behavior is unchanged. `fetch?` is typed as the plain
`(input, init) => Promise<Response>` call signature a wrapper actually
implements; the SDK's own `fetch` field is `typeof globalThis.fetch`,
so the forward casts to bridge the two.

The cucumber suite passes a `fetch`-shaped *cassette recorder* as
`opts.fetch`. The recorder fingerprints each request — a SHA-256 hex
digest of `method + "\n" + url + "\n" + body` — and looks it up in a
cassette file. The `TAMEDTABLE_CASSETTE` env var selects the mode:

| `TAMEDTABLE_CASSETTE` | Behavior |
|---|---|
| `record` | Hit → return the saved response, no network. Miss → call the wrapped real `fetch`, save a successful response, return it. Needs the real key of the provider being recorded (`GEMINI_API_KEY` — every cassette records with the Gemini defaults; the `@web` provider-key step also substitutes `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` from the environment for scenarios that select those providers). |
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
feature file at `cassettes/<feature>.json` in the repo root — committed
recorded data, not human-reviewed contract, so they sit outside `spec/`,
and not regenerable from spec (re-recording needs a live API key), so
they sit outside `src/` too. They are written pretty-printed with keys sorted
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
or persist a history file — readline's in-memory history is
sufficient for a single session.

The ASCII renderer is hand-rolled `padEnd` (~30 LOC). Page size
`(pageRows, pageCols)` is recomputed at startup, on every `SIGWINCH`,
and after `:viewport` from `process.stdout.columns` /
`process.stdout.rows`:

- `autoRows = max(1, process.stdout.rows - REPL_CHROME_LINES)` where
  `REPL_CHROME_LINES = 5` (header + separator + bottom truncation
  marker + prompt + one line of breathing room).
- `autoCols` is a fixed-average estimate:
  `floor((process.stdout.columns - REPL_INDENT) / REPL_AVG_COL_WIDTH)`
  with `REPL_INDENT = 1` and `REPL_AVG_COL_WIDTH = 16` (average cell
  plus the ` | ` separator), floored at `REPL_FALLBACK_COLS = 5`. The
  estimate is deliberately conservative — at the default 80-col TTY it
  yields 5, and `:viewport` overrides it when the data needs a
  different ratio.

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
emitted unchanged. `--version` / `-v` <!-- #CliFlags --> writes `tamedtable ${version}`
(the `version` field of the CLI package manifest) and returns exit 0.
`runCli` returns instead of calling `process.exit`
so callers can decide what to do with a failure.

`.flow` file shape:

```json
{
  "version": 2,
  "source": "customers-input.csv",
  "spec": { /* TablePlan — see Data model above */ }
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
`PYTHON_EXPORT_PROMPT` (the system message for the `:save-py` translation
call). Any required section missing throws at
load time with a clear error pointing at the file.

The runtime uses `SYSTEM_PROMPT` as the system message on every patch-turn
call and `BATCH_SYSTEM_PROMPT` as the system message on every multi-row
cell evaluation. `CELL_FORMAT_CONSTRAINT` is loaded so spec-driven tools
(WoZ, future validators) can reference it; it already appears verbatim as
a substring inside `SYSTEM_PROMPT`'s few-shots.

Editing `prompt-app-edit.md` is the way to tune any of these. `src/` does
not contain the prompt text directly.

## Extended transformations, SQL, and the web UI

→ [behavior.md — Extended transformations, SQL, and the web UI](behavior.md#extended-transformations-sql-and-the-web-ui)

The wire model is the same `(spec, row_stream)` throughout: the spec is
the contract. The `group`, `join`, and `{sql}` shapes in the type union
above parse against the single Zod schema like every other shape.

### CSV (and other tabular) output (#FormatOut)

`writeCsv` mirrors the `writeJsonl` signature:

```ts
function writeCsv(path: string, rows: Row[], columnOrder: string[]): Promise<void>;
```

`columnOrder` is required for CSV (the header row needs it); for
JSONL it stays optional. The writer uses
`csv-stringify/sync` from the `csv` package (already pulled in
transitively by `csv-parse`) with `header: true`, RFC 4180
quoting, `\n` line endings, and no BOM. Nested values
(`typeof === 'object' && !== null`) round-trip through `JSON.stringify`.

`Runner.exportAs` and the REPL `:save` command dispatch on extension
through the codec registry (`writeRows`): `.jsonl` → `writeJsonl`,
`.csv` → `writeCsv`, other registered formats (`.parquet`, `.arrow`)
through their codecs. An extension no codec claims throws the
*"unknown file type"* error, surfaced inline by the REPL and as exit
code 4 by `tamedtable execute`.

### `group` and `join` transformations (#Aggregate #LookupJoin)

```ts
interface GroupTransform { kind: "group"; by: Array<Expr | string>; agg: Record<string, Expr>; }
interface JoinTransform  { kind: "join";  with: string; on: Expr; how?: "inner" | "left"; }
```

The `by` list accepts either a bare column name (string) or a `{js}`
expression (`{sql}`/`{llm}` keys throw at evaluation — see the support
matrix in [Data model](#data-model)) and may be
empty, which aggregates the whole table into a single output row. `agg`
expressions evaluate with the group's row slice bound as `rows` for
JS (`(rows, key, allGroups) => …`), and as a relation for SQL — named
`g`, and also reachable as `t` so a fragment that references the table
by name resolves; LLM aggregates receive the group's compact JSON as
`{*}`.

`Runner.loadInput` continues to dispatch on extension; the join's
right-side path is loaded by the same code path. The Zod schema
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

The Zod schema permits these four `kind` values. Schema-level
checks: `split.into` non-empty; `pivot.index` non-empty; `pivot.on`
not in `pivot.index`; `validate.threshold` in `[0, 1]` when present.
Runtime-evaluation errors (predicate throws, regex doesn't compile,
LLM array-returning expression returns the wrong arity) flow through
the recovery loop as plain strings.

`validate` adds two reserved column names: `_valid` (boolean) and
`_validation` (string | null). A spec that already has a user column
named `_valid` or `_validation` and then appends a `validate`
transformation overwrites them — the patch prompt warns the LLM
about this so it picks fresh names when possible.

A patched spec is checked before it runs: for every `validate`, each
column its `pred`/`message` reads (`row.X` / `row["X"]` in `{js}`,
`{X}` placeholders in `{llm}`; `{sql}` is not parsed) must be a source
column, be created by an earlier transformation, or be `_valid` /
`_validation`. The check walks the transformation list tracking the
available columns (`mutate` adds its targets, `split` its `into`,
`group` its by + agg keys, `select` narrows, `unpivot` replaces; `join`
and `pivot` make later columns unknowable and suspend the check). A
violation rejects the patch through the recovery loop with:

```
validate reads column "<X>" which no earlier step provides. A validate can
only read source columns or columns created by transformations ordered
before it — order the step that computes "<X>" before the validate.
```

Exported for tests as `checkValidateColumnOrder(spec, sourceColumns):
string | undefined` from `@tamedtable/headless`.

`pivot` and `unpivot` evaluate in JS; a `{sql}` companion path
(via DuckDB's native PIVOT/UNPIVOT) is reserved for a later release.

### `{sql}` expression shape (#SqlExpr)

```ts
type SqlExpr = { sql: string };
```

DuckDB runs in-process. In Node (CLI / headless) the engine imports
`@duckdb/node-api` — pinned to an exact version in `src/package.json`
(no caret: its `-r.N` release tags don't range-match as plain semver);
bump the pin deliberately, with the suite green. The version number
itself lives only in `package.json`/`bun.lock`, never here.
In the browser the Vite build aliases that import to a
thin adapter over `@duckdb/duckdb-wasm` (`src/shims/duckdb.ts`) that exposes
the same `DuckDBInstance.create → connect → run / runAndReadAll` surface the
engine calls. The adapter pulls the multi-MB wasm payload through a dynamic
`import()` only when the first connection is created, so a CSV/JSON session
that never runs `{sql}` never loads it. The runner creates its
`DuckDBInstance` and connection lazily, on the first `{sql}` use.
Before each SQL-touching transformation runs, the current rows are
materialized as a table `t` (`CREATE TABLE` with every column
`VARCHAR` — SQL fragments cast as needed — filled by batched
`INSERT`s of 100 rows); any prior `t` is dropped first, so SQL always
sees the latest committed state. Errors from
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
DuckDB table `t` is not dropped on cancel.

| Env var | Default | Effect |
|---|---|---|
| `TAMEDTABLE_DUCKDB_PATH` | `:memory:` | Path for the DuckDB database; default keeps state in process memory. Node only — the browser is always in-memory. |
| `TAMEDTABLE_DUCKDB_THREADS` | `4` | `SET threads = N` issued at init. Node only — the browser wasm build is single-threaded, so the adapter ignores the thread-count setting. |

### Web UI (#WebUI)

The web app is a separate package under `src/packages/web/` (Vite +
React; no Bun-specific APIs in the renderer code, since it ships as
static assets). It imports `@tamedtable/headless` directly — no HTTP
layer; the model call goes from the browser to the selected provider
through the same SDK, with the API key read from a per-tab settings
panel rather than an env var. File-system access uses the File System
Access API where available, falling back to download/upload for
browsers that don't support it.

`{sql}` transformations run in the browser too: the build aliases the
engine's DuckDB import to the `duckdb-wasm` adapter (see [§ `{sql}`
expression shape](#sql-expression-shape)), so a browser session has the same
SQL support the CLI does. The wasm loads lazily on the first `{sql}`
transformation, behind a dynamic `import()` that Vite splits into its own
chunk — the CSV/JSON golden path never fetches it.

`WebController.sendChat` routes a text request through the selected
provider: the engine builds the matching SDK client from `config.model`
and the active provider's key (`config.geminiKey`, `config.openaiKey`, or
`config.anthropicKey`). It rejects before any network call when the
*selected provider's* key is null or empty, surfacing a provider-named
toast such as `Text requests require a Google API key — open Settings and
add one.` A key for a different provider does not satisfy the check.

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
// pagination — 20 rows per page unless the spec's `page` view op sets a
// size (a "top 10" request patches /page); the page index is 1-based and
// clamps to [1, pageCount()]
WebController.pageSize: number;          // spec.page?.size ?? 20
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
// live in their own OpenSampleDialog picker; the URL dialog is
// URL-only)
WebController.openCsv(): Promise<void>;          // native file picker → load
WebController.openUrlDialog(): void;             // show Open URL dialog
WebController.closeUrlDialog(): void;
WebController.urlDialogOpen: boolean;
WebController.loadFromUrl(url: string): Promise<void>;  // fetch + load

// helpers exported from the web package
function detectFormat(pathname: string, contentType: string | null): FormatId | null;  // see § Format codecs
```

`loadFromUrl` validates the URL shape (http/https only), `GET`s the
body, detects the format (path extension first, `Content-Type` as
fallback), and routes the bytes through the same `loadFromPicked`
path local files use. Failures throw; the dialog catches and renders
the message inline and stays open. `WebControllerOptions.fetch`, when
present, replaces the global `fetch` used here — the same hook the
engine uses for cassette replay, so URL-load scenarios run offline.

The three load sources are first-class actions — **Open sample…**,
**Open local…**, **Open URL…**. The toolbar renders them as one
`SplitButton`: the primary action opens the sample picker, the dropdown
carries **Open local…** and **Open URL…**. The two halves render inside
one rounded shell with a single hover tint and no internal divider, so
the pair reads as one control. The empty page stacks the same three as
separate buttons under the brand mark and the line "What table can I
tame?".

At a viewport width of 768 px and below `AppShell` renders
`<MobileShell>` (a `useIsMobile()` media-query hook flips it live on
resize) instead of the desktop sidebar-plus-table tree. Both take the
same `WebController`. Above that, a second hook `useIsNarrow()`
(`max-width: NARROW_MAX_WIDTH`) drives the desktop `Toolbar`'s
`condensed` prop: when true the toolbar hides the file readout and
renders every action icon-only (tooltip retained), so the row fits
without overflowing between the phone breakpoint and full desktop width. The mobile components live in
`src/packages/web/src/components/mobile/`: `MobileShell` composes the app
bar, `MobileTable` (frozen header + row-index column), the five-action
`Dock` (Menu · Undo · History · Type · Speak), one bottom sheet
(`KeyboardSheet` | `VoiceSheet` | `HistorySheet`), and `MenuDrawer`. The
Settings panel, Open-sample / Open-URL dialogs, Toasts, and the
`TutorialPanel`/`TourUi` overlays render in both layouts. The mobile
table carries `id="tutorial-table-view"`, the empty-page **Open sample…**
button carries `id="tutorial-open-btn"`, the composer textarea carries
`id="tutorial-chat-input"`, and the **Speak** dock button carries
`id="tutorial-speak"` (the desktop mic button carries the same id), so the
Driver.js tour targets resolve in both layouts; `MobileShell` opens the
Type sheet whenever the active tour step's element id is the chat input.

The History sheet reads a timeline the journal now exposes:

```ts
interface TimelineStep { label: string; time: number; } // time: epoch ms
// SpecJournal
timeline(): { steps: TimelineStep[]; cursor: number }; // cursor: index of current step, -1 before the first
jumpTo(index: number): TablePlan | undefined;          // moves the cursor; returns the spec to apply
// WebController
historyTimeline(): { steps: TimelineStep[]; cursor: number };
jumpToHistory(index: number): Promise<void>;
```

`steps` is the full timeline oldest-first (the undo stack, then the redo
stack in chronological order); `cursor` marks the current point (`-1`
before the first step). `jumpTo` walks the stacks to the target, leaving
undo/redo consistent, and returns the whole-spec snapshot to apply
(`index = -1` returns the pre-first-step state). `jumpToHistory` applies
it through the engine, so one tap moves the table the way the desktop
Undo/Redo buttons do. `TourUi.render()` retries briefly when a step's
target isn't mounted yet, so a lazily-opened sheet (the mobile composer)
still gets its spotlight.

### Diagnostics log (#Diagnostics)

A bounded ring buffer of recent app events, persisted in the browser
under the localStorage key `tamedtable.diagnostics` and mirrored in
memory. It lives in the web package (`controller-diagnostics.ts`); the
controller composes a `DiagnosticsManager` alongside its other managers.

```ts
type DiagLevel = 'error' | 'warn' | 'info';

interface DiagEvent {
  ts: string;          // absolute ISO 8601 timestamp
  level: DiagLevel;
  message: string;     // short, already redacted
  context: Record<string, unknown>;  // structured, already redacted
}

// caps — evict oldest first when either is exceeded
const MAX_EVENTS = 20;
const MAX_BYTES = 64 * 1024;         // ~64 KB of serialized JSON
const MAX_BODY = 2048;               // request-body truncation, in chars

WebController.diagnosticsEvents(): DiagEvent[];   // newest last
WebController.diagnosticsReport(): string;        // markdown, newest first
WebController.copyDiagnosticsReport(): Promise<void>;     // → clipboard
WebController.bugReportUrl(): string;             // prefilled GitHub new-issue URL
WebController.sendBugReport(): Promise<void>;     // copy report + open the issue
WebController.clearDiagnostics(): void;
```

Pure helpers (unit-tested directly):

```ts
// strip api-key and auth-header shapes everywhere, drop *Key fields
function redactValue(value: unknown): unknown;
// last MAX_EVENTS that also fit MAX_BYTES, oldest dropped first
function evictEvents(events: DiagEvent[], maxEvents: number, maxBytes: number): DiagEvent[];
function buildReportMarkdown(version, configSnapshot, events): string;
```

Every localStorage access is guarded with `typeof localStorage !==
'undefined'` and wrapped in try/catch, so private-mode and headless/SSR
hosts fall back to the in-memory mirror and never throw.

Redaction is a hard contract, verified by an `@regression` scenario:

- string values matching `/sk-[A-Za-z0-9_-]+/` or `/AIza[A-Za-z0-9_-]+/`
  become `[redacted]`;
- object keys matching `authorization`, `x-api-key`, or any `*Key`
  (`anthropicKey`, `geminiKey`, `openaiKey`) are dropped whole;
- the config snapshot is taken with the `*Key` fields already omitted.

Three capture points wire into existing code, no logic duplicated: the
controller's `pushToast` path records every toast; `EngineManager`'s
fetch records a failed model request (method, URL, `fingerprint` from
`@tamedtable/cassette`, and the body truncated to `MAX_BODY`); the same
fetch records a tutorial replay miss with the active tour, scenario, and
missing fingerprint.

## One schema, richer sort keys, and Python export

→ [behavior.md — One schema, richer sort keys, and Python export](behavior.md#one-schema-richer-sort-keys-and-python-export)

### One TablePlan schema

`validateTablePlan` (over `TablePlanSchema`) is the only TablePlan validator.
`runCli execute` does not branch on `flow.version`: a `version` of `1`
or `2` both validate through `validateTablePlan`.

### Sorting by a SQL or AI key

`applySort` resolves each `sort.by[].key` by `Expr` shape, mirroring
`mutate`: a `string` reads the column; `{js}` compiles; `{sql}` evaluates
one scalar per row through the shared DuckDB connection
(`SELECT (<fragment>) AS r FROM t`, input order preserved); `{llm}`
evaluates one cell per row through the cell model. Multi-key sorts
evaluate each key's per-row values up front, then compare. SQL/LLM key
evaluation makes `applySort` async; the runner already `await`s every
transformation. When `sort.limit` is set, the ordered rows are sliced to
the first N.

The comparator is numeric-aware: when both key values coerce to a finite
number (`typeof v === 'number'`, or a non-empty string with a finite
`Number(v)`), they compare numerically; otherwise both compare with the
`<`/`>` operators as before. The check is per-pair, so a mixed column
still orders its numeric-looking values by magnitude.

### A formatter bug never fails a request

The `onPlanEdits` callback dispatch in `Runner.request` is wrapped in
`try/catch`. `diffPlans` and the callback can throw without aborting
the request — the edit line is dropped, the commit proceeds.

### Export a flow as a Python script (#PyExport)

```ts
interface HeadlessRunner {
  // …
  exportPython(): Promise<string>;   // one model call, returns the script text
}
```

`exportPython` builds a prompt from the current committed spec and
makes one `generateText` call with `PYTHON_EXPORT_PROMPT` as the system
message, returning the generated script as a string. It is recorded by
the cassette recorder like any other model call. The CLI `:save-py`
handler: validates the `.py` extension and the path; scans
`currentSpec().transformations` for any `{llm}` `Expr` and refuses if
one is present; otherwise calls `exportPython` and writes the result.
`:save-py` is REPL-only — no `tamedtable` subcommand.

## Model config

→ [spec/packages/model-config/behavior.md](../spec/packages/model-config/behavior.md)

```ts
type Provider = "anthropic" | "gemini" | "openai";

interface ModelDef { id: string; name: string; desc: string; provider: Provider; voiceInput: boolean; default?: boolean; secondaryDefault?: boolean; }

interface ResolvedConfig {
  provider: Provider;
  anthropicKey: string | null;
  geminiKey: string | null;
  openaiKey: string | null;
  model: string;      // primary — writes the spec patch (and carries voice)
  cellModel: string;  // secondary — fills per-row cells; always same-provider as model
}

interface StoragePort {
  read(): Partial<ResolvedConfig>;
  write(c: Partial<ResolvedConfig>): void;
  clear(): void;
}

const ALL_MODELS: readonly ModelDef[];  // imported from models.json — the catalogue's single source
function resolveConfig(env: Record<string, string | undefined>, stored: Partial<ResolvedConfig>): ResolvedConfig;
function defaultModel(provider: Provider): string;      // primary (patch-turn) default
function defaultCellModel(provider: Provider): string;  // secondary (per-row cell) default
function providerFor(modelId: string): Provider;
function acceptsTemperature(modelId: string): boolean;   // false for models that removed sampling params (Opus 4.8/4.7, Fable 5, Sonnet 5, GPT-5.4+/5.5) and unknown ids
function keyFor(config: ResolvedConfig): string | null;  // the key for config.provider (anthropicKey / geminiKey / openaiKey)
function readConfigFromEnv(): Record<string, string | undefined>;  // Node/Bun only — in env.ts; reads ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, TAMEDTABLE_MODEL, TAMEDTABLE_CELL_MODEL
```

```ts
// ModelChooser.tsx entry point — react is a peer dependency
type ModelRole = "primary" | "secondary";

interface ModelChooserProps {
  models: readonly ModelDef[];
  provider: Provider;
  primaryModel: string;
  secondaryModel: string;
  keys: Record<Provider, string>;
  expandedProvider: Provider | null;
  onProviderClick(p: Provider): void;
  onKeyChange(p: Provider, value: string): void;
  onSelectModel(role: ModelRole, modelId: string): void;
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

### Continuous voice

Hands-free mode adds a second injected port and a second chat-panel button
(`WaveButton`), sharing the same patch-turn path.

```ts
interface ContinuousVoiceHandlers {
  onSegment: (clip: Blob) => void | Promise<void>;  // one finished turn, WAV
  onSpeechStart?: () => void;
  onError?: (err: Error) => void;
}
interface ContinuousVoicePort {
  start(handlers: ContinuousVoiceHandlers): Promise<void>;
  stop(): void;
  setTuning?(tuning: Partial<VadTuning>): void;      // re-tune while running
}
```

`browserContinuousPort()` (separate `browser-vad` entry point, DOM + WASM
required) wraps `@ricky0123/vad-web` — the Silero VAD on ONNX in an
AudioWorklet. Its `onSpeechEnd` Float32 PCM is encoded to a 16 kHz WAV `Blob`
and handed to `onSegment`. `VadTuning` exposes the turn-detection knobs in
milliseconds (`redemptionMs` is the silence before a turn closes — the felt
delay; the browser wires Balanced ≈ 700 ms, snappier than the library's 1.4 s
default). The VAD model/wasm load from a pinned jsDelivr CDN by default (static
files, no backend); `baseAssetPath` / `onnxWASMBasePath` override to self-host.
Tests inject a stub `ContinuousVoicePort` that emits a committed clip, so a
continuous turn issues a request byte-identical to the mic's and replays the
same cassette.

`WebController` adds `continuousStatus: 'idle' | 'listening' | 'sending'`,
`continuousAvailable()` (same gate as the mic plus a wired port), and
`toggleContinuous()`. Toggling on calls `port.start`, routing each `onSegment`
clip through the same `sendAudioRequest` the mic uses — one patch turn per
spoken turn, table context and cost identical. A clip that lands while a turn is
still applying is dropped, so patch turns never overlap; toggling off calls
`port.stop`. `WebControllerOptions.continuousVoice` supplies the port; the
browser passes `browserContinuousPort({ redemptionMs: 700, minSpeechMs: 300 })`
in `main.tsx`.

`WebController` adds `voiceStatus: 'idle' | 'recording' | 'latched' | 'sending'`
and four methods: `startVoice()` begins recording (auto-stopping after 30 s),
`latchVoice()` switches a live press-and-hold recording to hands-free `latched`
(a quick tap; recording continues under the explicit cancel/send controls, and
it is a no-op unless currently `recording`), `stopVoice()` ends recording from
either `recording` or `latched` and delegates to `sendAudioRequest(audio, signal)`, which
builds a `VoiceContext` from `currentSpec()` and `selection` and runs the
ordinary `request` with the recorded bytes as the `audio` option — one patch
turn, no transcription call. It posts a `🎙 Voice request` placeholder user
bubble immediately; when `onTranscript` fires it rewrites that bubble (and, on
success, the undo-history label) to `🎙 <transcript>`. `sendAudioRequest` is the
shared patch-turn-with-audio path: the tutorial `play-audio` step calls it too,
so a voice tour issues a byte-identical request and replays its cassette
key-free. Request failures go through the same `fail()` path a
typed request uses — error toast plus an `Error: Voice input failed: …`
assistant message carrying the request's `RequestDebugInfo`. `cancelVoice()` discards the recording. The mic button is
gated on the selected model's `voiceInput` flag plus a key for the selected
provider. `browserVoicePort` re-encodes the MediaRecorder output to 16 kHz
mono PCM16 WAV before resolving, so the bytes work for Gemini (`inlineData`) —
the only provider wired for voice. The engine routes OpenAI models through the
Chat Completions API (`.chat(...)` on the AI SDK provider) for broad
compatibility.

Text and voice requests route through the selected provider:
`ensureHeadless` builds the engine with `config.model` / `config.cellModel`
and the active provider's key (see [§ Web UI](#web-ui-webui)). Only tutorial
replay overrides this, pinning the recorded provider's defaults.

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
  | { kind: 'play-audio';    filename: string }  // voice clip → real voice turn
  | { kind: 'display'                          }

export interface TourStep     { keyword: string; text: string; action: TourAction }
export interface TourScenario { name: string; tags: string[]; steps: TourStep[]; golden?: string; feature?: string }

export function parseTours(source: string): TourScenario[]
```

`parseTours` accepts a raw `.feature` file string and returns **every**
scenario (each with its `tags`) and its Background steps prepended; the consumer
filters by tag. Scenario Outlines are skipped. `display` steps (unclassified
verification/narration) are dropped from `steps`; a `golden-source` step is
lifted onto `scenario.golden` and likewise dropped. So a returned `steps` list
holds only `load-file`, `load-lookup`, `prefill-chat`, `show-golden`, and
`play-audio` (matched from `speak "<clip>"`).

`feature` is **not** set by `parseTours` — it sees only the source string. The
consumer that assembles tours stamps each one with its source filename
(`TutorialManager.loadTour`, after fetching the `.feature`), so a deep link can
match a tour on `(feature, name)`.

### TutorialSources (`@tamedtable/web`)

```ts
export interface TutorialManifestEntry {
  name: string;      // scenario name (clickable list / Dev dropdown)
  feature: string;   // source .feature file name — disambiguates a deep link
  tags: string[];    // e.g. ['@web', '@tour']
}

export interface TutorialSources {
  manifest: TutorialManifestEntry[];
  loadFeature(name: string): Promise<string>;     // raw .feature text
  loadFixture(name: string): Promise<string>;     // raw CSV/JSONL (input or golden)
  loadCassette(feature: string): Promise<string>; // raw cassette JSON, feature base name
  loadAudio(name: string): Promise<Uint8Array>;   // raw clip bytes for play-audio
}
```

Only the lightweight `manifest` ships in the JS bundle; the feature source,
fixtures, goldens, cassettes, and audio clips load lazily through the loaders.
In the browser (`main.tsx`) the loaders `fetch` same-origin under
`import.meta.env.BASE_URL` — `tutorials/<name>`, `samples/<name>` (CSV/JSONL
fixtures *and* `.m4a` voice clips), `cassettes/<feature>.json` — directories the
Vite `staticDirPlugin` copies into `dist/` at build and serves via dev
middleware (features and fixtures from `spec/test-cases/`, cassettes from
the root `cassettes/` dir). `loadAudio` fetches the clip's bytes
(`arrayBuffer`); the other loaders return text. In tests the loaders read the
same files with `readFileSync` (`loadAudio` returns the raw `Buffer` bytes). The `manifest` is frozen at
build time by `vite.config.ts` (parsing each `@tour`/`@web` feature into
`{ name, feature, tags }`) and exposed as the `__TT_TUTORIAL_MANIFEST__` define
global.

```ts
export interface WebControllerOptions {
  // ...
  tutorialSources?: TutorialSources;
}
```

### Key-free cassette replay

The fingerprint, on-tape entry shape, and replay lookup live in
`@tamedtable/cassette` (no Node imports — it loads in the browser; the hash goes
through Web Crypto, so its hex digest matches the `node:crypto` digest the
Cucumber recorder produced). `src/tests/cassette.ts` adds the Node-fs
record/replay file layer on top; the web shell imports `replayFetch` directly.

While `TutorialManager.isReplaying()` is true, `EngineManager.makeFetch` routes
every model call through `TutorialManager.replayFetch`, which loads the tour's
cassette (`loadCassette(feature)`, cached) and serves the recorded response or
throws on a miss. `ensureHeadless` pins the recording configuration during
replay — `defaultModel(provider)` / `defaultCellModel(provider)` and a
placeholder key — so the request fingerprints identically to the taped one; the
engine is rebuilt when replay mode flips. The provider comes from
`TutorialManager.replayProvider()`, which always returns `'gemini'` — every
committed cassette, voice tours included, records with the Gemini provider
defaults. `sendChat` skips its provider-key guard while
replaying. Because the patch turn embeds only `basename(spec.table)` and pins
the default model, a tour replays the cassette a `@headless`/`@cli`/`@web` run of
the same scenario already recorded — no separate tutorial recording is needed (a
voice tour reuses the cassette its `@web` voice scenario recorded).

A `play-audio` step is the voice analogue of `prefill-chat`:
`TutorialManager.executeTutorialStep` fetches the clip with `loadAudio`, plays it
in the browser (no-op where `Audio` is absent), then hands the bytes to
`VoiceManager.sendAudioRequest` — the same patch-turn-with-audio path the
microphone release uses — so the request fingerprints identically to the recorded
voice turn and replays key-free.

### Tutorial controller methods

| Method | Description |
|---|---|
| `openTutorial()` | Sets `tutorialOpen = true`. |
| `closeTutorial()` | Sets `tutorialOpen = false`; calls `cancelTutorial()`. |
| `tutorialScenarioNames(): string[]` | Names of `@tour` tours (flat list). |
| `tutorialGroups(): { title; names }[]` | `@tour` tours grouped by `@cat-…` tag into the seven marketing categories, in homepage order; empty categories dropped. Drives the panel's grouped list. |
| `devScenarioNames(): string[]` | Names of `@web` non-`@tour` scenarios (the Dev dropdown). |
| `selectTutorialScenario(name)` | Selects the manifest entry by name; resets step state (the tour loads lazily on play). |
| `async playTutorial()` | Loads the selected tour (fetch + parse), enters replay mode, closes the Tutorial panel, and highlights step 1 (does **not** execute it). |
| `async tutorialSettle()` | Awaits any in-flight prefill-chat request (test helper). |
| `async nextStep()` | Executes the **current** step (only if it hasn't run before — see execute-once below), then advances the step index. On the last step, executes it and enters the done state. The app's `TourUi` makes the last step terminal (`lastStepDescription`), so in the UI Next is disabled there and the done state is not reached; `nextStep` still supports it for the step-def loop. |
| `prevStep()` | Decrements step index; re-highlights the step but executes nothing. A subsequent `nextStep` over an already-run step skips its side effect. |
| `cancelTutorial()` | Clears step state and the active tour; if a tour was playing, resets the engine and returns to the empty state. |
| `finishTutorial()` | Cancels the active tour and opens the Tutorial panel chooser, regardless of how the tour was launched, so the user can pick another tutorial. Deep-link visitors arrive in a new tab (the homepage opens "Show me →" in a new tab) and close it to return to the homepage; the app does not navigate for them. |
| `isTutorialActive(): boolean` | True while a step is highlighted (indices 0 … N-1); false in the done state and when no tour is playing. |
| `isTutorialDone(): boolean` | True once all steps have been executed and the tour is awaiting the final Finish action. |
| `currentTutorialStepNumber(): number \| null` | 1-based step number, or `null` when inactive or done. |
| `tutorialStepCount(): number` | Total steps in the active tour. |
| `selectedTourName(): string` | Name of the currently selected tour. |
| `currentStepDetail()` | `{ keyword, text }` of the current step, or `null`. |
| `currentStepElementId(): string \| null` | DOM id to spotlight: `tutorial-open-btn` (load), `tutorial-chat-input` (prefill-chat), `tutorial-speak` (play-audio), or `tutorial-table-view` (show-golden / display). |
| `async openTutorialFromLink(feature, scenario): Promise<boolean>` | Deep link. When both args are non-empty and a tour matches by `(feature, name)`: plays from step 1 (Tutorial panel stays closed), returns `true`. A missing/empty arg or no match leaves the panel closed and returns `false`. |

`main.tsx` calls `openTutorialFromLink` once at app start, passing
`new URLSearchParams(window.location.search).get('feature' / 'scenario')`
(each `string | null`). The URL is read in `main.tsx`, not the controller.

**Prefill on highlight.** When a `prefill-chat` step becomes the current step
(on play and on every `nextStep`/`prevStep`), the controller sets
`tutorialPrefill` to the step's query text so the chat input shows it; any other
current step clears it (`''`). The `TutorialPanel` passes the tour name to
`TourUi` as `lastStepDescription: Voilà, "<name>" is done.`, making the final
step a terminal celebration (see
[gherkin-tour behavior — Terminal last step](packages/gherkin-tour/behavior.md#terminal-last-step-laststepdescription)).

**Execute once.** `TutorialManager` tracks `executedThrough` (highest executed
step index, `-1` before play; reset on play/select/cancel). `nextStep` runs a
step's side effect only when `tutorialStepIndex > executedThrough`, so stepping
Prev then Next re-highlights a step without re-loading its file or re-sending its
query — a re-sent request would miss the replay cassette.
