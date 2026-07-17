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

The spec describes the *data*: the source table, the visible columns, and an
ordered list of *transformations* that mutate rows. How the result is
*viewed* — page size, pagination — is UI state the spec never carries; each
surface owns its own view knobs. Four core transformation kinds cover the
row-and-column basics:

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

Every transformation remembers the request that produced it. When a request
commits, its text — for a spoken request, the transcript — is stamped
verbatim onto each transformation the turn added or changed, as `query`
metadata. The stamp is provenance only: the engine ignores it, and the
patch model never sees it (it is stripped from the spec before every
model turn). Because it lives inside the spec, a saved `.flow` carries
it, so the file records not just what each step does but what the user
asked for — in the user's own words and language. Undo removes a
transformation and its stamp together; a step later changed by another
request carries that later request.

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
loaded. Input arrives one of two ways: by path (the CLI reads a file off disk)
or as already-parsed rows (the browser parses a picked or fetched file through
the file-io codec registry and loads the rows directly, with no filesystem).
Either way the loaded state is the same. Once loaded, the runner handles one
request at a time — a second request while one is running throws.

On a successful request the runner:

1. Applies the LLM's patch to the current spec.
2. Validates the new spec.
3. Re-runs the transformations against the source.
4. Commits — the new spec and rows become visible.

On commit the displayed columns realign to the rows the replay produced:
a column whose key no longer appears in any row drops out, and keys the
transformations introduced append in first-seen order. The exception is
keys starting with `_` — those are internal unless the patch lists them
in `columns` explicitly. So `_valid` and `_validation` display (the
validate few-shots add them), while a yes/no helper column a mutate
computes only for a later validate stays on the rows but off the table.

If any step throws, the patch rolls back and the error goes to the LLM as the
next turn's input, up to a 3-turn recovery budget. The call either succeeds
or throws; the spec is never left halfway between two states.

The runner tolerates a model reply that is *almost* well-formed: a patch
value the model JSON-encoded but with a stray invalid escape (an apostrophe
written `\'`, say) is repaired and applied rather than dead-ending. This keeps
a recoverable model slip from forcing a recovery turn — which, in a key-free
tour replay, would hit a request that was never recorded.

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
that takes a list of RFC 6902 operations. The harness rejects four LLM
mistakes inline and feeds them back through the recovery loop:

- an empty operations list;
- a patch that applies cleanly but leaves the spec identical to before;
- a patch that writes a top-level key outside the spec shape (`table`,
  `columns`, `transformations`) — the spec describes data, never the view,
  so the schema rejects the unrecognized key and the message steers the
  model back to the transformation list;
- a patch that leaves a `validate` reading a column no step before it
  provides. The predicate would test a value that doesn't exist yet — every
  row would fail — so the rejection names the missing column and tells the
  model to order the step that computes it before the `validate`.

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

Temperature is pinned to 0 on model calls, but only for models that still
accept a sampling parameter. The newest models (Anthropic Opus 4.8/4.7, Fable
5, Sonnet 5; OpenAI GPT-5.4+/5.5) removed sampling params and reject
`temperature` with a 400 ("temperature is deprecated for this model"), so the
engine omits it for them and lets the model default apply. Either way outputs
are not byte-identical across model versions or providers. Tests that compare
LLM-produced
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

Each recording also keeps a readable copy of the request that produced
it, so a reviewer can see what was asked without reversing a hash. The
boilerplate every request repeats — the system prompt — is stored once
per file and each recording keeps only the part that varies. When a
request has no recording, the failure doesn't just say "miss": it names
the closest recording and shows where the two first differ, so a
changed prompt is diagnosable at a glance.

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
    [debug] gemini-3.5-flash ×1 · 2,118 tokens (2,029 in / 89 out) · 1.9s
```

A request that also fills LLM-backed cells calls a second model, so the
summary names both:

```
    [debug] gemini-3.5-flash ×1, gemini-3.1-flash-lite ×2 · 26,540 tokens (25,690 in / 850 out) · 9.7s
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
  an in-memory history that is *not* persisted across REPL invocations.
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
- `:load <path>` reads a table file as the new input source (file
  type inferred from extension; any registered format — `.csv`,
  `.jsonl`, `.parquet`, `.arrow` — accepted;
  `<path>` is taken literally — a leading `@` is part of the filename,
  not a Claude-Code-style file reference). A relative path that does
  not exist is retried under `../spec/test-cases/` — a dev convenience
  so feature files can name a fixture by bare filename; `execute`
  resolves `--input` the same way. Resets transformations,
  filter/sort, and cached LLM cell results just like loading at startup.
  Missing path prints `:load: missing path`; unknown extension prints
  `:load: unknown file type`; success prints
  `Loaded <path> (N rows, M cols)` (no column names) followed by the
  table.
- `:save <path>` writes the current rows, dispatching on extension —
  `.jsonl` or `.csv` (path resolved relative to the working directory).
  Missing path prints `:save: missing path`; an unknown extension prints
  `:save: unknown file type`; success prints a `saved` confirmation.
- `:save-flow <path>` writes the current spec as a replayable JSON document
  (the source path inside the flow is recorded relative to the flow file's
  own directory). Missing path prints `:save-flow: missing path`; success
  prints `saved flow`.
- `:save-py <path>` writes the current flow as a standalone Python 3
  script (see [§ Export a flow as a Python script](#export-a-flow-as-a-python-script-pyexport)).
  Makes one model call to translate the
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
ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or
OPENROUTER_API_KEY in env.
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
- `tamedtable --version` / `-v` prints the version — the line
  `tamedtable <version>`, sourced from the CLI package manifest — and
  exits 0. Like `--help` it runs offline, never starts the REPL, and
  never lists the `:` commands.

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
  tamedtable --version, -v           Print the version and exit.

The REPL needs ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or
OPENROUTER_API_KEY in env.
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
the transformation grammar, the three expression shapes, and a few-shot
per common task. The few-shots also carry the hard-won ordering and shape
rules: a computing mutate before the validate that reads it — with the
computed yes/no column kept out of the displayed columns, so a semantic
check surfaces only `_valid` and `_validation` — one mutate per
target column, `{llm}` (never a regex or range check) for semantic
judgments, per-part `{llm}` extraction for delimiter-free text, a
round-trip check for date plausibility, and digits-only phone output.

The batch prompt tells the cell model to apply each task's instructions to
its own content and return a JSON array of strings or nulls, one per task,
in input order.

The cell format constraint is the trailing instruction every `{llm:…}` cell
prompt must end with: reply with only the result, or the literal word
`null` if the input can't be processed.

→ [code-contract.md — System prompts](code-contract.md#system-prompts)

## Extended transformations, SQL, and the web UI

Beyond the four core verbs and the terminal CLI, the spec carries six more
transformation verbs (`group`, `join`, `split`, `validate`, `pivot`,
`unpivot`), a SQL expression shape, tabular (CSV) output, and a browser
front-end. The behavior contract for undo, cancellation, recovery, and the
streaming chunk callback is unchanged — each surface plugs into existing
seams rather than replacing them.

### CSV (and other tabular) output (#FormatOut)

`:save <path>` and `tamedtable execute --output <path>` both dispatch on
extension, the same way `:load` already does for input. The dispatch goes
through the format-codec registry, so `.csv`, `.jsonl`, `.parquet`, and
`.arrow` all work — see
[spec/packages/file-io/formats/](packages/file-io/formats/) for the
per-format rules.

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
rightRow)` pair; truthy means match. A left row that matches several
right rows emits **one output row per match** — the left values repeat,
SQL style; the join is not a first-match lookup. Default `how` is
`"left"` — left rows survive even without a right match, with
right-side columns set to `null`. `"inner"` drops left rows that have
no match.

When right and left columns collide, the right column is renamed
`<name>_2` (then `_3`, etc.) so no column silently overwrites
another. The right file is read with the same dispatch as `:load`
(unknown extension throws the *"unknown file type"* error). A
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

This is ergonomically what a `mutate` with `columns: string[]` and a
JS array-returning body already does; `split` exists so the LLM can patch
the structure without writing JS, and so regex/delimiter splits don't need
an expression at all. An `{llm}` `on` is also allowed — the cell model is
asked to break each cell into the parts.

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

A `validate` may only read columns that exist when it runs: source
columns, columns created by transformations ordered before it, and the
reserved `_valid` / `_validation` pair. A patch that orders a `validate`
before the step that computes its input — or that reads a column nothing
creates — is rejected before anything runs and fed back through the
recovery loop, naming the missing column. Steps whose output columns
can't be known without running them (`join`, `pivot`) suspend the check
for the transformations after them.

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
cancellation sequence ([§ Headless](#headless)) gets one extra
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

The browser front-end mirrors the CLI's interaction shape
— a chat sidebar for natural-language requests and the table view to
the right of it. Cell editing and column-reorder happen through normal
browser gestures but ultimately produce spec patches — the same shape
the LLM produces — so undo/redo, history, and replay against the source
all work unchanged. Scrolling and column-resize (dragging the boundary
between two column headers) are view-only gestures: they change what's
on screen but touch no spec and leave no history entry.

A table can be loaded from three sources, and each is its own
first-class action: **Open sample…**, **Open local…**, and **Open
URL…**. Samples are no longer buried inside the URL dialog — a user
looking for a bundled file should not have to guess it lives behind
"URL". The toolbar surfaces them under one **Open** menu button — a
document icon, the word "Open", and a chevron; clicking anywhere on it
drops a plain menu (there is no split default action). The menu is
grouped under small headers:

- **Recent** — a submenu entry at the top, greyed (disabled) until
  something has been loaded. Hovering or tapping it opens a side panel
  beside the menu listing the last 5 successful loads,
  newest first, each tagged with its kind (`sample`, `URL`, `local`,
  `flow`). A sample or URL entry reloads that address directly; a
  local or flow entry re-opens the matching file picker (a browser
  cannot silently reopen a local file), with the name serving as the
  reminder of what to pick. The list persists across reloads
  (localStorage, best-effort).
- **Data** — **Open sample…** (raises the sample picker; clicking a
  sample loads it straight away), **Open local…** (the native file
  picker), and **Open URL…** (the URL dialog).
- **Recipe** — **Open .flow & run on current data…** (below), greyed
  until a table is loaded.

The URL dialog is URL-only: it accepts a typed address and no longer
lists samples.

**Open .flow & run on current data…** replays a saved recipe onto the
table already open in the UI — one picker, for the `.flow` file only
(the data is the current table's source, so no second file is asked
for; the entry is disabled until a table is loaded). The flow is
validated (version 1 or 2, a well-formed spec), then checked against
the current table: a flow that reads a column the current data does
not have is refused with a **flow error dialog** — a modal that names
the missing column and the current columns, dismissed with OK (a
modal, not a toast, so it can't be missed, and it renders on the
phone layout the same way). The same dialog surfaces an unreadable or
invalid flow file (`Could not run flow …`) and a flow with `{llm}`
cells when the selected provider's key is missing. When the checks
pass, the flow's transformations replay onto the current table's
source, streaming AI cells onto the table as they compute. The replay
replaces the spec as one history entry, so a single undo returns to
the table as it was, and a chat message reports the result
(`Ran <flow> — N rows, M columns.`). Sample files to try this with
live in `spec/user-files/`.

While the flow runs, a modal **flow-run dialog** <!-- #OpenFlow -->
fronts the streaming state — a large file with AI cells can take
minutes, so the run gets progress, a log, and a way out:

- A progress readout — `Step i of N — <step label>`, plus
  `rows done / total` while an AI-cell step streams — over a progress bar
  that advances step by step (fractionally within a streaming step). The
  label is derived from the step itself — kind, target columns/keys, and
  an expression marker, e.g. `mutate EventGroup (AI)`, `filter (js)`,
  `group by EventGroup → total_players, sections, …` — so a step that
  calls the per-row model is recognizable by its `(AI)` marker.
- An expandable **Log**, collapsed by default, that feeds one line per
  event as the run progresses: each step as it starts, and each streamed
  cell (`<column> · row <n>: <before> → <after>`). Only the newest 500
  lines are kept — a bound, not a transcript.
- A **Cancel** button. Cancelling aborts the replay and leaves the table
  exactly as it was — nothing half-applied — with an info toast
  (`Flow cancelled — table unchanged.`) instead of the error dialog.

The same dialog fronts a **chat request** the moment its replay streams
its first AI cell — the trigger is the first cell result arriving, so a
request whose transformations are all deterministic (JS/SQL) never
raises it. The title is the request's text instead of a file name, and
Cancel stops the request exactly like the chat Stop button. The dialog
is a shared overlay, so the phone layout gets the same modal.

Before any file is loaded the table area shows an **empty page**: the
TamedTable mark, the line **"What table can I tame?"**, and the same
three open actions stacked as buttons — **Open sample…**, **Open
local…**, **Open URL…** — so the first run and the toolbar offer the
identical choices. A quiet line directly under the buttons reads
**"…or drop a file here"**. A gap below that, a line in the same style
as the heading reads **"New here? Check Tours."** — the link opens the
Tours panel, so a first-time visitor finds the guided path without
hunting for the toolbar button. The same line appears on the phone's
empty page.

The empty page is also a drop target: dragging a file from the desktop
onto it highlights the page (a tint plus a dashed border), and dropping
loads the file exactly like **Open local…** — same four formats, same
"Loaded …" message. A file whose extension isn't a supported format
surfaces the standard "Could not open file …" error toast. Once a
table is loaded the drop target goes away; a stray drop is ignored
rather than replacing the table.

Saving mirrors that shape: one **Save** menu button (the disk icon,
the word "Save", a chevron; plain dropdown, no default click),
disabled until a table is loaded. Its menu is grouped the same way:

- **Data** — one **Save <format>…** entry per supported format (CSV,
  JSONL, Parquet, Arrow). Each serializes the current rows in that
  format and opens the Save dialog with a matching suggested name
  (the source file's stem plus the format's extension — the source's
  own format entry suggests the original name back), so the user can
  keep the format they opened, switch formats, or rename.
- **Recipe** — **Save recipe as .flow…** (the replayable `.flow`
  file) and **Save recipe as Python…**, which
  translates the flow into a standalone Python script.

The Python export is
model-backed — the selected provider's primary (patch-turn) model does the
translation — so unlike every other save it needs a key for the selected
provider, and a missing key fails fast with a provider-named toast such as
`Exporting to Python requires a Google API key — open Settings and add one.`
(or `an OpenAI` / `an Anthropic`). It also refuses a flow that carries an AI
cell (which has no deterministic Python form), surfacing a toast that points
the user to save it as a flow instead. This is the browser's counterpart to
the CLI's `:save-py`.

A save (or any other) notification toast does not wait to be clicked
shut: it fades on its own after roughly the time it takes to read it,
so a routine "Saved …" note clears itself. Hovering a toast pauses that
countdown — long enough to read a longer message or to click an error
toast's **Copy report** action — and the dismiss button still closes one
at once.

A URL load is a plain `GET` against the entered address; the format is
detected from the path extension first and from the `Content-Type`
header as a fallback. Only `http://` and `https://` URLs are accepted;
`http://` shows a soft "unencrypted" hint but is not refused. Network
or CORS failures, non-2xx responses, and unrecognized formats surface
as inline errors inside the dialog, which stays open so the user can
correct the URL — the dialog does not produce a toast for these.
Bundled sample files live under the deployed site's `samples/`
directory; their list is frozen at build time by the Vite config and
surfaced in the **Open sample…** picker dialog — one click loads the
sample. The URL dialog stays URL-only.

The web shell uses the existing `Runner` interface unmodified.
Streaming chunks fire the same callback; the front-end debounces
them into table updates. A web session does not share state with a
CLI session; the file dialog handshake takes the place of `:load`,
and the in-browser tab IS the session.

`{sql}` transformations work in the browser exactly as they do in the
CLI — the same SQL engine runs client-side. It loads on the first SQL
request of a session, so a session that only ever loads a CSV or JSONL
and runs plain transformations never pays for it.

The table view paginates. Rows display one fixed-size page at a time —
twenty rows by default; the page size is a view setting the web shell
owns — with a pager that jumps to the first, previous, next, last,
or a numbered page. When the active provider's defaults pin a cell batch
size (OpenRouter's 5), the page holds five batches instead — 5 × 5 = 25
rows — so one page of AI cells fills in five engine calls; switching
provider re-derives the page size and clamps the current page into range. Paging is a view concern, like the CLI's
viewport: it never touches the spec, so it survives requests, undo, and
redo. Loading a file opens page one; a request that shortens the table
clamps the current page back into range.

A status footer under the table reports the current selection and what
the engine is doing. Clicking a cell selects it, and the footer names
it `R<row> · <column>`. The footer also shows whether the app is idle,
running a request, or has just saved — a save reads as saved until the
next edit, request, or load returns it to idle.

The settings panel shows four provider accordion cards stacked vertically:
Google, OpenAI, Anthropic, OpenRouter. On open, no card is expanded. Clicking a collapsed
card expands it and selects that provider; clicking an already-open card
collapses it without changing the provider. Opening a card collapses any other
open card.

Each card header (always visible, clickable) shows a radio knob, the provider
name and tagline, and a voice badge on the right edge. The voice badge is green
with a microphone icon when the provider supports voice input, or grey "No voice
input" when it does not. Google shows the green badge; OpenAI, Anthropic, and
OpenRouter show grey.

Text requests route through the selected provider — pick Google and a text
request goes to Gemini, pick OpenAI and it goes to OpenAI, pick Anthropic and it
goes to Anthropic. A natural-language chat request therefore needs a key for the
selected provider: when that provider's key is missing the request never fires
and a toast names the provider it needs, e.g. `Text requests require a Google API
key — open Settings and add one.` (or `an OpenAI` / `an Anthropic` / `an
OpenRouter`). A key for a
different provider does not satisfy the requirement — selecting Google still
needs a Google key even when an Anthropic key is set. This is the same provider
the voice mic already uses, so text and voice share one key per provider.

When a card is open its body shows an API key field with a show/hide toggle, a
grey monospace env-var hint beneath the key field (`or set GEMINI_API_KEY in
.env`, `or set OPENAI_API_KEY in .env`, `or set ANTHROPIC_API_KEY in .env`,
`or set OPENROUTER_API_KEY in .env`
respectively), and that provider's two fixed default models **read-only** — a
**Primary** row (the patch-turn model, which carries voice input) and a
**Secondary** row (the per-row cell model), each with its model id and per-Mtok
price. The user picks a provider, not individual models; a green "🎙 voice" tag
shows on a row only when that model supports voice. A single generic explainer
of the two roles sits above the cards, a "New here? How to get an API key" link
sits directly below it, and a "How to change primary and secondary models?" link
(to `FAQ.html#change-models`) sits below the cards.

Changes apply immediately — selecting a provider card calls
`controller.clickProviderCard(p)`, which pins that provider and its two fixed
defaults (`setConfig({ provider, model, cellModel })`). The footer has only a
"Close" button; there is no separate "Save" button. Switching provider changes
the models, which rebuilds the engine and replays the current transformations
against the source, so the table on screen is preserved and the new models drive
the next request. Full detail in
[spec/packages/model-config/behavior.md](packages/model-config/behavior.md).

When a request fails because the API key is wrong or missing, the web shell
surfaces a toast with a sentence the user can act on: "Invalid API key. Open
Settings to update your Google key." (or OpenAI / Anthropic). For Google the
toast adds a second sentence — "If the key is correct, Google now blocks
unrestricted keys — add an application restriction in Google AI Studio." —
because [Google rejects unrestricted keys](https://ai.google.dev/gemini-api/docs/api-key#secure-unrestricted-keys)
and the symptom is an indistinguishable "API key not valid" response, so a user
whose key is genuinely fine is told the real fix rather than re-entering the same
key. A model-not-found error reads "Model not found. The selected model may be
unavailable." A rate-limit rejection (HTTP 429) reads "Rate limited by the
Google API. Wait a minute and try again." (or OpenAI / Anthropic) — the request
did not fail because of anything the user wrote, so the message says to retry
rather than rephrase. A network or CORS failure reads "Network error. Could not reach the
Google API." (or OpenAI / Anthropic). Errors that don't match a known pattern pass through as-is so no
information is lost. The provider name in the message matches whichever provider
card is selected.

Every error also lands in the chat as a red `Error:` assistant message — the
toast is ephemeral, the chat entry stays on screen and selectable. Errors come
in two kinds, decided where the error is raised. **Guidance errors** mean the
request could not run as asked and the message already says what to do next:
no file loaded, a missing or invalid API key, model not found, rate limiting,
a network failure, a cancelled request, or a request already in progress.
**App errors** are everything else — the recovery budget exhausting after 3
attempts, or any failure that matches no known pattern. An app-error chat
message carries a **Report bug** action (see the request-detail section
below); a guidance error never does, so a user who simply hasn't loaded a
file yet is not invited to file an issue. When a new error path is added and
not classified, it counts as an app error — the safe default costs one extra
button, never a lost bug report.

Toolbar action buttons carry tooltips: Undo names its CLI command
equivalent (`Undo (:undo)`), Redo likewise (`Redo (:redo)`), the Open
menu button reads `Open a table or a saved flow`, and the Save menu
button reads `Save the data or the recipe`. Menu entries name
themselves and carry no extra tooltip.

A `?` button in the Requests sidebar header opens a discoverability
popover listing three gesture hints: double-click to edit a cell, drag a
column divider to resize columns, and drag a column header to reorder.
Hovering over the button opens the
popover; moving the cursor away closes it; clicking toggles it. The web
chat does not parse colon commands — undo/redo and the saves are toolbar
actions (the dock's Undo and the app bar's Save menu on mobile), and a
typed `:undo` goes to the model as plain text.

After a successful request, the assistant chat bubble shows the
transformed expressions — up to 7 lines with bodies truncated to 100
characters each (long code expressions trim the same as prompt text, so
the thread stays scannable); overflow renders as `… and N more`. Model, token, and
elapsed-time stats are not shown in the bubble; they appear only in the
expandable detail panel.

Clicking **request detail** below an assistant message expands an
inline panel with three sections. A small copy icon to the right of the
toggle copies the panel's full text to the clipboard (it turns green
briefly to confirm). Next to the copy icon, a **Report bug** action (a
bug icon) starts the same send-a-bug-report flow the Settings panel
offers — it first records the flagged reply and the request text that
produced it as a diagnostics event, so the prefilled GitHub issue leads
with the exchange being reported. Every reply to a completed request
carries the action (a wrong answer is a bug even when nothing turned
red), and an app-error message carries it even without a request detail;
guidance errors never do. The **request** section shows the
user's original text and one summary line: model name(s), call count,
total token count, and elapsed seconds. The **response** section lists
each turn with its outcome label (`committed`, `rejected`, or an
evaluation error) followed by the RFC 6902 patch ops JSON for that
turn. The **cell samples** section — shown only when at least one
`{llm}` mutate transformation ran — lists up to 3 before→after pairs
per column, formatted as `column: "before" → "after"`.

#### Condensed toolbar (medium width)

Between the full desktop width and the phone breakpoint there is a band where
the top bar cannot fit all its labelled buttons in one row. Rather than let the
bar overflow the viewport, the toolbar **condenses**: the file readout is
hidden and every action button drops its text for an icon (the tooltip still
names it), so Open, Save, Undo, Redo, the theme toggle,
Settings, and Tours stay on one line that fits. Mobile-friendliness means the
app never scrolls sideways at any width — the row condenses instead of spilling.

#### Narrow viewport (mobile)

At a phone-width viewport (768 px and below) the side-by-side
sidebar-and-table layout does not fit, so the app switches to a
table-first **dock layout**. The same controller drives both — only the
chrome differs; nothing about loading, transforming, saving, undo/redo,
or the engine changes.

- The desktop top bar collapses to a compact **app bar**: the file
  name and a `‹ page / total ›` pager with prev/next buttons when the
  table spans more than one page (the same paging the desktop
  pagination bar drives). The open and save actions live in the Menu
  drawer, not the app bar — corner icons are too small to tap.
- The table fills the screen below the app bar. The **page itself**
  scrolls the table (both directions — the app bar and dock stay
  pinned to the screen), so the browser's own scrollbar shows the true
  position in the table. The header row and row-index column stay
  frozen: the header sticks below the app bar, the index column to the
  left edge. The table's surface spans the whole scrollable width, so
  scrolling right never exposes the tinted page background behind the
  cells — and a tour spotlight anchored to the table covers the visible
  columns wherever the page is scrolled.
- A persistent **bottom dock** carries five buttons — **Menu**,
  **Undo**, **History**, **Type**, and **Speak** — a dark bar with white
  icons in both themes. Undo is a one-tap button (it greys when there is
  nothing to undo). Undo, History, Type, and Speak are disabled until a
  table is loaded; **Menu stays live** so the open actions, Settings,
  and Tours are reachable even before a file is loaded.
- **Menu** opens a left **drawer** carrying the desktop toolbar's Open
  and Save menus expanded in full — the same menu model the desktop
  dropdowns render (identical items, icons, order, and disabled
  states), listed under **Open** and **Save** headings with separator
  lines between the groups instead of nested dropdowns. **Recent**
  expands in place inside the drawer (tap to unfold the tagged
  entries). Below them: a dark-mode toggle, Settings, and Tours.
- **Type**, **Speak**, and **History** each raise a **sheet** that takes
  the dock's place at the bottom, so the table stays in view above it:
  - **Type** is a composer — a one-line field with a send button, in a
    sheet only as tall as the field itself. The phone's own keyboard
    does the typing, and the sheet rides on top of it: phone browsers
    slide the keyboard over the page without moving `fixed` elements,
    so the bottom region tracks the visual viewport and rises by the
    keyboard's height — the field always stays visible, with no dead
    space between it and the keys. Sending runs the request and lowers
    the sheet; the chevron-down button lowers it without sending.
  - **Speak** records (a live waveform, nothing recognized yet); the send
    button stops recording, transcribes, runs the request, and lowers the
    sheet on its own. Cancel discards.
  - **History** shows the undo timeline — newest at the top, the current
    point highlighted, already-undone steps dimmed below it, a relative
    time per step. Tapping a step jumps straight to it; **Undo** / **Redo**
    step one at a time. It reads the same journal the desktop Undo/Redo
    buttons walk, shown whole.
- The settings panel, the URL dialog, the sample picker, and the Tours
  panel open as full-width sheets rather than centered desktop cards.
- A tour runs on mobile through the same engine as the desktop. A step
  that highlights the chat input opens the Type sheet so the spotlight
  lands on the visible composer; the load step (shown as **"Open the
  sample"**) points at the empty page's **Open sample…** button, and a
  table step points at the grid. The closing **"Voilà"** step highlights
  the table — the same anchor the desktop tour uses.

In a normal browser tab the phone browser draws its own bars — the
address bar on top, on some browsers a navigation bar at the bottom —
which shrink the app, and it slides them away only when the page
really scrolls under a finger. Because the page is the table's
scroller, swiping through the table hides the bars naturally. The page
always keeps at least a bar's worth of scroll room — so even the empty
page or a short table page can be swiped to dismiss the bars — and the
layout grows into the reclaimed space, so the dock is never covered by
the bottom bar. On desktop nothing scrolls; the layout is fixed to the
window as before.

On a phone the Settings panel ends with an **Add to home screen**
section: opened from a home-screen icon the app runs full-screen, with
no browser bars at all. Where the browser offers an install prompt
(Chrome on Android) a button triggers it; elsewhere (Safari and other
iOS browsers) the section shows the two-step share-menu instruction.
Desktop Settings does not show the section.

The empty page, the dialogs, and every transformation behave
identically to the desktop app; the dock layout is purely a
presentation choice keyed off viewport width and flips live as the
window (or device) is resized.

→ [code-contract.md — Extended transformations, SQL, and the web UI](code-contract.md#extended-transformations-sql-and-the-web-ui)

### Diagnostics log (#Diagnostics)

When a bug bites in the browser, the user clicks one action and gets a
self-contained report to paste into a Claude chat — no DOM spelunking, no
console digging. The app keeps a small rolling log of recent events; the
report is that log plus the app version and a key-free config snapshot,
written as a markdown doc.

The app records an event at four moments, each carrying the context that
explains it:

- every toast the user sees (an error or an info note);
- every model request that fails — its method, URL, the SHA-256 request
  fingerprint, and the first 2 KB of the request body;
- a tutorial replay miss ("no recording for this request") — the active
  tour and scenario plus the missing fingerprint, the exact pair that
  turns a long debugging session into a two-minute diagnosis;
- a chat reply the user flags with **Report bug** — the flagged reply's
  text and the request that produced it, so the report leads with the
  exchange being reported.

Each event also carries whatever context is available: the active
tutorial feature and scenario, the provider, model, and cell model, how
many transformations the current spec holds (a count, never the data),
the last few chat messages, the app version, and the browser's user-agent.

The log is bounded — the newest 20 events and roughly 64 KB, whichever
bites first, evicting the oldest. It lives in the browser under
`tamedtable.diagnostics` and persists across file loads and sessions, so a
report gathered after a bug still carries the events that led up to it. Where
the browser hides storage (private mode, headless tests) the log keeps working
in memory and never throws.

**Keys never reach the log.** Before any event is written, anything
shaped like an API key (`sk-…`, `AIza…`) or an auth header
(`authorization`, `x-api-key`) is stripped, and the config snapshot drops
the per-provider key fields outright. A pasted report is safe to share.

Three actions live in Settings. **Send a bug report** (the primary
button) copies the full report to the clipboard and opens a prefilled
GitHub issue on the maintainers' tracker — the report rides in the issue
body, truncated to a raw budget small enough (2,000 chars) that even
percent-encoded (~3× for JSON-heavy markdown) the URL stays well under
GitHub's ~8 KB limit, with the clipboard copy as the backstop for a long
log or a blocked popup. **Copy diagnostics report** copies the
markdown for pasting anywhere (a Claude chat, a comment). **Clear
diagnostics** empties the log. An error toast also carries a **Copy
report** action so a user can grab the report the moment a bug surfaces.
The chat is the durable entry point: the **Report bug** action on a
request-detail row or an app-error reply (see the Web UI section)
records the flagged exchange, then runs the same send-a-bug-report flow.
The report lists events newest first.

→ [code-contract.md — Diagnostics log](code-contract.md#diagnostics-log-diagnostics)

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
no key for the provider, the button is hidden. On a browser missing the
capture APIs (`getUserMedia` / `MediaRecorder`) no recording port is wired,
so the button is hidden there too — it never appears and then fails on the
first press. The recording is converted to
WAV in the browser before sending, the one audio format every voice-capable
provider accepts.

The mic supports both ways people use a voice button, so no one has to know
which it is up front:

- **Press and hold** — hold the button to record (a red ring animates while the
  microphone is live) and release to send. This is the push-to-talk feel.
- **Quick tap** — a quick click latches recording hands-free: the button gives
  way to a cancel (✕) and a send (✓) control with a pulsing dot, and recording
  keeps going until the user picks one. This is what saves the common
  first-time mistake of clicking once and releasing — instead of sending an
  empty clip, the recording simply waits for the explicit send.

A recording that reaches thirty seconds stops and sends on its own. Pressing
Escape while recording (held or latched) cancels it — nothing is sent and the
table is untouched. Sending shows a spinner until the round trip returns.

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

### Hands-free continuous voice

A second button — a waveform icon, next to the mic — turns voice fully
hands-free. Where the mic records one request (held or tap-latched), the
waveform button
is a toggle: click it once and the app listens continuously, click again to
stop. While listening, the button's bars pulse. It appears under the same
conditions as the mic (a voice-capable model plus a key) and is hidden when
hands-free voice isn't wired — including on a browser missing `getUserMedia`
or the Web Audio API, where no hands-free port is wired at all.

The difference is who decides a turn is over. A client-side voice-activity
detector runs entirely in the browser — no audio leaves the machine to find turn
boundaries — and watches the live microphone. When the user stops talking, it
cuts that stretch of speech into one clip and sends it on the very same patch
turn the mic button uses: one model call carrying the audio and the table
context, returning the spec patch and a transcript. So each spoken turn applies a
transformation and shows its "🎙 …" bubble with no button press between turns;
the user just keeps talking. While a turn is being applied the button shows a
spinner, then returns to listening. A turn that arrives while the previous one is
still applying is dropped, so two transformations never overlap. Every applied
turn is reversible with Undo. Stopping releases the microphone.

→ [code-contract.md — Voice input](code-contract.md#voice-input)

## Tutorial mode (#TutorialMode)

Tutorial mode lets a user walk through a `@tour`-tagged Gherkin scenario
interactively, with **no API key**. The clickable list renders instantly from
a small bundled index of scenario names; everything heavy — the feature
source, the input/golden fixtures, and the recorded model responses — loads
lazily, fetched from the deployed site itself the moment a tour opens. A
`prefill-chat` step auto-submits its request text, but instead of calling the
live model it **replays the tour's recorded cassette**, so a visitor with no
key set can still play a full tour end to end. A miss (no recording for the
exact request) fails loudly with a toast rather than hanging.

A **Tours** button in the toolbar opens the Tours panel. The panel shows
the `@tour`-tagged scenarios drawn from the bundled feature files, **grouped
into the seven marketing feature categories** — Clean up, Enrich & extract,
Classify, Validate, Process language, Be exact, and Load, save & reuse —
numbered 01–07, in the same order as the homepage sections. A scenario's group comes
from its `@cat-…` tag (e.g. `@cat-cleanup`); empty categories are omitted.
Load, save & reuse has no tours — by the time a visitor cares about saving,
they have already loaded a file and run a query — so the panel shows the first
six groups.
**Clicking a tour starts it immediately** — there is no separate Play step. A
tour the visitor has played to the end carries a **green checkmark** in the list
(remembered across reloads), so it is easy to see what is left to try.
Below the groups, a **Dev** dropdown lists every `@web` scenario that is *not*
`@tour`, so a developer can smoke-test any scenario without opening the
`.feature` file; picking one starts it too. The homepage "Show me →" links
deep-link into these tours, one per feature item; the Load, save & reuse
homepage section is informational only, with no "Show me →" links.

A `load the lookup table …` step (a join's second input) is a **silent
prerequisite**, not a tour step: the file is written before the tour starts and
the step is hidden, so a join tour reads Load → Run query rather than
spotlighting a button the user never presses.

When a tour starts, the app **returns to the empty state** — the current table
is cleared — so the first step (always a Load) can spotlight the Open control
the empty page shows. This matters on the phone, where the Open button only
exists in the empty state: without the reset, starting a tour while a file was
open would spotlight a button that isn't on screen, leaving a blank overlay
instead of the first step. The tour then loads its own sample when the user
advances.

When a tour starts, the Tours panel **closes** and Driver.js takes over:
it highlights the relevant part of the UI and shows a popover with the step
instruction, an **"N of M"** progress line, and a single forward button —
**Next →**. **Tours are forward-only**: no Previous button, no ← key —
stepping back would desync the app's replay state (a loaded file, a sent
query) from the tour cursor. **→** / **Space** / **Enter** advance; **Esc**
cancels; an accidental click on the dimmed overlay does not. A spotlight
never exceeds the screen: a target larger than the viewport (the table) is
highlighted by its visible top region, so the popover always has room below
it. Each step is **highlighted first** and **executed only when the user
clicks Next** — the action runs as the tour advances, not at the moment the
step appears, and it runs **once**.

The **last stop is terminal**: it is numbered **"M of M"** and its popover
shows a completion message — `Voilà, "<tour name>" is done.` — with two
buttons. The primary, **Back to Tours**, ends the tour and returns the user to
wherever they started: a tour launched from the Tutorial panel reopens the
chooser, while a deep-link tour goes back to the page the user came from (see
*Deep links*). The secondary, **Stay here**, closes the overlay but keeps
the finished tour on screen; **Esc** on the terminal stop also stays (on
earlier steps it still cancels).

**Staying in the tour.** The table keeps the tour's result and the engine
stays in key-free replay mode, so the user can examine the data and walk the
steps back and forth with **undo/redo** — those re-runs replay from the tour's
cassette and need no API key. New requests cannot be served from the cassette,
so the chat input and the mic are disabled while staying; the input shows the
greyed hint `You are inside Tour replay, use undo/redo to examine steps.` and
a request sent anyway (programmatically) is silently ignored — no toast, table
untouched. Opening the Tutorial panel is the way out: selecting another tour
leaves the stayed tour first (back to the empty state, exactly like Back to
Tours) and then plays fresh; closing the panel leaves the finished tour as
usual.

Only the steps that drive the tour are shown; verification steps (`Then column
"X" exists in the spec`, synthetic preconditions, and other unclassified lines)
are dropped by the parser, so a tour reads load → query → compare. Each shown
step maps to one of five actions:

- **load-file** — the controller loads the named fixture into the in-memory
  store and calls `loadInput`, replacing the current dataset. The open-file
  button is highlighted and the popover names the sample being opened —
  **Open sample "customers-input.csv"**. No dialog opens.
- **load-lookup** — the named fixture is written into the in-memory store at
  the working-directory path so the engine can read it as a join lookup table.
  No dataset is replaced. The open-file button is highlighted.
- **prefill-chat** — the chat input is filled with the step's request text the
  moment the step is **highlighted**, so the popover reads simply **"Type and
  run the query"** instead of repeating it. Clicking **Next** submits the request
  (`sendChat`) and clears the input. The chat input is highlighted (on the phone
  the Type sheet opens so the composer the spotlight lands on is on screen).
- **show-golden** — the controller parses the scenario's golden file and exposes
  its rows in the panel for side-by-side comparison. The table view is
  highlighted.
- **play-audio** — the named audio clip plays in the browser and then drives a
  real voice turn: the controller fetches the clip, reuses the voice plumbing to
  build the same spoken request the microphone would, and runs it through the
  engine in replay mode — so a voice tour transforms the table from the recorded
  cassette with **no API key**, exactly like a `prefill-chat` step does for typed
  requests. The **Speak** control is highlighted — the mic button on desktop, the
  **Speak** dock button on the phone — and the popover reads **"Speak and run the
  query"**. The clip plays for you; nothing is recorded.

The feature source, input/lookup fixtures, and golden files are fetched
same-origin on demand — the feature when a tour opens (then parsed to get its
steps), a fixture when a `load-file`/`load-lookup`/`show-golden` step runs.
Only the scenario index (name, source file, tags) ships in the bundle, so the
page stays small. The golden file is named by `scenario.golden`, which the
parser lifts from the `the expected output is "X"` step.

### Key-free playback

A tour's `prefill-chat` step would ordinarily call the model. Instead, while a
tour plays the engine runs in **replay mode**: each model call is matched
against the tour's recorded cassette (fetched same-origin) and served from it,
so no key is needed and no network call leaves the browser. Matching is exact
over the whole request, so the tour must reproduce the request that was
recorded — playback therefore pins the same model and configuration the
recording used: the Gemini provider defaults, which every committed cassette
is recorded with (voice tours included — voice input is Gemini-only anyway).
A request with no recording fails loudly (a toast), never a silent hang. Normal (non-tutorial) chat is unaffected:
it still uses the visitor's own key against the live model.

### Deep links into a tutorial

A link can open the app straight into one tour and play it. On load the app
reads two query parameters:

- `feature` — the Gherkin file name the scenario lives in (e.g. `filter.feature`).
- `scenario` — the scenario name, URL-encoded.

A third parameter, `tours` (any value), opens the Tours panel chooser instead
of playing one tour — the homepage's "take a guided tour" links use it, so a
key-free visitor lands directly on the tour list.

Both together name one tour; the file disambiguates when two files share a
scenario name, so matching on the scenario name alone is not enough. When both
resolve to a real tour the app plays it from step 1 (the Tutorial panel stays
closed — the Driver.js overlay takes over immediately). A missing parameter, an
unknown file, or an unknown scenario boots the app normally — panel closed, no
error toast; a deep link never crashes or blocks a normal visit.

**Finishing a tour.** Clicking **Back to Tours** on the terminal last step opens the
Tutorial panel chooser, whichever way the tour was started — so the visitor can
pick another tutorial without hunting for the panel. The marketing homepage opens every "Show me →"
link in a **new tab**, so a deep-link visitor who is finished simply closes that
tab and is back on the homepage they came from; the app does not navigate for
them. (This replaces an earlier `history.back()` / query-strip scheme, which
could not work once the homepage began opening each tour in a new tab — a fresh
tab has no history to go back to.)

Production links use the deployed base, e.g.
`https://www.tamedtable.com/app/?feature=filter.feature&scenario=Filter+by+Country`.

→ [code-contract.md — Tutorial mode](code-contract.md#tutorial-mode)

## One schema, richer sort keys, and Python export

A consolidation pass: one spec schema, a couple of bug fixes, and one new
export command. It changes no wire format and adds no transformation verb.

### One spec schema

Every spec — a freshly loaded table, a patched spec, a replayed `.flow` —
validates against one schema. A saved `.flow` records `version: 2`; an
older `version: 1` flow still loads, validated under the same schema.

### Sorting by a SQL or AI key

A `sort` key may be a column name or any expression — `{js}`, `{sql}`,
or `{llm}` — exactly like a `mutate` value. A `{sql}` sort key runs
through DuckDB and an `{llm}` key through the cell model, one key value
per row, the same machinery `mutate` already uses.

A `sort` may also carry a `limit`: a positive integer that keeps only the
first N rows after ordering, so "top 10 by revenue" needs no manual row
deletion.

Ordering is numeric-aware. When both key values are numbers or numeric
strings they compare as numbers — a CSV-loaded revenue column (all values
strings) sorts by magnitude, so 2 comes before 10, never "10" before "2".
Any other pair compares as text.

### A formatter bug never fails a request

The plan printer — the code that renders a transformation as a readable
line — runs inside a callback wrapped so a formatting error drops the plan
line and the request still commits; a cosmetic display bug can no longer
surface to the user as "couldn't apply that change."

### Export a flow as a Python script (#PyExport)

`:save-py <path>` writes the current sequence of transformations as a
single self-contained Python 3 script. The script carries a
`#!/usr/bin/env` shebang and PEP 723 inline dependency metadata in its
top comments, so `./script.py input output` runs directly with `uv`
resolving dependencies. It reads a `.csv` or `.jsonl` input and writes
the transformed table to the output path. The script runs
deterministically — no AI call at run time — and reproduces the flow's
result: run over the same input, it writes the same rows the session
would have written with `:save`.

Generating the script makes exactly one AI call: the model translates
the spec's transformations into Python. Because the exported script
must be deterministic, `:save-py` refuses any flow containing an
`{llm}` cell — a live AI cell cannot be reproduced offline. Such a flow
prints `:save-py: flow contains LLM cells; cannot export to Python` and
writes nothing. A flow built only from `{js}`, `{sql}`, and the
structural verbs (`filter`, `sort`, `select`, `group`, `join`, `split`,
`validate`, `pivot`, `unpivot`) exports cleanly.

`:save-py` is a REPL command: it is not exposed as a `tamedtable`
subcommand. Missing path prints `:save-py: missing path`; a
non-`.py` extension prints `:save-py: output must be a .py file`.

→ [code-contract.md — One schema, richer sort keys, and Python export](code-contract.md#one-schema-richer-sort-keys-and-python-export)
