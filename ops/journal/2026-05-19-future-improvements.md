# Future improvements — backlog as of 2026-05-19

What's deferred, what's a known inconsistency, what's a hygiene-only cleanup. Companion to `status-report-2026-05-19.md`; same conventions (one section per item, table for paired info).

## V2 follow-ups

### 1. SQL cancellation

Four `@cancel @sql` scenarios in `sql.feature` stay red. The contract:

1. On `AbortSignal` abort, call `conn.interrupt()`.
2. Stop within a 2-second budget; the cancel signal returns even if the query doesn't.
3. A second request started immediately throws `"request already running"` until the lingering query drains.
4. DuckDB relation `t` stays registered after cancel — only the half-applied transformation reverts.

Required code shape: the runner holds the in-flight DuckDB query promise; the abort handler races `conn.interrupt()` against a 2-second timer; `Runner.busy` stays `true` until the query promise settles (success, cancelled, or error). The V1 LLM-chunk cancel path doesn't model "lingering work after cancel signal returns" — adding it cleanly likely means a separate `inFlight` promise on the runner that the next `request()` awaits.

One real-world wrinkle the `A SQL query that ignores interrupt drains within the next request` scenario tests: a contrived query that *ignores* `conn.interrupt()` for 5s. The cancel signal must still return in 2s; the drain blocks the next request, not the cancel. That's the part the V1 cancel path can't express today.

### 2. LLM-split

`Split with an LLM expression returning an array of parts` (`colsplit.feature:64`) needs `applySplit` to accept `on: {llm: <template>}` and render per row through the cell model, parsing the reply as a JSON array of strings. The current prompt steers the LLM toward `{js}` for splits, so the failure mode is "model doesn't reach for the LLM shape at all." Add a few-shot the moment the runtime supports it.

### 3. `group` with `{sql}` aggregates

`group.agg` with `{sql:"avg(length(Phone))"}` parses against the V2 schema but `applyGroupJs` throws `group: {sql} aggregates require V2 SQL surface (not yet implemented)`. Wiring: register each group's slice as a separate temp relation (or `t WHERE <by-tuple>` filter) and run the aggregate. One scenario in `sql.feature` (`SQL aggregate inside group`) exercises this.

### 4. `sort.by[].key` with `{sql}` or `{llm}`

Same story — schema accepts, evaluator doesn't. Cleaner than (3) because sort.by needs only a scalar per row, same as `mutate.value`. Easy follow-up.

## Test/fixture inconsistencies needing SCRIBE

### 5. colsplit "every row has non-null FirstName" vs the empty-FullName row

`colsplit-fullname-input.csv` has row `5,` (empty FullName). Two scenarios on the same fixture pull in opposite directions:

| Scenario | Expects |
|---|---|
| `Split FullName into FirstName and LastName on space` | `every row has a non-null "FirstName"` |
| `An empty input cell produces nulls in every output column` | row 5's `FirstName` is `null` |

Currently the step def skips rows whose source FullName is empty so the first scenario passes — but that's a workaround. Cleanest fix: split the fixture into `colsplit-fullname-input.csv` (no empty row) for the first scenario and a separate `colsplit-fullname-with-empty-input.csv` for the second. SCRIBE-worthy.

### 6. join `:undo` "stdout does not contain ISO" assertion

`join.feature :undo removes the joined columns` runs a join (which prints a table containing `ISO`) then `:undo`, then asserts the *whole* `stdout` does not contain `"ISO"`. No correct implementation can satisfy this — the pre-undo reprint legitimately contains ISO. Fix by changing the assertion to `the last REPL table reprint does not contain "ISO"` (an existing step that scans only the final reprint). SCRIBE-worthy.

### 7. Validate REPL scenarios assume access to the post-session runner

`filter on _valid keeps only passing rows` and `A second validate replaces the prior _valid and _validation` use `user enters the REPL with … and types: …`, then assert per-row column values via `every remaining row has _valid equal to true`. But the REPL session's runner is private to `runCli`; the world's runner has no input loaded. Either the scenarios need a `:save ../temp/out.jsonl` line and the assertion needs to read that file, or the test harness needs to surface the REPL's final committed state. Soft-SCRIBE: easier to patch the scenarios.

### 8. The `@offline` tag is overloaded

`@offline` historically meant "no API key needed." Several V2 scenarios are tagged `@offline` but use `user requests "…"` or `user enters the REPL with … and types: <NL>` — both of which hit the LLM. The tag now means something closer to "the scenario itself doesn't need a network round-trip" *or* "this scenario is part of a stable subset I'm willing to run." Worth a SCRIBE pass to either re-tag the LLM-driven ones or rename the tag (`@stable`? `@deterministic`?).

## Codebase hygiene

### 9. Plan-formatter failures should not abort the request

The `describeTransformation` SQL bug bit hard because a cosmetic formatter threw, the throw propagated through `onPlan?.(plan)`, through the LLM recovery loop, and surfaced as an opaque `Cannot read properties of undefined (reading 'length')` user-facing error. The runner's request loop should `try`/`catch` around `onPlan` calls so plan-printing bugs only print degraded plan lines, never abort the commit.

### 10. `slash.test.ts` naming and internal symbols

Flagged in `status-report-2026-05-15.md`: `handleSlashCommand`, `SlashHandler`, `SLASH`, `slash.test.ts` are leftover names from the `/` REPL prefix. User-facing surface is `:` everywhere; the internals could rename in a pure-hygiene pass.

### 11. `console.log` debug crumbs

Two left in `headless/index.ts` during the V2 debug — `process.stdout.write(\`DEBUG…\`)` patterns. Already removed before commit but worth a grep before the next push.

## V3 ideas (not yet specced)

- **Web UI** — partially described in `behavior.md` § V2 (chat sidebar + table view via the existing `Runner`); spec-complete but no implementation yet. Vite + React; ships static.
- **`sort.feature` top-N** — file exists as a 1-line TODO. A `sort` with `limit?: number` or a new `take`/`top-N` transformation would cover it.
- **`{js}` filter inversion semantics for `validate`** — currently `validate.pred` returns truthy = passing. A common request is "validate that X is empty" → predicate is `!row.X`. Easy to express but maybe worth a `negate?: boolean` for readability, or a counterpart `invalidate` kind for symmetry.
- **Per-spec `model` override at the spec level**, not just per `{llm}` Expr. The spec already supports per-Expr `model?`; lifting it to a spec-level default would let a `.flow` pin the model used for every LLM cell call without rewriting each Expr.
- **`Runner.exportAs` should accept a `columnOrder` override** for users who want CSV output ordered differently from `spec.columns`. Today the spec column order is the only handle.
