# TamedTable behavior

What the user sees and what the system does. No types, no method names, no
library names, no env-var names — those live in [code-contract.md](code-contract.md),
section by matching section.

## Data model

TamedTable separates the *spec* (what the table should look like) from the
*data* (the rows themselves). The spec is a small JSON document; the data is
large and never reaches the LLM. Each user turn produces a *patch* — a JSON
Patch (RFC 6902) for array ops, a JSON Merge Patch (RFC 7396) for shallow
edits — that the runtime applies, validates, and replays against the
immutable source rows.

The spec carries an ordered list of *transformations* that mutate data before
view ops (filter, sort, page, summary) run. Four transformation kinds in V1:

- **filter** — keep rows where a predicate is truthy. <!-- #FilterRows -->
- **mutate** — set one or more columns from a value expression. <!-- #DataNorm -->
- **select** — keep only these columns. <!-- #ColSelect -->
- **sort** — by one or more keys, ascending or descending. <!-- #SortRows -->

Each carries an *expression*: either deterministic (a JS arrow-function body,
signature `(row, index, allRows)`) or LLM-backed (a prompt template with
`{Column}` placeholders evaluated per row).

A new request is *additive*: it appends; nothing prior is removed or replaced
unless the user explicitly says undo or replace. "Undo" pops the last
applied patch — reversing every transformation and column change the most
recent user turn introduced, as a single unit — and replays the rest
against the source. No LLM call.

Per-turn token budget stays constant regardless of table size or conversation
length: cached system prompt (~600 tokens) + current spec (~300) + user
message (~30) + last error if any (~50). No rolling chat history; each
request is a fresh turn. That is what makes TamedTable scale to millions of
rows.

The renderer receives `(spec, row_stream)`: the spec drives column layout,
formatters, and header order; rows stream in. The renderer is an
implementation detail — the spec is the wire protocol.

→ [code-contract.md — Data model](code-contract.md#data-model)

## Core / runner

The runner holds the spec, runs the transformations against the source rows,
and commits new state only when a request finishes cleanly.

```
fresh ── load input ─▶ loaded ─┬─ request ───▶ loaded (committed)
                               ├─ export ────▶ loaded (unchanged)
                               └─ cancel ────▶ loaded (changes undone)
```

A fresh runner has nothing loaded; reading rows or spec throws until input is
loaded. Once loaded, the runner handles one request at a time — a second
request while one is running throws.

On a successful request the runner:

1. Applies the LLM's patch to the current spec.
2. Validates the new spec.
3. Re-runs the transformations against the source.
4. Commits — the new spec and rows become visible.

If any step throws, the patch rolls back and the error goes to the LLM as the
next turn's input, up to a 3-turn recovery budget. The call either succeeds
or throws; the spec is never left halfway between two states.

Loading the same input twice resets the transformations, filter/sort, and
any cached LLM cell results. Replaying a saved spec (the path the batch CLI
takes) validates and runs against the source without any LLM call.

The runner caches the result of replaying. When a new spec adds to the tail
of the previous list (the prefix is unchanged), the runner reuses the cached
derived rows and runs only the new tail.

CSV or JSONL in, JSONL out. Every CSV value stays a string — the runtime
doesn't guess whether something is a number or a date; type inference is
the LLM's job via a `mutate` transformation. Leading and trailing
whitespace around each unquoted CSV field is trimmed before the value
becomes the cell string; quoted fields are preserved verbatim, including
whitespace inside the quotes. JSONL inputs keep their native JSON types.

→ [code-contract.md — Core / runner](code-contract.md#core--runner)

## Headless

Headless turns natural-language requests into spec patches, runs the
transformations, and lets the caller watch progress chunk by chunk and
cancel. It doesn't print to a terminal or own any I/O beyond what the runner
needs.

The LLM only changes the spec through one tool — call it the *patch tool* —
that takes a list of RFC 6902 operations. The harness rejects two LLM
mistakes inline and feeds them back through the recovery loop:

- an empty operations list;
- a patch that applies cleanly but leaves the spec identical to before.

<!-- #LLMCells -->
LLM-backed transformations evaluate a prompt template per row. The runtime:

- Renders each row's prompt by substituting `{Column}` placeholders. A
  placeholder that doesn't match any column is an error and feeds back
  through the recovery loop. The special placeholder `{*}` expands to a
  compact JSON object of the row's columns — excluding the target column
  when the template is a `mutate` value, all columns included in any other
  position. Use `{*}` when the cell value alone may be ambiguous and a
  same-row column could disambiguate (locale-dependent dates, units,
  addresses). Templates that use `{*}` lose cross-row cache reuse within a
  table — each row's rendered prompt embeds different sibling values — so
  reserve it for cases where context actually matters.
- Packs several rendered prompts into one batch request (default 20 rows per
  batch). The model replies with a JSON array of strings or nulls in input
  order. If the reply isn't a JSON array of the expected length, the
  dispatcher falls back to per-row calls for that batch.
- Runs several batches concurrently (default 5 in flight).
- Caches results keyed by `(model, rendered prompt)` so duplicate inputs
  cost nothing after the first.
- Trims each cell reply; an empty reply or the literal lowercased word
  `null` becomes a JSON null.

While an LLM transformation runs, each completed chunk fires a progress
callback with the rows it just produced. The committed spec and rows don't
change until the whole transformation finishes — the callback is how
progress reaches the CLI and the web UI.

<!-- #DebugOut -->
Once per request — on success and on failure — headless reports a debug
summary: the patch attempt of each recovery turn, the primary
expression of each transformation a successful request appended, the
model calls made, the input and output token totals, and the elapsed
time. The CLI renders this into its debug block; other callers may
ignore it.

<!-- #CancelOp -->
Cancellation is a four-step sequence:

1. Stop sending new chunks, within 2 seconds.
2. Wait for in-flight chunks to come back.
3. Remove the half-applied transformation.
4. Signal cancelled.

Anything committed before the cancel stays put.

Temperature is pinned to 0 on every model call, but outputs are not byte-
identical across model versions or providers. Tests that compare LLM-produced
cells against a frozen golden file are testing one specific `(model,
version, prompt)` triple, not the transformation contract.

<!-- #Cassettes -->
A caller can hand headless its own way of making the model's network
calls; with none supplied, headless talks straight to the service. The
test suite uses this to **replay recorded model responses**: each
response is saved to disk once, keyed by a fingerprint of the request,
then read back on later runs instead of calling the service. The
recordings are committed, so the suite replays in seconds — no API key,
no rate-limit wait — and that is how it runs by default.

Three settings decide what happens. **Replay**, the default, serves
every response from disk and fails loudly on any request it has no
recording for — it never silently falls back to the network. **Record**
calls the real service and saves each response, refreshing the
recordings. **Off** ignores the recordings and calls the real service,
the way every run worked before.

The fingerprint covers the request's method, address, and full body, so
a changed prompt can never match an old recording: a stale reply is
impossible; a changed prompt is simply a miss to re-record. Recordings
are committed to git, so a fresh checkout replays the whole suite
without a key.

→ [code-contract.md — Headless](code-contract.md#headless)

## CLI

The CLI is two things on top of headless: an interactive REPL where the user
types natural-language requests, and a `tamedtable execute <flow>` subcommand
that re-runs a saved spec against a CSV.

### REPL (#ReplCmds)

The REPL prints a fresh ASCII table after every event that changes either
the underlying table state or the viewport: a successful natural-language
request, `:load`, `:undo`, `:redo`, `:show`, `:reorder`, and `:find` when
a match is found. REPL commands that don't change either (`:help`, `:save`,
`:save-flow`, `:save-py`, `:history`, `:schema`, `:exit`, and `:find`
with no match) print only their own output. A failed request prints the
error and does not reprint the table.

After every natural-language request the REPL prints a compact debug
block, on by default and disableable. It is indented, dimmed, every
line prefixed `[debug]`, and capped at twenty lines. On a successful
request it prints just before the reprinted table; on a failed request
just after the error line. `:` commands and `tamedtable execute` make
no model call and print no debug block.

A successful request's block lists the primary expression of each
transformation it appended — the predicate of a filter or validate, the
value of a mutate, and so on — shown exactly as it will be evaluated.
Secondary fields, such as a validate `message`, are not shown. A failed
request's block instead lists the patch attempt of each recovery turn
and the error fed back into the next.

Either way the block's last line summarises the request: the model
calls it made — each distinct model as `<name> ×<count>`, always in
that form even for a single call — then the total input and output
tokens and the wall-clock time. For `validate dob is non-empty`:

```
    [debug] pred: row.DOB && String(row.DOB).length > 0
    [debug] Sonnet 4.6 ×1 · 2,118 tokens (2,029 in / 89 out) · 1.9s
```

A request that also fills LLM-backed cells calls a second model, so the
summary names both:

```
    [debug] Sonnet 4.6 ×1, Sonnet 4.5 ×2 · 26,540 tokens (25,690 in / 850 out) · 9.7s
```

The token counts and elapsed time vary from run to run; the rest of the
block is determined by the spec.

The REPL runs in one of two modes, chosen automatically from whether stdin
is a TTY:

- **Interactive mode** (stdin is a TTY — the user runs `tamedtable` in a
  terminal). The line editor is in cooked terminal mode: ↑/↓ cycle
  through command history within the session, ←/→ move the cursor inside
  the current line, ⌃A/⌃E jump to line start/end, ⌃U clears the line,
  ⌃R reverse-searches history. The session's input lines accumulate into
  an in-memory history that is *not* persisted across REPL invocations
  in V1.
- **Batch mode** (stdin is not a TTY — piped from a file or from the
  Gherkin step harness). The line editor is off: every byte that arrives
  is interpreted as part of an input line, escape sequences pass through
  unchanged, no history navigation. Output is byte-identical to what
  interactive mode produces for the same sequence of committed input
  lines, so test fixtures and recorded transcripts stay deterministic.

The mode is detected once at REPL start; it never switches mid-session.
Page-size autodetect (described below) follows the same TTY check on
stdout — interactive runs auto-fit to the terminal, batch runs use the
deterministic 10 × 5 fallback.

The REPL holds a viewport cursor `(rowOffset, colOffset)` over the
rows-and-columns rectangle, plus a viewport *page size* `(pageRows,
pageCols)` that bounds how many rows and columns appear on one page.
On startup and on every terminal-resize event, the REPL auto-fits the
page size to the host terminal: `pageRows` fills the visible height
after reserving a few lines for chrome (header, separator, truncation
markers, prompt); `pageCols` is the greedy fit, walking columns in
display order and packing them by rendered width until the next one
would overflow the terminal width. When the terminal size is
unavailable — typically when stdout is piped, not a TTY — the page
size falls back to **10 rows × 5 cols**, keeping non-interactive runs
deterministic. The user can pin either axis to a manual value with
`:viewport`; a pinned axis survives terminal resize until cleared with
`auto`. Both viewport cursors reset to `(0, 0)` after `:load`, a
successful NL request, `:undo`, or `:redo`; viewport pins do **not**
reset on those events — they persist until `:viewport auto` or REPL
exit. `:show` moves the cursor explicitly; `:find` snaps it to the
first match. When rows fall outside the current page, the truncated
edge renders a marker row `...{N} more rows.` — above when rows are
hidden above the page, below when hidden below. Columns hidden to the
left or right render a symmetric marker column `...{N} more cols.` at
the edge. No terminal control codes — think `sqlite3` or `jq`, not
`vim`. Long LLM transformations print a few sample row changes per
chunk while they run.

REPL commands use a `:` prefix (chosen over `/` because `/` is intercepted
by Claude Code and other CLI agents; `:` passes through to the runtime).
They are handled locally without any LLM round-trip:

- `:help` prints the usage screen — the verbatim text below this bullet
  list — inline.
- `:undo` pops the last applied patch — reversing every transformation
  and column change the most recent user turn introduced, as a single
  unit — and pushes it onto the redo stack. On an empty history, prints
  `nothing to undo.`
- `:redo` replays the last patch popped by `:undo` and removes it from
  the redo stack. On an empty redo stack, prints `nothing to redo.` Any
  new NL request clears the redo stack.
- `:history` prints the patch journal one line per user turn, oldest
  first: `<index>. <user request>  [committed|undone]`. Does not change
  state and does not reprint the table.
- `:schema` prints the current column list (id, optional label, optional
  format), one column per line. Does not change state and does not
  reprint the table.
- `:show [<axis> <pos>]` moves the viewport cursor by one page on the
  named axis. `<axis>` is `rows` or `cols`; `<pos>` is `start`, `prev`,
  `next`, `end`, or a positive integer (1-based row or column index;
  the viewport snaps to the page containing that index). Out-of-range
  positions clamp to the nearest edge. Bare `:show` simply reprints
  the current viewport. Never changes spec or rows; not recorded in
  the undo journal.
- `:viewport [<rows>|auto] [<cols>|auto]` sets the viewport page size
  on each axis. Each slot is independent: a positive integer pins that
  axis to a manual value (sticky across terminal resize and across
  `:load`/`:undo`/`:redo`/NL requests); the keyword `auto` clears any
  prior pin on that axis and resumes terminal-derived sizing. A single
  `auto` argument is shorthand for `auto auto`. With no arguments,
  prints one line — `viewport: <R> rows (<source>) × <C> cols
  (<source>)` where each `<source>` is `auto` or `manual` — and does
  not reprint the table. Any size change reprints the table at the new
  page size; if the resulting page is smaller than the cursor's
  position, the cursor clamps to the last valid page on that axis.
  Non-positive integers print `:viewport: invalid size`; anything else
  prints `:viewport: usage: :viewport [<rows>|auto] [<cols>|auto]`.
  Not recorded in the undo journal.
- `:find /<regex>/` or `:find <substring>` searches all string cells
  (case-insensitive). Slash-delimited input is a regex; anything else
  is a literal substring. On match, the viewport snaps to the row
  containing the first match (and the column containing it if it's
  outside the current column page), and the reprint wraps each matched
  substring in that view with asterisks (`*USA*`). The highlight clears
  on the next viewport- or state-changing event. No match prints
  `no match` and does not reprint. Missing pattern prints
  `:find: missing pattern`. Not recorded in the undo journal.
- `:load <path>` reads a CSV or JSONL file as the new input source (file
  type inferred from extension; only `.csv` and `.jsonl` accepted in V1;
  `<path>` is taken literally — a leading `@` is part of the filename,
  not a Claude-Code-style file reference). Resets transformations,
  filter/sort, and cached LLM cell results just like loading at startup.
  Missing path prints `:load: missing path`; unknown extension prints
  `:load: unknown file type`; success prints
  `Loaded <path> (N rows, M cols)` (no column names) followed by the
  table.
- `:save <path>` writes current rows to a JSONL file (path resolved relative
  to the working directory; only `.jsonl` accepted in V1). Missing path
  prints `:save: missing path`; success prints a `saved` confirmation.
- `:save-flow <path>` writes the current spec as a replayable JSON document
  (the source path inside the flow is recorded relative to the flow file's
  own directory). Missing path prints `:save-flow: missing path`; success
  prints `saved flow`.
- `:save-py <path>` writes the current flow as a standalone Python 3
  script (see [§ V2.5](#v25)). Makes one model call to translate the
  transformations into Python; refuses a flow that contains any `{llm}`
  cell. Missing path prints `:save-py: missing path`; a non-`.py`
  extension prints `:save-py: output must be a .py file`; a flow with an
  `{llm}` cell prints `:save-py: flow contains LLM cells; cannot export
  to Python`; success prints `saved Python script`.
- `:reorder <cols>` reorders the column list — `<cols>` is a comma- or
  space-separated list of column names. The named columns move to the
  front in that order; columns not named keep their relative order
  after them. The new order drives the table view and the column order
  of a saved CSV or JSONL file, so column order needs no spec field. A
  missing list prints `:reorder: missing column list`; an unknown column
  prints `:reorder: unknown column "<name>"`; success reprints the
  table. Not recorded in the undo journal.
- `:exit` and bare `exit` both close the REPL with exit code 0.

The `:help` usage screen, verbatim:

```
TamedTable — interactive table editor. Natural-language requests edit the
spec; results stream in. The table reprints after any state or viewport
change.

State / data commands:
  :load <path>       Load CSV/JSONL as new input. Resets transformations,
                     viewport, cache.
  :save <path>       Write current rows to JSONL.
  :save-flow <path>  Write current spec as a .flow file.
  :save-py <path>    Write current flow as a standalone Python script.
  :reorder <cols>    Reorder columns (comma/space separated); sets the table
                     view and CSV/JSONL output column order.
  :undo              Pop the last applied patch.
  :redo              Replay the last :undo'd patch.
  :history           Print the patch journal.

View / navigation:
  :show [rows|cols start|prev|next|end|{N}]
                     Move viewport on the named axis, or jump to row/col N.
                     Bare :show reprints the current viewport.
  :viewport [<R>|auto] [<C>|auto]
                     Pin viewport page size; auto re-fits to terminal.
                     Bare :viewport prints current size and source.
  :find {<substring>|/<regex>/}
                     Case-insensitive search; viewport snaps to the first
                     match and the reprint wraps it in *asterisks*.

Inspection / session:
  :schema            Print the current column list.
  :help              Show this usage screen.
  :exit              Quit (also: bare "exit").

Anything not starting with ":" is sent to the spec editor as a natural-
language request — e.g. "normalize phone numbers", "sort by DOB desc".
Requests are additive; use :undo to revert the last one.

Ctrl-C: cancel in-flight request, or quit when idle. Requires
ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in env.
```

Ctrl-C while a request runs cancels it and rolls back the half-applied
transformation. Ctrl-C while idle closes the REPL.

### Batch (`execute`) (#BatchExec)

`tamedtable execute <flow>` replays a saved flow against a CSV. `--input`
overrides the source path recorded in the flow; `--output` is required and
must be `.jsonl`. No LLM call happens on this path.

### Discovery (#CliFlags)

The CLI exposes two help screens. They cover disjoint surface:

- `tamedtable --help` / `-h` / bare `help` print the *CLI usage screen*
  below — binary invocations only: the bare-input REPL launch, the
  `execute` batch form with its flags, the discovery flags themselves,
  and the API-key requirement. It does NOT list the REPL's `:`
  commands.
- `:help` inside the REPL prints the *REPL usage screen* above —
  every `:` command, the natural-language request convention, and the
  Ctrl-C behavior. It does NOT mention `execute`, `--input`, or
  `--output`.

A reader who types `--help` is asking "how do I run this binary";
a reader who types `:help` is asking "what can I type now that I'm
inside." Keeping the two screens disjoint matches the question each
one answers.

The CLI usage screen, verbatim:

```
tamedtable — work tables in your terminal with natural-language requests.

Usage:
  tamedtable <input>                 Open <input> in the interactive REPL.
                                     <input> is a .csv or .jsonl file.
                                     Once inside, type :help for commands.
  tamedtable execute <flow>          Replay a saved .flow against an input.
                                     No LLM call; no API key needed.
    --input  <file>                  Source .csv or .jsonl. Overrides the
                                     source path recorded in <flow>.
    --output <file>                  Destination .jsonl. Required.
  tamedtable --help, -h, help        Show this usage screen.

The REPL needs ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in env.
```

Provider and model resolution uses `@tamedtable/model-config`; see
[spec/packages/model-config/behavior.md](packages/model-config/behavior.md).

Other invocations:

- No arguments prints a hint about `--help` and fails.
- An unknown flag fails with a pointer to `--help`.

Exit-code numbers and their meanings live in
[code-contract.md — CLI](code-contract.md#cli).

→ [code-contract.md — CLI](code-contract.md#cli)

## System prompts

The three LLM prompts — the *patch* prompt for the spec-editor turn, the
*batch* prompt for multi-row cell evaluation, and the *cell format
constraint* every `{llm:…}` cell prompt must end with — live in
[prompt-app-edit.md](prompt-app-edit.md). That file is the source of truth;
the runtime loads it at module init.

<!-- #Dedupe -->
The patch prompt teaches the LLM the additive rule, the choice between
`{js}` (structural rules) and `{llm}` (semantic understanding), the
patchable paths (`/transformations/-` for append; `/columns` for add/remove/
reorder, with a two-op pattern for "add column X with computed value Y"),
the four-verb transformation grammar, the two expression shapes, and five
few-shot examples covering filter, three normalizers, and dedupe.

The batch prompt tells the cell model to apply each task's instructions to
its own content and return a JSON array of strings or nulls, one per task,
in input order.

The cell format constraint is the trailing instruction every `{llm:…}` cell
prompt must end with: reply with only the result, or the literal word
`null` if the input can't be processed.

→ [code-contract.md — System prompts](code-contract.md#system-prompts)

## V2

V2 keeps the V1 spec-and-patches wire model and adds four surfaces on top:
two new transformation verbs, a SQL expression shape, CSV (and other
tabular) output, and a browser front-end. The behavior contract for undo,
cancellation, recovery, and the streaming chunk callback is unchanged —
each new surface plugs into existing seams rather than replacing them.

V1 ships only the terminal CLI and the headless library. When asked about
V2 UX, WoZ produces a Claude artifact or writes a sketch to `temp/`, not
refuses.

### CSV (and other tabular) output (#FormatOut)

V1 writes JSONL only. V2 lifts that restriction: `:save <path>` and
`tamedtable execute --output <path>` both dispatch on extension, the
same way `:load` already does for input. V2 accepts `.csv` alongside
`.jsonl`; further formats (`.xlsx`, `.parquet`) land on the same
dispatch and are out of scope until their own scenarios are written.

CSV output rules: the header row is the spec's column order (using
`label` when set, otherwise `id`); JSON nulls and JS undefined render
as an empty cell; non-string scalars stringify with `String(value)`;
nested objects and arrays serialize as compact JSON inside the cell;
fields containing commas, quotes, or newlines are wrapped in
double-quotes with embedded quotes doubled (RFC 4180). The writer
never invents quoting or escaping beyond what RFC 4180 requires.

Unknown output extensions print `:save: unknown file type` (REPL) or
exit non-zero with the same line on stderr (batch). Mixed-format flows
— JSONL in, CSV out — work because the renderer reads the committed
spec, not the source format.

### `group` transformation (#Aggregate)

`group` collapses input rows into one output row per distinct
`by`-value tuple. Shape: `{ kind: "group", by: [<expr|column>...],
agg: { <outColumn>: <expr> } }`. The by-keys and the aggregate output
columns *replace* the prior column list — only those columns survive
into the rows downstream. Aggregate expressions evaluate over the
group's row slice (an array of rows accessible to the expression as
the bound name described in code-contract); typical uses are `count`,
`sum`, `avg`, `min`, `max`, and `{llm:…}` summaries.

An empty `by` list collapses the whole table into a single output
row — the natural shape for a grand total, such as summing one column
across every row.

Empty input produces zero output rows. A by-expression that throws on
some row aborts the transformation through the same recovery loop a
filter or mutate uses. Sort order of output rows is the first-seen
order of each group's by-tuple in the input.

### `join` transformation (#LookupJoin)

`join` enriches the left (current) table with rows from a second
source. Shape: `{ kind: "join", with: <path>, on: <expr>, how?:
"inner" | "left" }`. `with` is a path to a `.csv` or `.jsonl` file,
resolved relative to the spec's working directory; the right table is
loaded once at transformation-evaluation time and held for the join.
`on` is a predicate expression evaluated for each `(leftRow,
rightRow)` pair; truthy means match. Default `how` is `"left"` — left
rows survive even without a right match, with right-side columns set
to `null`. `"inner"` drops left rows that have no match.

When right and left columns collide, the right column is renamed
`<name>_2` (then `_3`, etc.) so no column silently overwrites
another. The right file is read with the same dispatch as `:load`
(unknown extension throws the V1 *"unknown file type"* error). A
join's right table is *not* re-read on `:undo`/`:redo`; the
transformation removal reverses the column-shape change and that's
enough.

### `split` transformation (#ColSplit)

`split` takes one input column, splits each cell, and writes the parts
to several output columns. Shape: `{ kind: "split", from: <column>,
into: [<col1>, <col2>, ...], on: <separator> | <regex> | <Expr> }`.
`on` is either a literal string (the cell is split on every occurrence),
a regex (matches define the split points), or a full `Expr` returning
an array of parts. The number of parts must match `into.length`; cells
that produce too few parts pad the tail with `null`, cells that produce
too many concatenate the extras onto the last output column joined by
a single space.

The input column stays in place unless `drop: true` is set on the
transformation, in which case `from` is removed after the split. Empty
input cells produce `null` in every output column.

This is ergonomically what V1 `mutate` with `columns: string[]` and a
JS array-returning body already does; V2's `split` exists so the LLM
can patch the structure without writing JS, and so regex/delimiter
splits don't need an expression at all.

### `validate` transformation (#Validate)

`validate` checks each row against a per-row predicate and optionally
the dataset against a rate threshold. Shape: `{ kind: "validate",
pred: <Expr>, message?: <Expr>, threshold?: <number 0..1> }`. The
predicate is evaluated per row; truthy means "row passes." The
transformation adds two columns to every row: `_valid` (boolean) and
`_validation` (the rendered `message` for failing rows, otherwise
`null`). The column list is otherwise unchanged.

When `threshold` is set, the transformation also computes the failure
rate over the whole row stream. If `failures / total > threshold`, the
transformation aborts the whole request through the recovery loop with
the error `validation failed: <rate>% > <threshold>%`. Without
`threshold`, validation is purely additive: rows are annotated, never
dropped — the user follows up with a `filter` if they want to drop the
bad rows.

The `_valid` and `_validation` columns persist across subsequent
transformations the way any other column does; a second `validate`
appended to the same spec overwrites them.

### `pivot` and `unpivot` transformations (#PivotData)

`pivot` reshapes long → wide. Shape: `{ kind: "pivot", index:
[<col>...], on: <col>, values: <col>, agg?: "sum" | "count" | "avg" |
"min" | "max" | "first" }`. Output rows are keyed by the `index`
tuple; the distinct values in `on` become new columns, each filled
with the corresponding `values` cell aggregated by `agg` (default
`first`). Missing combinations render as `null`. The column list
shrinks from `index + on + values + everything else` down to `index +
<one column per distinct on-value>` — non-index, non-on, non-values
columns are dropped.

`unpivot` reshapes wide → long. Shape: `{ kind: "unpivot", id:
[<col>...], measures: [<col>...], names_to?: <string>, values_to?:
<string> }`. Each measure column becomes one output row per input
row, identified by the column's name. Defaults: `names_to = "name"`,
`values_to = "value"`. The output column list is `id + [names_to,
values_to]`.

Both transformations fail fast on a zero-row group (empty input) by
producing zero output rows.

### `{sql}` expression shape (#SqlExpr)

A third `Expr` variant: `{ sql: "<DuckDB SQL fragment>" }`. The
runtime evaluates SQL on top of an in-process DuckDB instance, with
the current table registered as a relation named `t`. A
`{sql:"…"}` inside a `mutate` value is a scalar subquery returning
one value per row; inside `filter.pred` it is a boolean predicate;
inside `sort.by[].key` a scalar sort key; inside `group.agg` an
aggregate expression. `{sql}` does not appear inside `{llm}` or
`{js}` and vice versa — each transformation slot takes exactly one
expression shape.

Parse failures, type mismatches, and runtime SQL errors flow through
the patch-recovery loop the same as JS expression failures. The
DuckDB instance is per-process and shared across transformations; it
is reset whenever the source rows are reloaded.

A running SQL query is one operation, not a stream of chunks, so the
V1 cancellation sequence ([§ Headless](#headless)) gets one extra
move: step 1 calls `conn.interrupt()` to ask DuckDB to abort. The
query rejects with a *"cancelled"* error within the same 2-second
budget; steps 2–4 (drain, remove the half-applied transformation,
signal cancelled) run unchanged. If DuckDB has already returned its
result rows and the runtime is still applying them when the cancel
arrives, the post-query apply phase is interrupted between rows the
same way an LLM chunk apply is. Cancelling a SQL transformation
leaves the DuckDB relation `t` registered and intact — only the
half-applied spec change reverts.

### Web UI (#WebUI)

V2 ships a browser front-end that mirrors the CLI's interaction shape
— a chat sidebar for natural-language requests and the table view to
the right of it. Cell editing, scrolling, column-resize, and
column-reorder happen through normal browser gestures but ultimately
produce spec patches — the same shape the LLM produces — so undo/redo,
history, and replay against the source all work unchanged.

A table can be loaded from three sources: a local file, a remote
`.csv`/`.jsonl` URL, or one of the bundled sample files. The toolbar
offers one **Open URL or sample…** split-button: the primary click
opens the URL dialog (which also lists the bundled samples — picking
one fills the URL field), and the small dropdown reveals **Open
local…**, which raises the native file picker. The empty-state card
shown before any file is loaded mirrors that same split-button, so the
two surfaces stay in sync. The split-button is rendered as a single
control — one rounded shell, one shared hover tint, no internal
divider between the label and the dropdown chevron — so it reads as
one toolbar item rather than two adjacent menu entries. `.flow` save
uses a Save File dialog as before.

A URL load is a plain `GET` against the entered address; the format is
detected from the path extension first and from the `Content-Type`
header as a fallback. Only `http://` and `https://` URLs are accepted;
`http://` shows a soft "unencrypted" hint but is not refused. Network
or CORS failures, non-2xx responses, and unrecognized formats surface
as inline errors inside the dialog, which stays open so the user can
correct the URL — the dialog does not produce a toast for these.
Bundled sample files live under the deployed site's `samples/`
directory; their list is frozen at build time by the Vite config and
surfaced inside the URL dialog as a one-click "fill the field" list.

The web shell uses the existing `Runner` interface unmodified.
Streaming chunks fire the same callback; the front-end debounces
them into table updates. A web session does not share state with a
CLI session; the file dialog handshake takes the place of `:load`,
and the in-browser tab IS the session.

The table view paginates. Rows display one fixed-size page at a time —
twenty rows — with a pager that jumps to the first, previous, next,
last, or a numbered page. Paging is a view concern, like the CLI's
viewport: it never touches the spec, so it survives requests, undo, and
redo. Loading a file opens page one; a request that shortens the table
clamps the current page back into range.

A status footer under the table reports the current selection and what
the engine is doing. Clicking a cell selects it, and the footer names
it `R<row> · <column>`. The footer also shows whether the app is idle,
running a request, or has just saved — a save reads as saved until the
next edit, request, or load returns it to idle.

The settings panel shows three provider accordion cards stacked vertically:
Google, OpenAI, Anthropic. On open, no card is expanded. Clicking a collapsed
card expands it and selects that provider; clicking an already-open card
collapses it without changing the provider. Opening a card collapses any other
open card. The currently selected provider's card opens by default when the
panel mounts.

Each card header (always visible, clickable) shows a radio knob, the provider
name and tagline, and a voice badge on the right edge. The voice badge is green
with a microphone icon when the provider supports voice input, or grey "No voice
input" when it does not. Google shows the green badge; OpenAI and Anthropic show
grey.

Text requests route through Anthropic regardless of the selected provider — in
this version Google is wired only for voice input, not text, and OpenAI is not
wired for chat at all (its key can still be entered for use elsewhere). A
natural-language chat request therefore needs an Anthropic API key: when none is
set the request never fires and a toast reads `Text requests require an Anthropic
API key — open Settings and add one.` So the requirement reads clearly even while
Google or OpenAI is the selected provider, the Anthropic card's tagline notes it
is required for text requests.

When a card is open its body shows an API key field with a show/hide toggle, a
grey monospace env-var hint beneath the key field (`or set GEMINI_API_KEY in
.env`, `or set OPENAI_API_KEY in .env`, `or set ANTHROPIC_API_KEY in .env`
respectively), and that provider's models as a two-column primary/secondary
radio matrix: the **Primary** column picks the patch-turn model (and the one
that carries voice input), the **Secondary** column picks the per-row cell
model. A single generic explainer of the two roles sits above the cards. A model
row carries a green "🎙 voice" tag only when it supports voice.

Changes apply immediately — selecting a provider card calls
`controller.setConfig({ provider })`, and picking a Primary or Secondary model
calls `controller.setConfig({ model })` or `controller.setConfig({ cellModel })`
respectively. The footer has only a "Close" button; there
is no separate "Save" button. Changing a model rebuilds the engine and replays
the current transformations against the source, so the table on screen is
preserved and the new model drives the next request. Full detail in
[spec/packages/model-config/behavior.md](packages/model-config/behavior.md).

When a request fails because the API key is wrong or missing, the web shell
surfaces a toast with a sentence the user can act on: "Invalid API key. Open
Settings to update your Gemini key." (or OpenAI / Anthropic). A model-not-found
error reads "Model not found. The selected model may be unavailable." A network
or CORS failure reads "Network error. Could not reach the Gemini API." Errors
that don't match a known pattern pass through as-is so no information is lost.
The provider name in the message matches whichever provider card is selected.

Toolbar action buttons carry tooltips that name their CLI command
equivalent: Undo shows `Undo (:undo)`, Redo shows `Redo (:redo)`, the
CSV save shows `Save the current rows (:save)`, and the flow save shows
`Save the flow as a replayable .flow file (:save-flow)`.

A `?` button in the Requests sidebar header opens a discoverability
popover listing four keyboard and gesture hints: double-click to edit a
cell, drag a column header to reorder, `:undo` / `:redo` in the chat,
and `:save` / `:save-flow` to export. Hovering over the button opens the
popover; moving the cursor away closes it; clicking toggles it.

After a successful request, the assistant chat bubble shows the
transformed expressions — up to 7 lines with bodies truncated to 240
characters each; overflow renders as `… and N more`. Model, token, and
elapsed-time stats are not shown in the bubble; they appear only in the
expandable detail panel.

Clicking **request detail** below an assistant message expands an
inline panel with three sections. A small copy icon to the right of the
toggle copies the panel's full text to the clipboard (it turns green
briefly to confirm). The **request** section shows the
user's original text and one summary line: model name(s), call count,
total token count, and elapsed seconds. The **response** section lists
each turn with its outcome label (`committed`, `rejected`, or an
evaluation error) followed by the RFC 6902 patch ops JSON for that
turn. The **cell samples** section — shown only when at least one
`{llm}` mutate transformation ran — lists up to 3 before→after pairs
per column, formatted as `column: "before" → "after"`.

→ [code-contract.md — V2](code-contract.md#v2)

## Voice input (#VoiceInput)

Voice input lets the user speak a request instead of typing it. It is a
web-only convenience over the existing chat flow: the spoken audio rides
along on the ordinary patch turn. The recorded audio, the current table's
context, and the spec-editing instructions go to the selected model in the
**same single call** a typed request makes — the model hears the request and emits the spec
patch directly. There is no transcription step and no extra round trip, so a
voice request costs exactly as many model calls as a typed one. That single
call returns two things: the spec patch and a verbatim transcript of the
spoken request.

A microphone button sits in the chat sidebar, next to the send control. It is
shown whenever the selected model accepts voice input (the catalogue's
`voiceInput` flag — every Gemini model) **and** the
selected provider's API key is set. With a text-only model selected, or with
no key for the provider, the button is hidden. The recording is converted to
WAV in the browser before sending, the one audio format every voice-capable
provider accepts.

The button is press-and-hold: pressing and holding it starts recording, and a
red ring animates around it while the microphone is live. Recording stops when
the user releases the button, and a recording that reaches thirty seconds stops
on its own. Pressing Escape while recording cancels it — nothing is sent and
the table is untouched. Releasing sends the audio; the button shows a spinner
until the round trip returns.

Releasing the button posts a user bubble reading "🎙 Voice request" as a
placeholder. As soon as the model responds, the placeholder is replaced with
"🎙 " followed by the transcript — so the user sees what the model heard —
and the undo-history label for the turn matches. The assistant's response
follows, the same bubble a typed request produces. If the model omits the
transcript, the placeholder simply stays. On any failure (microphone,
network, or a model error) a toast reading "Voice input failed" reports it,
the same error also appears as an assistant message in the chat — carrying
the same per-attempt debug detail a failed typed request shows — and nothing
about the table or the spec changes.

The instruction text accompanying the audio names the loaded file, lists the
column names, and — when a cell is selected — includes that cell's column,
row, and value, so a request like "round this column" or "fix this cell"
resolves against what the user is looking at.

→ [code-contract.md — Voice input](code-contract.md#voice-input)

## Tutorial mode (#TutorialMode)

Tutorial mode lets a user walk through a `@tutorial`-tagged Gherkin scenario
interactively. Each tutorial uses pre-bundled fixtures so no API key is
needed for the file-loading and display steps; `prefill-chat` steps do call
the LLM with the request text auto-submitted.

A **Tutorial** button in the toolbar opens the Tutorial panel. The panel shows
a **clickable list** of every `@tutorial`-tagged scenario drawn from the bundled
feature files; clicking a row selects it (double-click selects and plays).
Below the list, a **Dev** dropdown lists every `@web` scenario that is *not*
`@tutorial`, so a developer can smoke-test any scenario without opening the
`.feature` file. A Play button starts whichever scenario is selected (it is
disabled until one is).

While a tour is active, the panel shows the current step number, the step
rendered as an imperative instruction (the Gherkin keyword is dropped and the
text is capitalized — e.g. `When query "…"` reads as **Query: "…"**), and
keyboard shortcut hints. Driver.js highlights the relevant part of the UI and
shows a popover with **← Prev**, **Next →**, and a close (**×**) button
directly in the popover. The same actions are available via keyboard: **←**
previous step, **→** or **Space** next step, **Esc** cancel. The panel also
shows the expected output table when a `show-golden` step is active.

Only the steps that drive the tour are shown; verification steps (`Then column
"X" exists in the spec`, synthetic preconditions, and other unclassified lines)
are dropped by the parser, so a tour reads load → query → compare. Each shown
step maps to one of four actions:

- **load-file** — the controller loads the named fixture into the in-memory
  store and calls `loadInput`, replacing the current dataset. The open-file
  button is highlighted. No dialog opens.
- **load-lookup** — the named fixture is written into the in-memory store at
  the working-directory path so the engine can read it as a join lookup table.
  No dataset is replaced. The open-file button is highlighted.
- **prefill-chat** — the chat input is filled with the step's request text and
  `sendChat` is called immediately (auto-submit). The chat input is highlighted.
- **show-golden** — the controller parses the scenario's golden file and exposes
  its rows in the panel for side-by-side comparison. The table view is
  highlighted.

Fixtures and golden files are bundled at build time from `spec/test-cases/`
by `vite.config.ts`; the tutorial controller resolves lookup files from
`tutorialSrc.inputs` and the golden file from `scenario.golden`, which the
parser lifts from the `the expected output is "X"` step.

→ [code-contract.md — Tutorial mode](code-contract.md#tutorial-mode)

## V2.5

V2.5 is a consolidation pass before V3: one spec schema, a handful of
bug fixes, and one new export command. It changes no wire format and
adds no transformation verb.

### One spec schema

V1 carried two rule-checkers for the spec — a strict V1 checker that
rejected every V2 feature and a V2 checker that accepted them. With no
real V1 documents left to protect, V2.5 deletes the V1 checker. Every
spec — a freshly loaded table, a patched spec, a replayed `.flow` —
validates against the one schema. A saved `.flow` records `version: 2`;
an older `version: 1` flow still loads, validated under the same schema.

### Sorting by a SQL or AI key

A `sort` key may be a column name or any expression — `{js}`, `{sql}`,
or `{llm}` — exactly like a `mutate` value. V2.5 fixes a bug where
`sort` evaluated every key as JavaScript: handed a `{sql}` or `{llm}`
key it tried to run SQL or prompt text as JS and broke or produced
garbage. A `{sql}` sort key now runs through DuckDB and an `{llm}` key
through the cell model, one key value per row, the same machinery
`mutate` already uses.

### A formatter bug never fails a request

The plan printer — the code that renders a transformation as a readable
line — runs inside a callback. V2.5 wraps that callback so a formatting
error drops the plan line and the request still commits; a cosmetic
display bug can no longer surface to the user as "couldn't apply that
change."

### `:save-py` — export a flow as a standalone Python script (#PyExport)

`:save-py <path>` writes the current sequence of transformations as a
single self-contained Python 3 script. The script carries a
`#!/usr/bin/env` shebang and PEP 723 inline dependency metadata in its
top comments, so `./script.py input output` runs directly with `uv`
resolving dependencies. It reads a `.csv` or `.jsonl` input and writes
the transformed table to the output path. The script runs
deterministically — no AI call at run time.

Generating the script makes exactly one AI call: the model translates
the spec's transformations into Python. Because the exported script
must be deterministic, `:save-py` refuses any flow containing an
`{llm}` cell — a live AI cell cannot be reproduced offline. Such a flow
prints `:save-py: flow contains LLM cells; cannot export to Python` and
writes nothing. A flow built only from `{js}`, `{sql}`, and the
structural verbs (`filter`, `sort`, `select`, `group`, `join`, `split`,
`validate`, `pivot`, `unpivot`) exports cleanly.

`:save-py` is a REPL command: it is not exposed as a `tamedtable`
subcommand in V2.5. Missing path prints `:save-py: missing path`; a
non-`.py` extension prints `:save-py: output must be a .py file`.

→ [code-contract.md — V2.5](code-contract.md#v25)

## V3

V3 items need real new machinery and are out of scope for V2.5. They
are recorded here so the spec tracks the committed roadmap.

- **Stop a running SQL query on Ctrl-C.** The V2 SQL section above
  describes the target cancellation behavior (`conn.interrupt()`, the
  2-second budget, draining a lingering query). V3 is when it actually
  lands: today's cancel path only stops AI calls, not DuckDB work that
  keeps running after the cancel returns.
- **Split a column with the AI.** `split` accepts an `{llm}` separator
  in the grammar but the runtime throws "LLM separators not yet
  implemented"; the split path is synchronous and cannot make a model
  call. V3 makes `split` async so an `{llm}` `on` can run.
- **SQL aggregates inside `group`.** A `{sql}` aggregate in `group.agg`
  currently throws an explicit guard. V3 runs a real `GROUP BY` per
  group through DuckDB.
- **Top-N sort.** `sort` returns every row, ordered; there is no
  `head`, `limit`, or `take`. V3 adds a `limit` to `sort` (or a
  separate `take` transformation) so "top 10 by revenue" needs no
  manual row deletion.
- **CSV column order via a `:` command.** Today CSV output column
  order follows the spec's column order. V3 exposes column order
  through a REPL `:` command — an option on `:save` or a dedicated
  reorder command — rather than a new spec field.

→ [code-contract.md — V3](code-contract.md#v3)
