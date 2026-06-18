# Repo reorganization — Status Report

**Date:** 2026-05-14

Reorganized the repo by **lifecycle** instead of file type: four top-level dirs (`ops/`, `spec/`, `src/`, `temp/`) plus a minimal root (`README.md`, `LICENSE`, `.gitignore`). All 69 tracked files moved via `git mv` (history preserved). No behavior change — gated by `bun x tsc --noEmit`, 29 unit tests, 13 `@offline` cucumber scenarios at the end.

## New layout

```
ops/      prompts/, phases/, status-reports/, repo-tracking/, conventions.md, research-links.md
spec/     *.md specs + test-cases/ (Gherkin features + -input/-expected/.flow fixtures)
src/      package.json, bun.lock, bunfig.toml, tsconfig.json, cucumber.js  (permanent)
          node_modules/   (gitignored)
          packages/core|headless|cli/   (flattened — no inner src/)
          tests/          (cucumber step defs, was test-cases/step-defs/)
temp/     .gitkeep only; everything else gitignored & disposable
```

## Moves

| From | To |
|---|---|
| `phases/`, `prompts/`, `repo-tracking/` | `ops/phases/`, `ops/prompts/`, `ops/repo-tracking/` |
| `conventions.md`, `research-links.md` | `ops/` |
| `status-report-2026-05-1{2,3}.md` | `ops/status-reports/` |
| `test-cases/*.feature` + `*-input.csv` + `*-expected.jsonl` + `*.flow` | `spec/test-cases/` |
| `test-cases/step-defs/*` | `src/tests/` |
| `packages/*/src/index.ts` etc. | `src/packages/*/index.ts` (inner `src/` dropped) |
| `package.json`, `bun.lock`, `bunfig.toml`, `tsconfig.json`, `cucumber.js` | `src/` |
| `TESTING.md` | folded into `README.md`, file deleted |
| `commit-sizes.png` | no longer tracked; chart now writes to `temp/` |

## Path rewrites (the work beyond `git mv`)

- **`src/` is the build root.** All `bun` commands run from `src/`. `node_modules/` materializes there. `src/` is now a self-contained deployable unit.
- **Per-package `package.json`** — `main`/`types`/`exports`/`bin` dropped the `src/` segment (`./src/index.ts` → `./index.ts`).
- **`src/tsconfig.json`** — `include` → `packages/**/*.ts`, `tests/**/*.ts`.
- **`src/cucumber.js`** — `paths` → `../spec/test-cases/*.feature`, `import` → `tests/**/*.ts`.
- **`src/tests/world.ts`** — added exported path anchors (`SRC_DIR`, `REPO_ROOT`, `SPEC_TC_DIR`, `TEMP_DIR`) resolved from `import.meta.dirname`, so step defs locate fixtures regardless of cwd.
- **`common.steps.ts`** — `fixture()` now resolves a bare name under `spec/test-cases/`, and a slash-containing name as `src/`-relative (so feature files can point generated outputs at `../temp/`).
- **`cancelation.steps.ts`, `cli-invocation.steps.ts`, `slash.test.ts`** — hardcoded `test-cases/...` paths replaced with anchored joins.
- **`cli/index.ts`** — `resolveFile`'s dev-convenience fallback updated from `test-cases/` to `../spec/test-cases/`.
- **`repl-commands.feature`** — `/save` / `/save-flow` test outputs now go to `../temp/` instead of `test-cases/`; verified they land in `temp/` at runtime.
- **`.gitignore`** — `temp/*` + `!temp/.gitkeep`; dropped the now-redundant `*.png`.
- **Cross-references** in `spec/*.md`, `ops/phases/*.md`, `ops/prompts/*.md` re-pointed (`../phases/` → `../ops/phases/`, `../test-cases/` → `spec/test-cases/` or `../../spec/test-cases/`, `../packages/` → `../../src/packages/`, etc.).
- **`ops/repo-tracking/`** scripts — `commit-sizes.sh` now `git -C ../..`; `chart-commit-sizes.py` writes the PNG to `temp/`.
- **`conventions.md`** — rewritten to document the lifecycle-based layout and the rationale (why JS config lives in `src/`, why the `.feature`/step-def split mirrors `spec.md`↔`packages/`, why golden-file edits are spec changes).

## Verification

| Check | Result |
|---|---|
| `cd src && bun install` | clean, 266 packages |
| `bun x tsc --noEmit` | clean |
| `bun test` (unit) | 29 / 29 pass |
| `bun x cucumber-js --profile cli --tags @offline` | 13 / 13 scenarios pass |
| `temp/` outputs at runtime | `/save` + `/save-flow` correctly wrote into `temp/` |
| `ops/repo-tracking/*` from new location | `commit-sizes.sh` + `chart-commit-sizes.py` regenerate correctly; PNG → `temp/` |

Live cucumber (`@headless` + `@cli` against the real Anthropic API) was not re-run — costs minutes and tokens, and the reorg touches no LLM-facing surface (prompts, batch protocol, recovery messages are byte-identical). The offline suite + unit tests + typecheck exercise every moved import and path anchor.

## Not changed (deliberately)

- **`ops/status-reports/status-report-2026-05-1{2,3}.md`** — left as frozen snapshots. They describe past states with the paths that were correct when written; rewriting them would falsify the record.
- **`ops/phases/*.md`** — internal links re-pointed for correctness, but the prose (a historical backlog) is untouched.
- **Phase-4 add-ons flagged in earlier reports** (per-cell cache, rate limiter, plan-preview, debug info) — still present; removing them is a feature decision, not a reorg.
