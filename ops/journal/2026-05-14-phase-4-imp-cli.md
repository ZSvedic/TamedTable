# Phase 4 — Implementation (V1 CLI)

> Frozen planning record. References to the four V1 sub-docs (`core.md`,
> `runner.md`, `headless.md`, `cli.md`) and `data-model.md` below were live
> when this phase ran; phase 5 consolidated them into
> [spec/behavior.md](../../spec/behavior.md) and
> [spec/code-contract.md](../../spec/code-contract.md).

Goal: implement the V1 spec set so every `@headless` and `@cli` scenario across [datanorm.feature](../../spec/test-cases/datanorm.feature), [dedupe.feature](../../spec/test-cases/dedupe.feature), and [filter.feature](../../spec/test-cases/filter.feature) passes. Phase 2 left the imports red; phase 3 wrote the contract; phase 4 fills in the code.

Prerequisites: the spec hub at [spec.md](../../spec/spec.md) and the four V1 sub-docs ([core.md](../../spec/core.md), [runner.md](../../spec/runner.md), [headless.md](../../spec/headless.md), [cli.md](../../spec/cli.md)); the wire model in [data-model.md](../../spec/data-model.md); the Q1–Q15 decisions in [phase-1-pre-spec.md](phase-1-pre-spec.md); the conventions in [conventions.md](../conventions.md). Run `bun run test:red` first to confirm the current red state and `bun install` once to refresh [bun.lock](../../src/bun.lock) after the fast-json-patch dep move.

## Backlog

1. **`packages/core/src/`** — types from [core.md](../../spec/core.md) (`Spec`, `Row`, `Transformation`, `Expr`); a single Zod schema covering the V1 type set with the three validation entry points; `loadCsv`, `readJsonl`, `writeJsonl` per the I/O contract.

2. **`packages/headless/src/`** — `createHeadlessRunner` per [headless.md](../../spec/headless.md): conversation driver over Vercel AI SDK with `cache_control` Anthropic prompt caching (Q14); the single `apply_spec_patch` tool with the Zod-generated input schema; the transformation evaluator (JS via `new Function`, LLM via the chunk dispatcher); the error feedback loop with a 3-turn budget. RFC 6902 via `fast-json-patch`, RFC 7396 merge hand-rolled (~20 LOC).

3. **`packages/cli/src/`** — `createCliRunner` and `runCli` per [cli.md](../../spec/cli.md): REPL on `node:readline/promises`, hand-rolled `padEnd` ASCII renderer (~30 LOC per Q2), per-chunk sample updates per Q10, Ctrl+C wired to the headless `AbortSignal`, and the `execute <flow>` subcommand with `--input` / `--output` flags and exit codes 0–4.

4. **Cancellation in tests** — add [cancelation.feature](../../spec/test-cases/cancelation.feature) to `cucumber.js` paths and write the missing step defs (*via LLM*, *at least one chunk has completed*, *user cancels the operation after at least one chunk has completed*, and the three Then-assertions from [cancelation.feature](../../spec/test-cases/cancelation.feature)).

5. **Verify green:** `bun run test:red` passes both profiles. Rename the script to `test` (or add `test` as an alias) since the suite is no longer expected to fail.

## Definition of done
- Every `@headless` and `@cli` scenario across the three V1 features passes (19 scenarios per [README.md](../../README.md)).
- Every `@headless` and `@cli` scenario in [cancelation.feature](../../spec/test-cases/cancelation.feature) passes once it's wired into the cucumber paths.
- `bun x tsc --noEmit` is silent.
- No `any` stubs remain in `packages/*/src/index.ts`.
- `ANTHROPIC_API_KEY` is the only env var the harness needs; a missing key produces a clear human-readable error, not a stack trace.
- No V2 features (`group`, `join`, `Expr.sql`, CSV-out, DuckDB) introduced.
