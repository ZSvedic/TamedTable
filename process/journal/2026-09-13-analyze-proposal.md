# Proposal: questions about the data (#Analyze)

Task spec for the read-only analysis feature asked for in
[issue #299](https://github.com/ZSvedic/TamedTable/issues/299) and by a tester
whose questions came back as transformations. It directs the next sessions; it
is not itself a spec: `spec/behavior.md` stays canonical and gets the wording
once this proposal is approved. The work runs in the order the maintainer set:
this proposal, then red Gherkin plus spec, then the implementation.

## The customer story

Load a table and ask *"Which niches make up 80% of my customers?"*. TamedTable
computes the answer over the whole table with SQL, replies in one or two plain
sentences, shows the small result table it used, and leaves your table exactly
as it was, with nothing in the history to undo. Then say *"Filter to those
three niches"* and that becomes a step, as today. Understand the data first,
then tame it.

## What goes wrong today

The chat model is forced to call the patch tool on every turn (`toolChoice`
pins `apply_spec_patch`), so it has no way to say anything. A tester typed
"hello" and got a no-op mutate; "can you tell me where Ana lives?" became a
filter. Rander's exploration (issue #299) worked only through group-by steps
and Undo. Two facts make the fix smaller than the earlier chat thread feared:

- `{sql}` already runs in the browser: the web build aliases DuckDB to
  duckdb-wasm, loaded on first use (`src/shims/duckdb.ts`, proven by
  `sql.e2e.ts`). The browser needs no second engine.
- Every request already goes through one tool-calling model turn. Analysis
  adds two tools to that turn and lets it loop a few steps. Nothing else in
  the engine changes.

## Behavior (what the user sees)

### One rule tells a question from a request

A request names a change to the table (add, drop, filter, sort, normalize,
count per country, pivot): it becomes a step, exactly as today. A question
wants a fact or a judgment (which, how many, what share, is there, does…?):
it gets an answer, and the table stays as it is. When in doubt, a sentence
ending in `?` is a question. An imperative that names a table shape ("Count
customers per Country", "group by niche") stays a transformation even though
it sounds analytical, so `aggregate.feature` keeps its meaning. A message
that is neither (a greeting, an ask the model cannot map to the table) gets a
one-sentence reply and changes nothing.

### Every answer comes from a query

The model answers a question by running one or more SQL queries over the
current rows (DuckDB relation `t`, the same engine `{sql}` steps use), then
writing the answer in plain words from the results. Every number in the
answer comes from a query result. What the model sees of each result is
bounded: at most 50 rows, 30 columns, 120 characters per cell, plus the true
row count, so the request's token budget stays constant whatever the table
size: the same promise the patch turn makes. A semantic question ("what
themes appear in the reviews?") is answered from such a bounded sample, and
the reply says so.

The user gets:

- the answer, one to three sentences;
- the result table the answer rests on (the query with the most rows; up
  to 20 rows shown, `… N more rows` after them), so the calculation is
  visible, as issue #299 asks;
- the request detail: each SQL query that ran, model calls, tokens, time.

### Nothing changes, so nothing to undo

An answer leaves the spec, the history, saved flows, and the changed-cell
marks untouched. `:undo` after a question undoes the previous step, as
before. A cancelled question (Stop, Ctrl-C) aborts the model call or the
running query and leaves nothing behind.

### The last answer carries into the next request

The turn stays fresh (no rolling chat history), with one bounded exception:
the most recent answer's text (at most 500 characters) rides along on the
next request as context, so *"Which country has the most customers?"*
followed by *"Keep only customers from that country"* works. Any committed
step or a new load clears it. Cost: about 100 tokens on that one turn.

### Rows still pending (web, lazy execution)

A question never spends AI calls. It computes over the rows as they stand:
cells still pending or failed enter the query as NULL, the query result tells
the model how many rows were affected, and the reply says so when the
question touched such a column. Run on all rows first for a complete answer.
The estimate dialog and the dependency gate never appear for a question.

### Surfaces

- **Headless.** `request()` resolves with what happened: a patch, or an
  answer with its text and result table. The debug summary lists the
  queries.
- **CLI.** While a query runs the REPL prints `query 1: <sql, clipped>`, the
  way `step 1/2:` narrates a step. Then it prints the answer, the result
  table in the usual ASCII form (first page of rows, `...{N} more rows.`
  marker), and the `[debug]` block with one `query:` line per SQL query and
  the usual model, token and time summary. The main table is not reprinted
  and the viewport does not move. `:help` gains one line saying questions
  are welcome.
- **Web, desktop.** The reply is an assistant message with a distinct
  *answer* marker (the ok dot means "applied", so an answer must not wear
  it), the text, the result table underneath, and the request-detail toggle
  with the queries. There is no `Executed steps:` heading, and the reply can
  never turn into `Undone steps:`. The
  suggestion chips clear after an answered question as they do after a
  committed one: the conversation is open. Live progress while it runs:
  `Querying the table…` with each SQL in the log.
- **Web, phone.** The phone has no chat thread, so an answer rises as a
  bottom sheet (the History sheet's family): text, result table, a close
  chevron. Dismissing it leaves the table where it was.
- **Voice.** A spoken question works the same: the reply tool carries the
  transcript, the bubble swaps to it, the answer follows.
- **Suggestions after a load.** The suggester learns the question few-shots
  along with the transformation ones (it is assembled from the same prompt),
  and may propose at most one question among its 2 to 4 lines.
- **Analytics (Umami).** One new event, `chat-answer`, so adoption shows on
  the public dashboard. It carries no user data, like every event.

### Explaining a transformation (issue #299, point 2)

The same tool change lets the patch call carry an optional one-sentence
`summary` ("Kept the 12 rows whose Country is in Europe."). The web reply
shows it above `Executed steps:`, the CLI prints it above the debug block.
Optional and separable; see decision B.

## Contract (how it works)

One request is a short tool loop, at most 4 model steps, three tools:

| Tool | Arguments | What happens | Ends the turn |
|---|---|---|---|
| `apply_spec_patch` | `operations[]`, `summary?`, `transcript?` | unchanged: patch, validate, replay, commit | yes |
| `query_table` | `sql` | `SELECT` over `t` in DuckDB; the bounded result (or the SQL error) goes back to the model | no |
| `reply` | `text`, `transcript?` | the answer shown to the user, with the richest query's table | yes |

`toolChoice` becomes `required`; the loop stops on the first
`apply_spec_patch` or `reply`, or at step 4, which fails the request cleanly
(`Couldn't answer that after 4 attempts…`). A SQL error returns as the tool
result, so the model fixes its query inside the same budget; the patch
recovery loop is untouched. A provider that ignores `required` and answers
with bare text (a free OpenRouter model, Puter) is taken as a `reply`:
nothing breaks, and the old "LLM did not call apply_spec_patch" error goes
away. A typical question costs two chat-model calls; a self-corrected query
costs three.

Types for `code-contract.md`, sketched:

```ts
type RequestResult =
  | { kind: 'patch' }
  | { kind: 'answer'; text: string; table?: AnswerTable };
interface AnswerTable { columns: string[]; rows: unknown[][]; totalRows: number }
// RequestDebugInfo gains `answer?: string`; `expressions` carries one
// `{ label: 'query', body: sql }` per query the model ran.
// ChatMessage gains `answer?: { table?: AnswerTable }` and never a historyId;
// ChatPanelMessage gains `table?` and the marker state 'answer'.
const ANSWER_SAMPLE_ROWS = 50, ANSWER_SAMPLE_COLS = 30, ANSWER_CELL_CHARS = 120;
const ANSWER_STEPS = 4, ANSWER_CONTEXT_CHARS = 500;
```

`SqlSession` gains `query(rows, sql, signal)`: registers `t` with pending and
failed cell sentinels mapped to NULL, runs the statement, returns columns,
rows and the count. Only `SELECT` and `WITH` statements are accepted;
anything else is refused back to the model as a tool error.

### Prompt

`SYSTEM_PROMPT` in `spec/prompt-app-edit.md` gains the boundary rule, the
two tools' contracts, and few-shots for the question path: *"Which country
has the most customers?"* (one aggregate, one sentence), *"What share of
customers do the top 3 countries hold?"* (a window-function cumulative sum
over a `TRY_CAST`), *"Are there duplicate emails?"* (a yes/no with the
count), *"hello"* (a one-line reply). It also says never to use `reply` to
decline a transformation the grammar can express. The existing few-shots
stay, so *"Count customers per Country"* still teaches the group step.

Every recorded patch-turn body changes (system prompt, tool list, tool
choice), so every cassette misses: this PR re-records the suite
(`bun run test:record`). The sandbox has `GEMINI_API_KEY`, so the recording
can run here, and it doubles as the proof that existing imperative requests
still produce patches. A golden that drifts gets verified against independent
truth before either side is touched (code-contract § Recording model calls).

## Tests

New `spec/test-cases/analyze.feature` (`#Analyze`), cassette
`cassettes/analyze.json`. Assertions are structural or grounded in the
fixture, never a wording golden. `customers-input.csv` has 3 USA rows, the
clear maximum, so "USA" is a fact of the data.

- **Rule: a question gets a computed answer and the table stays.**
  `@headless @cli @web` *Which country has the most customers?*: answered,
  not applied; 0 transformations; the answer mentions `USA`; the result
  table has a `Country` column; at least one query ran and shows in the
  debug info.
- **Rule: the boundary.** `@headless` *Count customers per Country* still
  commits a `group` (the golden stays in `aggregate.feature`).
- **Rule: a greeting changes nothing.** `@headless @web` *hello*: a short
  reply, 0 transformations, no query.
- **Rule: the last answer carries into the next request.** `@headless @cli
  @web` the country question, then *Keep only customers from that country*:
  1 transformation, every row `USA`.
- **Rule: the model fixes its own SQL.** `@headless @scripted` the first
  query is invalid, the retry succeeds, the answer lands; and a scripted
  loop that never replies fails cleanly with no spec change.
- **Rule: the REPL prints the answer and leaves the journal alone.** `@cli`
  the question, then `:undo`: stdout carries `USA`, `[debug] query:`, and
  `nothing to undo.`
- **Rule: the web reply is an answer with a table and no history entry.**
  `@web` the question through `sendChat`: an answer message mentioning
  `USA` with a `Country` column, 0 history entries, 0 transformations, no
  toast, chips cleared.
- **Rule: answers spend nothing on pending rows.** `@web` the 246-row
  fixture, an AI column on page 1, then *How many business customers are
  there?*: an answer arrives, the readout still reads `100 of 246`, no
  estimate dialog.
- **Package: chat panel.** `chat-panel.feature`: an answer reply renders
  its result table and the answer marker (demo page, real browser).
- **Browser e2e.** `analyze.e2e.ts`: a scripted two-step Anthropic exchange
  against the production build; the answer renders and duckdb-wasm loaded.
  This closes the "DuckDB in the browser" concern with a test.
- **Unit.** Result bounding, sentinel-to-NULL mapping, the SELECT-only
  guard, debug `query:` lines, CLI answer rendering, prior-answer context
  assembly.
- **Adjusted.** `load-suggestions.feature`'s last step becomes "every
  suggestion ran: committed a step or returned an answer".

## Files

- Spec: `spec/behavior.md` (new `### Questions about the data (#Analyze)`
  next to `{sql}`, plus lines in Headless, CLI REPL and `:help`, Web UI,
  Narrow viewport, System prompts, Load suggestions, Lazy),
  `spec/code-contract.md` (mirror), `spec/prompt-app-edit.md`,
  `spec/packages/chat-panel/behavior.md`, `MAP.md` row, `README.md` intro.
- Code: `headless/index.ts` and `sql.ts` (loop, tools, bounds, result),
  `cli/session.ts` and `help.ts`, `web/src/controller*.ts`,
  `chat-panel/ChatPanel.tsx`, `StatusDot.tsx` and the demo,
  `mobile/sheets.tsx` and `MobileShell.tsx`, `web/src/analytics.ts`.
- Tests: `analyze.feature`, `src/tests/analyze.steps.ts`, chat-panel demo
  steps, `analyze.e2e.ts`, the unit tests above, re-recorded cassettes.

Rough size: about 1,500 lines of diff plus the re-recorded cassettes.

## Decisions for the maintainer

- **A. The boundary rule**: imperative means a step, a question means an
  answer, `?` breaks ties. Confirm the wording.
- **B. The optional `summary` on patches** (issue #299, point 2).
  Recommended: yes, it is small and rides on the same tool change.
- **C. Let the suggester propose one question.** Recommended: yes.
- **D. Cassettes**: a full re-record here (recommended), or extend
  `cassettes:rekey` to splice the new tools and re-record only `analyze`.
  Faster, but the tape would claim the model saw a prompt it never saw, and
  it would not prove that old requests still patch.
- **E. Carry the last answer into the next request** (at most 500
  characters). Recommended: yes; without it every follow-up must repeat the
  values.
- **F. Phone**: a bottom sheet for answers (recommended) or a banner.
- **G. Names**: `#Analyze`, `query_table`, `reply`, `analyze.feature`.

## Later, not this PR

- A showcase tour and homepage section ("Understand it, then tame it"),
  once the cassette exists and the copy is written.
- "Apply as a step" on an answer's result table (turn the query into a
  `group` or `filter` transformation).
- `{js}` queries for nested cells, per-row AI analysis at scale, charts.

## Decisions taken (2026-09-13)

- A: the boundary rule as written above.
- B: the optional one-sentence `summary` on patches is in.
- C: the suggester proposes exactly one question, always last in its list,
  so a "run suggestion 1" still commits a step.
- D: full cassette re-record.
- E: the last answer carries into the next request.
- F: on the phone, an answer shows in a strip above the dock, where the
  suggestion chips sit: the text plus at most three rows of the result
  table, dismissable. Same slot, no new sheet.
- G: names as proposed.
- I: flow replay and Python export are untouched; answers never enter the
  spec.
- J: a homepage section **Analyze**, third, after Clean up, with its own
  showcase tour (`showcase-analyze.feature`) over `showcase-exact-input.csv`:
  four questions, no step: the top-3 revenue share, the fastest-growing
  customer, the customer at risk, the duplicate rows. Trivial counts and
  maxima were dropped: a spreadsheet answers those already.

## Step 4 notes (implementation and recording)

- The suite is green offline: 477 unit tests, 348 headless, 155 CLI, and
  387 web scenarios, every tape re-recorded under the new chat turn.
- The query result's bytes go back to the model, so they key the next
  cassette entry. DuckDB's parallel aggregation returned tied rows in a
  different order run to run, which made a replay miss. A query-tool read
  now runs single-threaded, a result whose query has no `ORDER BY` is
  sorted canonically, and the prompt asks for a tie-breaker on every
  `ORDER BY`.
- The answer's table is the query result with the most rows (the later one
  on a tie), so a closing sanity total never hides the grouped rows.
- Two goldens drifted under fresh recordings. The model rewrote "men,
  women" to "man, woman" twice in a row: fixed at the cause with the
  prompt rule *Use the user's labels*, spliced into the tapes with
  `cassettes:rekey`, and the classify tour recorded fresh. The review
  summaries changed wording: `language-summarize-expected.jsonl` carries
  the new sentences, a golden change to review.
- `bun run test:record` hung in the web profile on `tutorial.feature`
  (record mode only; it replays fine). The web tapes were recorded one
  feature at a time with a cap per feature. Worth a look before the next
  full re-record.
- `performance.json` is outside `test:record`; the offline benchmark needs
  `bun run bench:record` before it replays again.
- The step budget (4 model steps) was hit exactly by the tour's growth
  question (three queries and the reply). It worked, but the headroom is
  thin; raising `ANSWER_STEPS` needs no re-record, only the prompt's
  "at most 3" would.

## Review round (2026-09-14)

- The phone's answer strip drops its three-row cap: it shows every result
  row the model saw in the typing box's font size and scrolls inside its
  fixed height. Decision F above stands for the placement, not the cap.
- A message that asks for a change and a question at once ("Normalize the
  Country names. Which country has the most customers?") is a request:
  the answer would depend on the changed data, so the change lands and
  the summary ends with the question quoted. One prompt rule, one
  scenario; the tapes were re-keyed and `analyze` recorded fresh. The
  greeting reply came back as three sentences, which the prompt allows,
  so the scenario's bound is three.
