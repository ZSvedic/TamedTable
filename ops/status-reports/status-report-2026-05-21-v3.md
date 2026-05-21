# V3 — Status Report

**Date:** 2026-05-21

This report covers the V3 work: the five items the spec parked in its
`## V3` section after the V2.5 consolidation. The same spec-anchored,
red-green order was used — the V3 scenarios were run red first, then the
engine code was written until they turned green. V4 (the browser UI) was
not touched.

> **Correction.** An earlier draft of this report claimed the project's
> `ANTHROPIC_API_KEY` was empty and that three features therefore could
> not be verified. That was wrong — it came from a faulty shell command
> that printed only a variable name, not its value. The key is present
> and valid. The recordings were made and the features verified; this
> report supersedes that draft.

## The short version

V3 adds real new engine machinery rather than tidy-ups. All five V3
features are built. Four of the five are verified green by the test
suite — top-N sort, the `:reorder` command, AI-backed column split, and
SQL aggregates inside `group`. The fifth — stopping a SQL query on
Ctrl-C — has its engine code in place, but its four test scenarios still
need step definitions and a deterministic "slow query" fixture before
they can run; that is the one piece of V3 still open.

Nothing regressed: every test that passed before still passes, plus the
new ones.

## What shipped

**Top-N sort.** A `sort` can now carry a `limit`. Ask for "the top 10 by
revenue" and the sort returns only the first N rows after ordering — no
manual row deletion. `limit` is a new optional, positive-integer field
on the `sort` transformation; nothing else about sort changed.

**Reorder columns from the REPL.** A new `:reorder` command takes a
comma- or space-separated column list. The named columns move to the
front in that order; columns you didn't name keep their order behind
them. The new order drives both the on-screen table and the column
order of a saved CSV or JSONL file. This keeps column order out of the
spec's wire format — it is a view/output concern, handled like
`:viewport`.

**Split a column with the AI.** The `split` transformation already
accepted an AI-backed separator in its grammar, but the engine threw
"not yet implemented" the moment it saw one. The split path is now
asynchronous: an AI separator renders a prompt per row, asks the cell
model to break the cell into parts, and pads or concatenates those
parts to the requested column count exactly as a literal or regex
split does. An empty input cell still yields `null` in every output
column, unchanged.

**SQL aggregates inside `group`.** A `{sql}` aggregate in `group` used
to hit an explicit guard and fail. Now each group's rows are handed to
DuckDB as a relation named `g` and the SQL aggregate runs against them
— so a SQL aggregate works alongside the JavaScript and AI aggregates
that already did.

**Stop a SQL query on Ctrl-C.** Before V3, cancelling a request only
stopped AI calls; a DuckDB query kept running after the cancel
returned. Now, when a request is cancelled while a SQL query is in
flight, the runtime asks DuckDB to abort that query
(`conn.interrupt()`) and reports the cancellation the same way an
AI-call cancel does. The half-applied transformation rolls back; the
DuckDB table stays registered for the next request. The engine code is
in place — see "What's left" for the test gap.

## What is verified

Four of the five features are proven by passing tests:

- *Top-N sort* — a new offline scenario replays a saved flow whose sort
  carries `limit: 2` and confirms only the top two rows come out.
- *`:reorder`* — a new offline scenario reorders columns in the REPL,
  saves a CSV, and checks the header row is in the new order.
- *AI-backed split* — the existing scenario, which was red before V3,
  now passes. Its model responses were recorded into the test cassette,
  so it replays offline like every other AI-driven test. (Its
  assertion was also corrected to skip the fixture's deliberately
  empty-name row, the same fixture-sharing fix V2.5 made for the
  literal-split scenario.)
- *SQL aggregate in `group`* — its scenario passes, and the new SQL
  aggregate path is in the engine for any flow whose model emits one.

## Verification

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | clean |
| Unit tests (`bun test`) | 50 / 50 pass |
| Full suite, CLI profile | 56 / 63 pass |
| Full suite, headless profile | 44 / 51 pass |
| New: top-N sort scenario | 1 / 1 pass |
| New: `:reorder` scenario | 1 / 1 pass |
| AI-backed split scenario | 1 / 1 pass (was red) |

The seven still-red CLI scenarios are:

- **1 failed** — a pre-existing V2 SQL test that fails on a mixed-date
  fixture. V2.5 explicitly placed this out of scope; it is not V3 work.
- **6 undefined** — the four SQL-cancellation scenarios (see below) and
  two older V2 SQL scenarios whose step definitions were never written.

## What's left

One V3 item remains open: the **SQL-cancellation test scenarios**. The
engine behaviour is built and the cancel wiring is in place, but the
four scenarios in `sql.feature` cannot run yet because they need:

1. Step definitions for their phrases (`… via SQL`, `… cancels while the
   SQL query is in flight`, and so on) — none exist today.
2. A deterministic slow-query fixture. A model-generated aggregate over
   a 20-row table finishes in microseconds, leaving no in-flight window
   to cancel. The scenarios themselves describe a *contrived* slow
   query — so the test harness needs a way to inject one, including the
   "ignores interrupt for 5 seconds" case.

This is test-harness work, not engine work, and it carries a design
choice (how to inject the contrived query) worth agreeing on before
building it.

Also minor, for a later pass: the spec's `## V3` section is still
written in roadmap tense and could be re-worded to "shipped" now that
the engine matches it. The `:help` screen and its command list were
already updated in this round.
