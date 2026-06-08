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


## Test fixtures and feature files — two tiers

**App-behavior scenarios** (`spec/test-cases/`): features of the TamedTable
app tested through its surfaces (CLI, headless, web). Naming:

- `<usecase>-input.<ext>` — source fixture (committed)
- `<usecase>-expected.<ext>` — golden output (committed)
- `<usecase>-output.<ext>` — runtime-generated (gitignored)
- `<usecase>.flow` — saved flow
- `<usecase>.feature` — Gherkin scenarios

**Library module specs** (`spec/modules/<name>/`): self-contained,
browser-safe packages with their own public API. Each module owns one
subdirectory containing its spec MD, feature file, and any fixtures:

- `behavior.md` — what the module does and its worked example
- `<name>.feature` — Gherkin scenarios (tagged `@headless`)
- `<name>-input.*` / `<name>-expected.*` — fixtures if needed

`cucumber.js` routes feature names in `MODULE_FEATURES` to
`spec/modules/<name>/<name>.feature`; all others to `spec/test-cases/`.

**Per-module review aids.** To review one module in isolation,
`spec/modules/<name>/` carries two symlinks back into `src/` (code must
stay under `src/` for module resolution; the links give a colocated view):

- `code` → `src/packages/<name>/` — implementation
- `steps.ts` → `src/tests/<name>.steps.ts` — its step defs

Each module package also ships a `demo.html` (run `bun demo.html`, or
`bun run demo` from the package dir) — a standalone page that exercises
the module's public API by hand, no app shell required.

## Specs
Under `spec/` — style rules in [writing-style.md](writing-style.md).

## Process
- Outside-in TDD:
  Gherkin → step definitions → API spec → implementation → unit tests as edges surface.
- Don't pre-write tests for hypothetical edges.
