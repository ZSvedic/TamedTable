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

- **filter** — keep rows where a predicate is truthy.
- **mutate** — set one or more columns from a value expression.
- **select** — keep only these columns.
- **sort** — by one or more keys, ascending or descending.

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
progress reaches the CLI and the future web shell.

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

→ [code-contract.md — Headless](code-contract.md#headless)

## CLI

The CLI is two things on top of headless: an interactive REPL where the user
types natural-language requests, and a `tamedtable execute <flow>` subcommand
that re-runs a saved spec against a CSV.

### REPL

The REPL prints a fresh ASCII table after every event that changes either
the underlying table state or the viewport: a successful natural-language
request, `:load`, `:undo`, `:redo`, `:show`, and `:find` when a match is
found. REPL commands that don't change either (`:help`, `:save`,
`:save-flow`, `:history`, `:schema`, `:exit`, and `:find` with no match)
print only their own output. A failed request prints the error and does
not reprint the table.

The REPL holds a viewport cursor `(rowOffset, colOffset)` over the
rows-and-columns rectangle. Defaults are 10 rows per page and 5 columns
per page. Both cursors reset to `(0, 0)` after `:load`, a successful NL
request, `:undo`, or `:redo`. `:show` moves the cursor explicitly;
`:find` snaps it to the first match. When rows fall outside the current
page, the truncated edge renders a marker row `...{N} more rows.` —
above when rows are hidden above the page, below when hidden below.
Columns hidden to the left or right render a symmetric marker column
`...{N} more cols.` at the edge. No terminal control codes — think
`sqlite3` or `jq`, not `vim`. Long LLM transformations print a few
sample row changes per chunk while they run.

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
  :undo              Pop the last applied patch.
  :redo              Replay the last :undo'd patch.
  :history           Print the patch journal.

View / navigation:
  :show [rows|cols start|prev|next|end|{N}]
                     Move viewport on the named axis, or jump to row/col N.
                     Bare :show reprints the current viewport.
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
ANTHROPIC_API_KEY in env.
```

Ctrl-C while a request runs cancels it and rolls back the half-applied
transformation. Ctrl-C while idle closes the REPL.

### Batch (`execute`)

`tamedtable execute <flow>` replays a saved flow against a CSV. `--input`
overrides the source path recorded in the flow; `--output` is required and
must be `.jsonl`. No LLM call happens on this path.

### Discovery

- `--help`, `-h`, and bare `help` print a usage screen to stdout. Usage
  covers the slash commands and the API-key requirement.
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

## V2 — web

V2 ships a web UI that mirrors the CLI's interaction shape (chat sidebar +
table view) but renders the table in the browser, supports CSV in via an
Open File dialog, and `.flow` save via a Save File dialog. The behavior
contract for transformations, undo, and cancellation stays the same — the
spec-and-patches wire model is what makes that possible. Cell editing,
scrolling, and column changes are not replicated as terminal interactions
in V1 — they become spec patches driven by natural language.

V2 also opens additional transformation kinds (`group`, `join`) and a third
expression shape (`{sql:…}` on top of DuckDB), and additional file formats
on both ends.

V1 ships only the terminal CLI and the headless library. When asked about
web UX, WoZ should produce a Claude artifact or write a sketch to `temp/`,
not refuse.

→ [code-contract.md — V2 — web](code-contract.md#v2--web)
