# Backlog triage — Status Report

**Date:** 2026-05-20

This report walks the [2026-05-19 future-improvements backlog](future-improvements-2026-05-19.md) item by item, in plain English: what each item actually means, the decision made, and answers to the questions raised. It also adds one new feature, `:save-py`. "V2.5" below means the next batch of small fixes before V3 starts.

## Decisions at a glance

| # | Plain name | Disposition |
|---|---|---|
| 0 | Collapse two schemas into one V2 schema | V2.5 |
| 1 | Stop a running SQL query on Ctrl-C | V3 |
| 2 | Split a column using the AI | V3 |
| 3 | SQL aggregates inside `group` | V3 |
| 4 | Sort by a SQL or AI key | V2.5 (bug fix) |
| 5 | colsplit empty-row test conflict | **Open — your call** |
| 6 | Unsatisfiable join-undo test assertion | V2.5 |
| 7 | Validate REPL tests can't see results | V2.5 |
| 8 | `@offline` tag on tests that call the AI | V2.5 |
| 9 | A formatter crash killed the whole request | V2.5 |
| 10 | Rename leftover "slash" symbols | V2.5 |
| 11 | Remove leftover debug prints | V2.5 |
| — | `:save-py` — compile a flow to standalone Python | V2.5 (new) |
| — | Web UI | V3 |
| — | Top-N sort | V3 |
| — | Easier "is empty" checks | V3 |
| — | One model default per file | V3 |
| — | CSV column order | V3 |

## Schema: one, not two (item 0)

TamedTable keeps two rule-checkers — a V1 one that rejects every new feature and a V2 one that allows them. You have no real V1 files to protect, so the V1 checker is dead weight.

**Decision:** delete the V1 schema, use the V2 schema everywhere, and convert the 9 `version: 1` test `.flow` files to `version: 2`.

**Work:** small. Delete roughly 70 lines from `core/index.ts` (the V1 schema plus `validateV1Spec`), drop the one-line version switch in the CLI, and bump the 9 `.flow` files. Six test scenarios exist only to check that V1 rejects a V2 feature ("a V1 flow using `group` fails", and similar) — those get deleted too, since the behavior they test no longer exists. V2 already accepts everything V1 did, so nothing real breaks.

## Doing in V2.5

These are the small, clear wins — bug fixes, test corrections, and cleanups — to land before V3 starts.

**Item 4 — Sort by a SQL or AI key (bug).** You asked why it never runs. The sort code assumes every sort key is JavaScript: it takes whatever you give it and compiles it as JS. Hand it a `{sql}` or `{llm}` key and it tries to run SQL or prompt text as JavaScript — it breaks or produces garbage, silently. The schema says these keys are allowed, so this is a real bug, not a missing feature. **Decision:** fix it in V2.5 — `sort` should evaluate SQL/AI keys the same way `mutate` already does. A sort key is one value per row, exactly like `mutate.value`, so the machinery already exists.

**Item 6 — join-undo test.** The test runs a join, undoes it, then checks the word "ISO" appears nowhere in the output. That can never pass: the join prints a table *before* the undo, and that table correctly contains "ISO". You agreed. **Decision:** change the assertion to check only the final table reprint, not the whole output history.

**Item 7 — validate REPL tests can't see results.** Two tests run a REPL session, then try to read per-row values — but the session's data is gone once it exits. You left the call to me. **Decision:** option (a) — add a `:save` line to each scenario and have the test read the saved file. Reason: the test harness already reads JSONL files, so this needs no new harness code; rewriting the scenarios is more work, and `:save` is what a real user would do anyway.

**Item 8 — `@offline` tag.** The tag means "no API key needed", but three tagged tests actually call the AI. The full list:

| File:line | Scenario | Why it calls the AI |
|---|---|---|
| `join.feature:46` | join.with with `.jsonl` loads as JSONL | `user requests "Join with …"` |
| `sql.feature:41` | SQL sees the latest committed rows after `:undo` | REPL with a natural-language request |
| `sql.feature:54` | Reloading input resets the DuckDB relation | REPL with natural-language requests |

**Decision:** drop `@offline` from those three — they need an API key.

**Item 9 — a formatter crash killed the whole request.** You asked how a print can crash the program. The plan printer — the code that turns a transformation into a readable line like `apply: filter rows where …` — is called through a callback, and that callback has no error handling around it. When the formatter hit a value it didn't expect and threw, the exception had nowhere to land locally, so it travelled up into the request's main error handler, which treats *any* exception as "the request failed." A cosmetic formatting bug surfaced to you as "couldn't apply that change." **Decision:** wrap the plan-print callback in try/catch — a formatter bug should drop a plan line, never fail the request.

**Item 10 — rename "slash" symbols.** REPL commands start with `:` now, but internal names still say "slash" (`handleSlashCommand`, `slash.test.ts`, and similar). You agreed. **Decision:** rename for consistency — pure cleanup, no behavior change.

**Item 11 — leftover debug prints.** A couple of `console.log` debug lines may linger from V2 work. You agreed. **Decision:** grep and confirm none are present before the next push.

## New in V2.5: `:save-py`

A new REPL command, `:save-py {filename}`, asks the AI once to write a standalone Python script that reproduces the current sequence of transformations. The script runs deterministically — no AI calls at run time. Output is a single Python file: a py3 shebang, and uv / PEP 723 inline dependency metadata in the top comment, so `uv run script.py` just works.

Two ways to build it, sharing one generator:
- **REPL command** — `:save-py out.py` generates from the live session's transformation list.
- **CLI compile command** — `tamedtable compile flow.flow out.py` generates from a saved `.flow` file. This is the same generator pointed at a file instead of a session.

**Open design question before implementation:** a `.flow` can contain `{llm}` cells, which are non-deterministic by nature. A deterministic Python export can faithfully reproduce `{js}`, `{sql}`, `filter`, `sort`, `group`, and the rest — but not a live AI call. Three ways to handle `{llm}` cells: emit a clearly-marked stub, restrict `:save-py` to flows with no `{llm}` cells, or have the script keep the AI call but flag it. Worth deciding before building.

## Deferred to V3

These need real new machinery, or are bigger than the next milestone warrants.

**Item 1 — SQL cancellation.** You asked how big the work is. Medium — roughly 100–150 lines — but the line count isn't the hard part. It is timing-sensitive state-machine work: track a query that is still draining after cancel, race DuckDB's interrupt against a 2-second timer, and block the next request until the old query finishes. Today's cancel path only knows how to stop AI calls, not "work that keeps running after the cancel returns." **Decision:** defer to V3. It is the riskiest item per unit of value, which matches your instinct to postpone the hard cancellation work.

**Item 2 — LLM-split.** You asked why it doesn't work and guessed V3 — correct. It is not implemented at all: the split code handles literal, regex, and JavaScript separators, then throws "LLM separators not yet implemented" for the AI case. The split function is synchronous and has no way to make an AI call. **Decision:** V3.

**Item 3 — `group` with SQL aggregates.** You asked why it crashes. It is not a bug — it is an honest guard: the group code sees a `{sql}` aggregate and deliberately throws "requires V2 SQL surface (not yet implemented)". Making it work means running a real `GROUP BY` per group through DuckDB. **Decision:** V3.

**Web UI.** A browser version — chat sidebar plus table view, on the existing engine. You said yes, web in V3. **Decision:** V3.

**Top-N sort.** You asked what is wrong with normal sort. Nothing is wrong — it just cannot keep "only the top 10". Normal `sort` returns every row, ordered. There is no `head`, `limit`, or `take`, and `filter` only tests row content, never row position. So "top 10 by revenue" is impossible today without manually deleting rows from the output file. `sort.feature` is currently a one-line TODO. **Decision:** V3 — add a `limit` to `sort`, or a separate `take` transformation.

**Easier "is empty" checks.** You asked for an explanation. `validate` keeps a row when its predicate is true. To check "Notes is empty" you write the predicate `!row.Notes` — literally "validate that NOT Notes has a value." It works fine; it just reads as a double negative. The idea is a `negate` flag (or an `invalidate` twin) so the common "check that X is blank or missing" reads forward instead of inside-out. **Decision:** V3, low priority.

**One model default per file.** You asked what "each AI cell picks its own model" means, and whether env vars set defaults. The real picture has three layers:
1. Env var `TAMEDTABLE_CELL_MODEL` sets the default for AI cells (falls back to `claude-sonnet-4-5` if unset). A separate `TAMEDTABLE_MODEL` sets the model that interprets your requests (falls back to `claude-sonnet-4-6`).
2. Your `.env` currently sets neither — it holds only the API key — so today everything uses those built-in defaults.
3. Any single `{llm}` cell in a `.flow` *may* carry an optional `model` field that overrides the default for that one cell.

So "each AI cell picks its own model" really means "each cell *may* override; otherwise the env default applies." The proposal adds a middle layer: a model set once at the top of a `.flow`, so one file can pin its model without an env var and without editing every cell. **Decision:** V3.

**CSV column order.** Today CSV output columns follow the spec's column order — that is the only handle. You want this driven by a `:` command instead. **Decision:** V3 — expose column order through a REPL `:` command (an option on `:save`, or a dedicated reorder command) rather than a new spec field.

## Open — needs your decision

**Item 5 — colsplit empty-row conflict.** Two tests share one data file and want opposite things from its empty-name row. The file `colsplit-fullname-input.csv`:

```
ID,FullName
1,Ada Lovelace
2,Charles Babbage
3,Cher
4,Mary Jane Watson
5,                       <- empty FullName
6,Carlos María García
7,François-Henri d'Estienne
```

The conflict, both scenarios in `colsplit.feature`:
- *"Split FullName into FirstName and LastName on space"* asserts **every row has a non-null FirstName** — row 5 breaks this.
- *"An empty input cell produces nulls in every output column"* asserts **row 5's FirstName is null** — needs row 5 to exist.

Your two options:
- **(a)** Split into two files: `colsplit-fullname-input.csv` with no empty row, plus `colsplit-fullname-with-empty-input.csv` with one. Each test gets the data it needs. (This is what the backlog recommended.)
- **(b)** Keep one file and weaken the first test to "every *non-empty* row has a non-null FirstName".

Tell me which you want and I'll make the change.
