# Phase 2 — Tests (TDD Red Phase)

Goal: turn V1 Gherkin into executable **failing** tests. The compile/runtime errors become input for phase-3 (API spec).

Prerequisites: Q1–Q15 in [phase-1-pre-spec.md](phase-1-pre-spec.md) and [conventions.md](../conventions.md).

## Backlog

1. **Test runner:** `@cucumber/cucumber` — Gherkin-native, runs under bun via `bun x cucumber-js`.

2. **Scaffold monorepo** per [conventions.md](../conventions.md): `packages/{core,cli,headless}`, `bunfig.toml` with `minimumReleaseAge = 604800`, `package.json` workspaces, `tsconfig.json`. Install Q2 runtime deps + dev (`@cucumber/cucumber`, `typescript`, `@types/node`).

3. **Create missing V1 fixtures** in `test-cases/`: `dedupe-input.csv` + `dedupe-expected.jsonl` (Email duplicates), `filter-input.csv` + `filter-expected.jsonl` (varied Country values). datanorm fixtures already exist.

4. **Write step defs** in `test-cases/step-defs/`: `common.steps.ts` for shared steps (`When user requests "..."`, `Then column "..." matches the golden output`, compound Givens); `headless.hooks.ts` / `cli.hooks.ts` for per-tag setup. Skip `@web` (V2). Imports from the new packages will fail to resolve — that's the point.

5. **Verify red:** `bun x cucumber-js --tags "@headless or @cli"` should fail every V1 scenario with "module not found" or "function not defined" — not syntax/setup errors.

## Definition of done
- `bun install` clean.
- Step defs compile. 
- All V1 `@headless` + `@cli` scenarios fail with missing-symbol errors. 
- Shared steps used once across the three V1 features.
