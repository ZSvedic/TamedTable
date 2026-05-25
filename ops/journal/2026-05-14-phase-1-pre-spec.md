> Frozen planning record. Links to `spec/data-model.md` below were live when
> this phase ran; phase 5 consolidated that content into
> [spec/behavior.md → Data model](../../spec/behavior.md#data-model) and
> [spec/code-contract.md → Data model](../../spec/code-contract.md#data-model).

## Open Questions

The plan is to first develop a CLI app in order to use less tokens and to iterate faster. 
Questions:

 1. Q: Is it better to develop an interactive TTY app, or a simple stdin/stdout app?  
    TTY would be more like a GUI app, while stdin/stdout app would be simpler and faster to iterate.  

    A: stdin/stdout REPL.  
    Cheap tokens, fast iteration, trivial to drive from Gherkin scenarios via piped input.  
    Cell editing, scrolling, and column changes are not replicated as TUI interactions — they become spec patches driven by natural language, matching the `(spec, row_stream)` wire in [data-model.md](../../spec/data-model.md).  
    The transport is additive: a TTY or web renderer can be layered on the same protocol later.  
    See [Q1 details](#q1--stdinstdout-best-practices).  
    
 2. Q: Which library should be used for text input/output?  

    A: TypeScript stack.  
    Input: `node:readline/promises` (stdlib, history + editing, zero deps).  
    LLM: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — start with Anthropic native for prompt caching; swap in `@ai-sdk/openai` or `@openrouter/ai-sdk-provider` later with a one-line model change.  
    Spec edits: `fast-json-patch` (RFC 6902); JSON Merge Patch hand-rolled (~20 lines).  
    CSV I/O: `csv-parse` / `csv-stringify`; table rendering hand-rolled (~30 lines `padEnd`); validation via `zod` (transitive via `ai`); DuckDB deferred until row counts justify it.  
    Verified footprint: **5 direct deps, 11 total packages, 25 MB**.  
    See [Q2 details](#q2--mvp-typescript-stack).  

 3. Q: Should test-cases in Gherkin `.feature` files be separate for headless/CLI/web, or one Scenario can cover multiple?  
    Headless testing probably needs a separate Scenario, because specific API calls are made.  
    CLI/web can probably be combined in one Scenario because Gherkin actions can be "user says/selects/saves STR" and "display STR" which can be executed in both CLI/web.  

    A: Share when behavior is runner-agnostic; split when the surface flow differs.  
    Tag the same Scenario with `@headless @cli @web` and use abstract steps (`When user requests "..."`, `Then table shows ...`); step definitions per tag map to API calls, stdin pipes, or browser actions.  
    Split for surface-specific flows: `@headless`-only (schema validation, pagination edges), `@web`-only (dialogs, voice, drag), `@cli`-only (saved-flow runner).

 4. Q: Which is written first; the API spec or Gherkin files to test that API spec?  
    What is TDD's take on this?  

    A: Gherkin scenarios first, API spec derived from them, code last.  
    TDD/BDD/ATDD all converge on outside-in: capture user-visible behavior before committing to an API surface, because behavior is stable while APIs aren't.  
    `@headless` step definitions naturally become an executable API contract — writing them surfaces design questions concretely, so Gherkin and API spec co-evolve in tight cycles for that tier.  
    For TamedTable, [data-model.md](../../spec/data-model.md) is the draft API contract; next move is to enumerate top use cases as Gherkin (Q5–Q7) and derive HTTP endpoints from what `@headless` steps need to call.

 5. Q: What is a list of top 10 ETL use cases for individual users?  
    How to create test cases for them?  
    Should test cases cover just the main path or errors and edge cases also?  
    What is TDD's take on this?  

    A: Top 10 listed in [Q5 details](#q5--top-10-etl-use-cases-and-test-strategy); each gets its own `.feature` file (use-case-prefixed) following the [datanorm.feature](../../spec/test-cases/datanorm.feature) pattern — input fixture + golden output + `Background` + `Scenario Outline` + `@headless @cli @web` tags + surface-specific `Rule:` blocks.  
    For MVP, Gherkin covers main paths + a handful of user-visible errors (malformed CSV, missing required column); exhaustive edge-case coverage belongs in unit tests, not acceptance tests.  
    TDD's test-pyramid view: acceptance tests at the top drive the outermost loop, unit tests at the base cover edges, every bug found earns a regression test — don't pre-write tests for hypothetical edges (YAGNI).

 6. Q: How many test cases for MVP is needed?  

    A: V1 MVP = 3 use cases (datanorm + dedupe + filter), exercising the three distinct patch mechanisms (column-level cell mutation, row-level deletion, view-filter AST) — no spec extensions needed beyond [data-model.md](../../spec/data-model.md).  
    V2 MVP = remaining 7 use cases, each requiring a spec extension (schema change, second table, row collapse, format change, multi-output, reshape).  
    Scenario count today: 15 test runs from 5 source scenarios in [datanorm.feature](../../spec/test-cases/datanorm.feature); target ~30 across V1 once dedupe and filter scenarios are written.  
    TDD's take: write scenarios as you build, not upfront — each new scenario should expose a missing capability, not a hypothetical edge.

 7. Q: What are the requirements for an MVP?  

    A: Mostly covered by Q1–Q6; four V1-specific items consolidated here.  
    **Acceptance criteria:** all `@headless` and `@cli` scenarios pass across [datanorm.feature](../../spec/test-cases/datanorm.feature), [dedupe.feature](../../spec/test-cases/dedupe.feature), [filter.feature](../../spec/test-cases/filter.feature) — ~20 of the 29 test runs.  
    **Web app deferred:** the 9 `@web` runs stay tagged for forward-compat but aren't expected to pass until V2-web (consistent with the CLI-first plan in [rationale.md](../../spec/rationale.md)).  
    **Out of scope for V1:** the 7 V2 use cases, web app, DuckDB, voice input, multi-user, cloud sync, telemetry.  
    **Two CLI modes:** interactive REPL (default) + `tamedtable execute <flow>` batch subcommand.

 8. Q: Which data model should be used, that can be reused between headless/CLI/web?  

    A: Adopt [data-model.md](../../spec/data-model.md) Spec + Patches as wire model; extend with `transformations: Transformation[]` — an ordered list replayed from the immutable source.  
    Verbs: `filter` / `mutate` / `select` / `sort` / `group` / `join`, each carrying an `Expr` union — V1: `{ js } | { llm; model? }` (eval'd via `new Function`); V2: adds `{ sql }` evaluated by DuckDB. See Q13.  
    V1 subset: `filter` + `mutate` (both modes) + `select` + `sort` (sql only); `group` and `join` deferred to V2.  
    Runtime: pure verbs evaluate immediately; `{llm: ...}` exprs are chunked, parallel-called, then cached by `(input cells + prompt + model)` — caching itself is V2.  
    TypeScript types live in a shared `core/` package; transport varies (in-process for V1 CLI/headless, HTTP/JSON for V2 web).

 9. Q: How will changes be handled by an LLM?  
    JSON Patches, diffs, or search/replace tool?  

    A: RFC 6902 JSON Patch (transformations array ops) + RFC 7396 JSON Merge Patch (shallow view-op edits), already specified in [data-model.md](../../spec/data-model.md); validated via Zod against the Spec + Transformation union from Q8.  
    LLM emits via a single Anthropic tool `apply_spec_patch(operations: JsonPatchOp[])` — atomic application, rollback + error fed to next turn on failure.  
    Why not diff/search-replace: structural ops are schema-validatable, type-safe, location-precise via JSON Pointer, and reversible (`undo = {op:"remove", path:"/transformations/-1"}`); text-based methods are brittle and can match the wrong location.  
    Common shapes: `{op:"add", path:"/transformations/-", value:<Transformation>}` for new ops; `{op:"remove", path:"/transformations/-1"}` for undo; `{op:"move", ...}` for reorder; merge patch for filter/sort/page tweaks.

10. Q: How will changes be propagates to UI (CLI and web)?  

    A: Two triggers: **spec change → full re-render**, plus **chunk-complete → incremental update** for long-running `llm-map` ops so partial data is visible while the operation runs.  
    V1 CLI: per chunk, stream a few sample row updates to stdout (`row 12: Country "USA" → "United States"`) — log-friendly, no terminal control codes per Q1; final full ASCII table reprinted on completion.  
    V2 web: WebSocket pushes per-chunk deltas; React updates affected rows in place; in-flight rows show a skeleton state; TanStack Table virtualizes.  
    Cancellation: Ctrl+C (CLI) / Stop button (web) → `AbortSignal` → **revert** the in-flight transformation per Q9 rollback semantics; the partial work just disappears from the spec (see [cancelation.feature](../../spec/test-cases/cancelation.feature)).  
    Errors: validation/query failures roll back and feed back to the LLM next turn — no optimistic updates in MVP.

11. Q: Should harness be written from scratch or forked from some simple exiting harness like  
    [SWE-agent](https://github.com/swe-agent/swe-agent)?  
    What are the pros and cons of each?  

    A: Write from scratch on top of the Vercel AI SDK (Q2). Vercel AI SDK already provides ~60% of a harness (`generateText`/`streamText` + tool use + provider abstraction + retries + streaming).  
    TamedTable-specific 40% — REPL loop, `apply_spec_patch` tool, spec→query→row pipeline, ASCII renderer, chunked `llm-map` dispatcher returning `AsyncIterable<Update>` with `AbortSignal` plumbed through (live progress + cancel), error feedback loop — totals ~400–500 LOC for V1.  
    **Why not fork SWE-agent:** Python (Q2 chose TS), bash+file-edit domain (TamedTable is JSON spec patches), accumulates full chat history (data-model.md:62 demands stateless ~1KB/turn), sandboxed code execution (not needed). Fork yields ~10% reusable, ~90% to strip — more work than from-scratch.  
    **Stateless token-budget angle:** "no history accumulation" must be the default; writing from scratch makes that easy, while adapting an existing harness fights its accumulation model.

12. Q: Which tabular UI library should be used for the web app?  

    A: **TanStack Table** — already validated in [research-links.md](../research-links.md). Headless React lib with `@tanstack/react-virtual` for million-row virtualization, MIT licensed, no paid tiers, type-safe `ColumnDef[]` aligned with the Q2 TypeScript stack.  
    **Compatibility with Q8/Q9/Q10:** spec `columns[]` maps 1:1 to `ColumnDef[]`; patches mutate spec in React state (no imperative API needed); chunk updates trigger per-cell React state changes (virtualizer re-renders only visible affected rows); skeleton state via cell renderers reading row metadata; cancel/revert = state rollback → atomic re-render. All compatible — no design changes needed upstream.  
    Why not alternatives: AG Grid is imperative and gates pivot/range-select behind Enterprise; MUI DataGrid couples to MUI styling and Premium tier; Glide is canvas-based (weaker a11y, harder devtools); plain `<table>` reinvents virtualization.  
    V2 integration cost: ~100-LOC `<DataGrid spec={spec} rows={rows} />` component wiring `useReactTable` + `useVirtualizer` + cell renderers for skeleton/in-flight rendering.

13. Q: How is `Expr.sql` evaluated in V1, given Q2 deferred DuckDB to V2?  

    A: V1 uses **JavaScript** (LLM emits arrow functions, `eval`-evaluated); V2 adds **DuckDB SQL** alongside. Security is acceptable for an internal MVP — no untrusted callers.  
    **Expr union evolves:**  
    V1: `Expr = { js: string } | { llm: string; model?: string }`  
    V2: `Expr = { js: string } | { sql: string } | { llm: string; model?: string }` — V1 specs remain valid.  
    **JS callback signature:** `(row, index, allRows) => result` matches `Array.filter()`; dedupe in V1 becomes a 1-line predicate: `(row, i, rows) => rows.findIndex(r => r.Email === row.Email) === i`.  
    **Footprint:** zero new deps, ~50 LOC for the evaluator + system-prompt update telling the LLM to emit JS arrow functions.  
    **V2 migration:** add a SQL eval path; existing V1 specs keep working since `{js}` is preserved.

14. Q: What is the system prompt design — content and structure cached per turn?  

    A: Cacheable prefix ~600 tokens via `cache_control: { type: 'ephemeral' }`, structured as: role + goal (~30) / `apply_spec_patch` tool description auto-generated from Zod schema (~150) / spec-format prose summary with Zod reference for full schema (~100) / transformation grammar + Expr union with V1 JS callback signature `(row, i, rows)` (~150) / 3 few-shot examples — JS filter, LLM mutate, JS dedupe (~150) / error-recovery rule (~20).  
    Per-turn non-cached slots: current spec (~300) + user message (~30) + last error if any (~50) — total ~1 KB constant per turn, matching [data-model.md:62](../../spec/data-model.md:62).  
    Cache strategy: the entire ~600-token prefix is one cache breakpoint; only the per-turn slots vary across turns, so first turn pays full ingest and every subsequent turn hits the cache.  
    Few-shot examples cover the three V1 patterns: filter via JS predicate, mutate via LLM prompt, dedupe via JS with `(row, i, rows)` signature — these three shapes generalize across all V1 use cases.

15. Q: What is the `.flow` file format — JSON spec dump, patch sequence, or NL command log?  

    A: V1 = Option A (JSON spec dump): `{ version, source, spec }`. Load spec → query data → write output; deterministic, sub-second, no LLM call on replay.  
    Includes `source` as default (CLI `--input` overrides); extension `.flow` (already used in existing Gherkin), content is plain JSON.  
    Brittleness on source-schema drift accepted for V1 — surface a clear error ("column `Country` not found; available: `country, name, ...`"); user re-edits spec or re-runs against original source.  
    V2 evolves to Option D (hybrid): add NL command log alongside the spec; on query failure, LLM regenerates transformations from the original NL prompts against the actual source schema.

## Answer details

### Q1 — stdin/stdout best practices

- **Cell editing → describe, not click.** User says `"normalize phone numbers"`; LLM emits a spec patch. Rare point-edits: `set row 12 col Phone "+15551234"` → JSON Patch.
- **Scrolling → paging commands.** `next` / `page 3` / `show 100` patches `page.offset`/`page.size`; runtime re-queries and reprints.
- **Sticky header → reprint each turn.** No terminal control codes. Same pattern as `sqlite3`, `psql`, `duckdb`, `jq` REPLs.
- **Column hide/reorder → spec patch**, already shown in [data-model.md](../../spec/data-model.md).
- **Output:** default ASCII table (`tabulate`/`rich.table`); `--format=jsonl|csv` for piping.

Reframe: the CLI is a REPL that prints a fresh view per command, not a TUI spreadsheet. Interactions the LLM should absorb (cursor, scroll, in-cell edit) are deliberately not added — if they're needed, that's the signal to escalate to TTY or web, not bolt them onto stdin/stdout.

### Q2 — MVP TypeScript stack

| Role | Choice | Notes |
|---|---|---|
| Line input | `node:readline/promises` | stdlib, history + editing, 0 deps |
| LLM client | `ai` + `@ai-sdk/anthropic` | Vercel AI SDK; swap providers (`@ai-sdk/openai`, `@openrouter/ai-sdk-provider`) with one-line model change |
| JSON Patch (RFC 6902) | `fast-json-patch` | 0 transitive |
| Merge Patch (RFC 7396) | hand-rolled | ~20 lines |
| CSV read/write | `csv-parse`, `csv-stringify` | 0 transitive each |
| Schema validation | `zod` | transitive via `ai` |
| Table render | hand-rolled `padEnd` | ~30 lines; matches "REPL not TUI" reframe from Q1 |
| Query engine | in-memory JS arrays | DuckDB deferred; spec format unchanged when swapped in |

**Why TypeScript (not Python):** the web app is locked to TS/React/TanStack. Sharing spec types, patch logic, validation, and Anthropic-call code between CLI and web is the biggest single win for a solo project — one implementation, one test suite.

**Why Vercel AI SDK over alternatives:**
- vs OpenAI SDK + OpenRouter base URL: forced into OpenAI wire format, loses Anthropic-native prompt caching efficiency.
- vs LangChain JS: heavier and pulls in agent abstractions we don't need.
- vs hand-rolled `fetch`: reimplements streaming, retries, and tool-use schemas per provider.

**Prompt caching:** Anthropic-native via `cache_control` markers passed through `providerOptions.anthropic`. System prompt + spec schema + tool defs become the cached prefix → per-turn cost stays near the [data-model.md:62](../../spec/data-model.md:62) ~1 KB constant.

**Footprint** (verified via clean `npm install`): 5 direct, 11 total, 25 MB.

### Q5 — Top 10 ETL use cases and test strategy

**Top 10 (for individual users):**

| # | Tier | Use case | Notes |
|---|---|---|---|
| 1 | V1 | Field normalization | phone/date/country/currency formats — see [datanorm.feature](../../spec/test-cases/datanorm.feature) |
| 2 | V1 | Deduplication | drop duplicate rows by key column(s) — [dedupe.feature](../../spec/test-cases/dedupe.feature) |
| 3 | V1 | Filter / subset | extract rows matching a predicate — [filter.feature](../../spec/test-cases/filter.feature) |
| 4 | V2 | Column split / merge | full-name → first+last; combine cols; parse addresses |
| 5 | V2 | Lookup join | enrich rows from a second table |
| 6 | V2 | Group + aggregate | sum/count/avg by category |
| 7 | V2 | Format conversion | CSV ↔ JSONL ↔ Excel ↔ Parquet |
| 8 | V2 | Validation / audit | flag missing/invalid fields; reject file |
| 9 | V2 | Pivot / unpivot | reshape long ↔ wide |
| 10 | V2 | Sort + top-N | order by column, keep first N or percentile |
| ✱ | V1 | Cancellation (cross-cutting) | runtime/UX, not an ETL op — covers AbortSignal + revert semantics, see [cancelation.feature](../../spec/test-cases/cancelation.feature) |

**V1 rationale:** the three V1 picks exercise the three distinct patch mechanisms (column-level cell mutation, row-level deletion, spec view-filter AST) without requiring any spec-model extension beyond [data-model.md](../../spec/data-model.md). V2 items each require extending the spec: schema change, second table, row collapse, format change, multi-output, or reshape.

**Out of scope for MVP:** PDF/HTML extraction, web scraping, geocoding, FX conversion (require external APIs or non-tabular input).

**Test pyramid:**

| Layer | Where | Coverage |
|---|---|---|
| Acceptance | `.feature` files | Main paths + a few user-visible errors |
| Integration | TS code | Spec validation, patch application, query execution |
| Unit | TS code | Exhaustive edge cases (empty input, unicode, boundaries) |


