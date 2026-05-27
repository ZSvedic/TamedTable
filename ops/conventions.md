## Project layout

The repo is organized by **lifecycle**, not by file type — see the tree in [../README.md](../README.md). Why the boundaries fall where they do:

- **`src/` holds the JS config** because `package.json` is coupled to the code it builds, and Node module resolution walks *up* — so anything importing dependencies (app code *and* step defs) must live under the dir that holds `node_modules/`. That makes `src/` a single deployable unit you can copy and run.
- **`.feature` files live in `spec/`, step defs in `src/tests/`** — the same spec/implementation split as `spec/behavior.md` + `spec/code-contract.md` ↔ `src/packages/`. Step defs read fixtures from `spec/test-cases/` by plain file path (data reads, unlike imports, cross directories freely).
- **`src/` root files are permanent** (`package.json`, `bun.lock`, `bunfig.toml`, `tsconfig.json`, `cucumber.js`) — not regenerable from `spec/`, not deletable. Only `src/`'s *subdirs* (`packages/`, `tests/`) are regenerable.
- **Edits by the AI to `spec/test-cases/*-expected.jsonl`** (golden files) are spec changes — review them, don't treat them as routine fixture churn.

## Stack & Tooling
- **TypeScript everywhere** (CLI, core, web).
- **Runtime + package manager: bun** — always. All `bun` commands run from `src/` (that's where `package.json` lives). Bun executes TypeScript natively (no separate compile step).
- **Project layout: monorepo** via bun workspaces. Packages live under `src/packages/`.
- **Dependency stability**: `minimumReleaseAge = 604800` (7 days) in `src/bunfig.toml`.

## Phases
- [2026-05-14-phase-1-pre-spec.md](journal/2026-05-14-phase-1-pre-spec.md) — Q1–Q15 architecture decisions (CLI surface, LLM stack, data model, harness, test strategy)
- [2026-05-14-phase-2-tests.md](journal/2026-05-14-phase-2-tests.md) — step-definition backlog (TDD red phase)
- [2026-05-14-phase-3-spec.md](journal/2026-05-14-phase-3-spec.md) — API spec (derived from phase-2)
- [2026-05-14-phase-4-imp-cli.md](journal/2026-05-14-phase-4-imp-cli.md) — CLI implementation plan

## Test fixtures
Under `spec/test-cases/`. Naming:
- `<usecase>-input.<ext>` — source fixture (committed)
- `<usecase>-expected.<ext>` — golden output (committed)
- `<usecase>-output.<ext>` — runtime-generated (gitignored)
- `<usecase>.flow` — saved flow (per Q15)
- `<usecase>.feature` — Gherkin scenarios

## Specs
Under `spec/` — hub at [../spec/spec.md](../spec/spec.md), style rules in [writing-style.md](writing-style.md).

## Process
- Outside-in TDD:
  Gherkin → step definitions → API spec → implementation → unit tests as edges surface.
- Don't pre-write tests for hypothetical edges.
