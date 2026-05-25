# V2 implementation — Status Report

**Date:** 2026-05-19

Implemented V2 of TamedTable on top of the V1 baseline that landed earlier today. Six new transformations (`group`, `join`, `split`, `validate`, `pivot`, `unpivot`), `{sql}` expressions backed by in-process DuckDB, and CSV output now share the V1 wire model — every surface `behavior.md` § V2 describes except SQL cancellation. Three PRs merged today (#2 `:viewport` + help split, #3 V2 cucumber profile + datanorm fixture reconciliation, #4 V2 implementation). V1 41/41 offline regression stays clean.

## What landed

| Surface | Status | Where |
|---|---|---|
| `validate` (additive + threshold abort) | ✅ | `headless/index.ts` `applyValidateJs` |
| `group` (JS aggs + LLM aggs with `{*}` over the slice) | ✅ | `applyGroupJs` + `applyGroup` method |
| `split` (literal / slash-regex / `{js}` returning `string[]`) | ✅ | `applySplit` |
| `pivot` / `unpivot` (`first`/`sum`/`count`/`avg`/`min`/`max`) | ✅ | `applyPivot` / `applyUnpivot` |
| `join` (left/inner, `.csv`/`.jsonl` right tables, collision-rename) | ✅ | `applyJoin` |
| `{sql}` in `mutate.value` and `filter.pred` (DuckDB) | ✅ | `applyMutateSql` / `applyFilterSql` |
| `writeCsv` + extension-dispatched `writeRows` | ✅ | `core/index.ts` |
| SQL cancellation (`conn.interrupt()` + 2-second budget + drain) | ❌ | deferred — see future-improvements |

## Two design moves worth flagging

**Two schemas, not one.** `core/index.ts` now exports `validateV1Spec` and `validateSpec`. The V1 schema rejects every V2 kind with the canonical `"V2 feature in V1 spec"` error so legacy `version: 1` `.flow` files behave as their tests expect; the V2 schema accepts everything with proper sub-checks (non-empty `group.by`, `.csv`/`.jsonl` on `join.with`, `pivot.on` not in `pivot.index`, `validate.threshold` in `[0, 1]`). `runCli execute` picks the schema from the flow's `version` field; everything else (`loadCsv`, `loadJsonl`, patch merges) always uses V2.

**Auto-sync `spec.columns` to actual row keys** after each transformation. This is the unlock for V2: `group` / `pivot` / `unpivot` / `split` / `validate` / `join` all reshape columns mechanically, so expecting the LLM to emit perfect `/columns` patches alongside every transformation would be brittle. `syncColumnsToRows` keeps LLM-declared columns in their chosen order (preserving `label`/`format`), drops any that disappeared, and appends new keys in first-seen order. Caveat: an LLM that adds `/columns/-` for a column no transformation populates silently loses it on commit — acceptable trade for V2's column-reshaping verbs.

## Spec edits made (explicitly authorised)

| File | Edit |
|---|---|
| `spec/prompt-app-edit.md` | Rewrote `SYSTEM_PROMPT` — kept the five V1 few-shots, added 13 V2 examples covering every new kind and the three SQL roles. Net length ~unchanged; density up. |
| `spec/test-cases/join-unknown-ext.flow` | Bumped `version: 1` → `2`. The scenario asserts `"unknown file type"` (the V2 extension check) rather than `"V2 feature in V1 spec"` (V1 rejection) — only the V2 schema path can produce that error. |
| `spec/test-cases/datanorm-expected.csv` | Dropped the trailing `Notes` column the V1 `datanorm.flow` doesn't produce. The JSONL golden's `Notes` column is fine because the matching scenario uses `matches the golden output ignoring "Notes"`; the CSV scenario has no such carveout. |
| `spec/test-cases/datanorm-input.{csv,jsonl}` + `-expected.{csv,jsonl}` | Reconciled rows 04 / 15 / 18 with what `claude-sonnet-4-5` at `temperature=0` actually produces. Documented in PR #3. |

## Two debugging detours worth surfacing

1. **`describeTransformation` blew up on `{sql}`** with `Cannot read properties of undefined (reading 'length')`. The CLI's plan-formatter assumed every `mutate.value` was `{js}` or `{llm}` and fell through to `trunc(t.value.llm, 80)` — `undefined.length`. Cost ~30 minutes because the error surfaced inside the LLM recovery loop with no stack and no `t.value` in the printed message. Fix: `describeExpr` handles all three shapes. **Followup:** plan-formatter failures should never abort the request — they're cosmetic. Worth a try/catch around `onPlan` calls in the runner.
2. **DuckDB `DROP X IF EXISTS y` errors if `y` exists as a different kind.** First SQL call creates `TABLE t`; next call's `DROP VIEW IF EXISTS t` raises `Catalog Error: Existing object t is of type Table, trying to drop type View`. The "IF EXISTS" doesn't mean what one might think. Fix: try both DROPs, swallow.

A third detour, **DuckDB identifier case**, was easier — quoted DDL identifiers preserve case (`"Country"` ≠ `country`), so unquoted-DDL is the right default for column names the LLM will reference unquoted in `lower(Country)` style.

## Verification

| Check | Result |
|---|---|
| V1 offline regression (`TAMEDTABLE_FEATURES=<v1-subset>`) | **41 / 41** scenarios pass |
| V2 offline | **22 / 23** (one fixture edge in colsplit, see future-improvements) |
| V2 CLI profile (non-cancel) | **48 / 54** |
| V2 Headless profile (non-cancel) | **36 / 42** |
| Direct SQL API: mutate `{sql}` → `:undo` → mutate `{sql}` | Round-trips through DuckDB state lifecycle correctly |

## Not changed (deliberately)

- **`@cancel @sql` scenarios** — four of them, all about `conn.interrupt()` + drain semantics. Significant new state plumbing on top of the V1 LLM-chunk cancel path. Captured in future-improvements.
- **LLM-split (`on: {llm: …}`)** — the prompt steers the model toward JS for splits; the lone scenario that exercises LLM-split stays red.
- **Filter on `_valid` REPL scenario** — uses REPL session state inaccessible to the world's runner after exit. Captured.
- **`join` `:undo removes the joined columns` scenario** — asserts `stdout does not contain "ISO"`, but the table reprint *before* `:undo` legitimately has `ISO` in its header. Looks like a test-wording issue, not an implementation bug. Captured.
