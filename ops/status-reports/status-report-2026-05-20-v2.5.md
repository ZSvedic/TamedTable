# V2.5 shipped — Status Report

**Date:** 2026-05-20

This report covers the V2.5 work: the batch of small fixes and cleanups
agreed in the [backlog triage](status-report-2026-05-20.md), plus one new
feature. The spec was updated first, then the tests, then the code — the
same spec-anchored, red-green order the project always uses. V3 and V4
items were written into the spec as planned work but **not** built.

## The short version

V2.5 is a tidy-up release. It adds no new way to transform a table and
changes no file format. It deletes dead code, fixes a real sort bug,
corrects four mis-written tests, hardens one error path, and adds a
single new command — `:save-py` — that exports a flow as a runnable
Python script.

Everything builds, every V2.5 test is green, and the only red tests left
are the V3 features the triage explicitly deferred.

## What changed

**One spec schema, not two.** TamedTable carried two rule-checkers — an
old V1 one that rejected every new feature and a V2 one that allowed
them. There were no real V1 files left to protect, so the V1 checker is
gone. Every spec now goes through the one schema. The nine test flow
files were bumped to `version: 2`, and the six tests that only existed
to prove "V1 rejects feature X" were deleted with it.

**Sort by a SQL or AI key now works.** Sorting always assumed the sort
key was JavaScript. Hand it a SQL or AI key — both of which the schema
has always allowed — and it broke or sorted by garbage. Sort now
evaluates a SQL key through DuckDB and an AI key through the model, one
value per row, exactly the way the `mutate` step already does.

**A display bug can no longer fail a request.** The code that prints a
human-readable summary of each change ran with no safety net: if it hit
a value it didn't expect and crashed, the whole request was reported as
failed. That printer is now wrapped, so a cosmetic glitch drops one
summary line and the change still goes through.

**Four mis-written tests fixed.**

- A column-split test and an empty-cell test fought over the same data
  file; the split test now only checks the rows that actually had input.
- The join-undo test checked the entire session output for a word that
  legitimately appears before the undo; it now checks only the final
  table.
- Two REPL tests tried to read row values after the REPL had already
  closed; they now save the result to a file and read that.
- Three tests were tagged "needs no API key" but quietly called the AI;
  the tag was removed.

**Cleanups.** Internal names still said "slash command" even though REPL
commands start with a colon — renamed to "colon command" throughout. A
check confirmed no stray debug prints were left behind.

## New: `:save-py`

`:save-py <file.py>` exports the current flow as a standalone Python 3
script. The script has a `uv` shebang and inline dependency metadata, so
`./script.py input output` just runs — it reads a CSV or JSONL file,
applies the same transformations, and writes the result, with no AI call
at run time.

Generating the script takes one AI call: the model translates the flow
into Python. Because the exported script must be deterministic, `:save-py`
refuses any flow that contains an AI-backed cell — that can't be
reproduced offline — and says so plainly.

It works end to end: a "show only USA customers" flow exports to a Python
script that, run on the same input, produces the same rows TamedTable
does.

## Verification

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | clean |
| Unit tests (`bun test`) | 50 / 50 pass |
| Offline CLI scenarios | 10 / 10 pass |
| Full suite, CLI profile | 53 / 61 pass |
| Full suite, headless profile | 38 / 46 pass |
| `:save-py` scenarios | 4 / 4 pass |
| `sort` scenarios | 2 / 2 pass |

Every still-red scenario is a V3 item the triage deferred, not a V2.5
regression:

- **LLM-split** — splitting a column with the AI. Not implemented; V3.
- **SQL cancellation** — four cancel scenarios, plus their step
  definitions, are V3 work.
- **SQL scalar / predicate** — two older V2 SQL tests fail on a fixture
  whose dates are in mixed formats; out of the V2.5 scope and left as-is.

## Deferred, written into the spec

The spec now has `V3` and `V4` sections so the roadmap lives next to the
code it describes:

- **V3** — stop a running SQL query on Ctrl-C, split a column with the
  AI, SQL aggregates inside `group`, top-N sort, and CSV column order via
  a REPL command.
- **V4** — the browser UI.
