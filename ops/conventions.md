## Project layout

The repo is organized by **lifecycle**, not by file type — see the tree in [../README.md](../README.md). Why the boundaries fall where they do:

- **`src/` holds the JS config** because `package.json` is coupled to the code it builds, and Node module resolution walks *up* — so anything importing dependencies (app code *and* step defs) must live under the dir that holds `node_modules/`. That makes `src/` a single deployable unit you can copy and run.
- **`.feature` files live in `spec/`; app step defs in `src/tests/`, package step defs in the package** — the same spec/implementation split as `spec/behavior.md` + `spec/code-contract.md` ↔ `src/packages/`. Step defs read fixtures from `spec/test-cases/` by plain file path (data reads, unlike imports, cross directories freely).
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

**Library package specs** (`spec/packages/<name>/`): self-contained,
browser-safe packages with their own public API, mirroring
`src/packages/<name>/`. Each package owns one subdirectory containing its
spec MD, feature file, and any fixtures:

- `behavior.md` — what the package does and its worked example
- `<name>.feature` — Gherkin scenarios (tagged `@headless`)
- `<name>-input.*` / `<name>-expected.*` — fixtures if needed

`cucumber.js` routes feature names in `PACKAGE_FEATURES` to
`spec/packages/<name>/<name>.feature`; all others to `spec/test-cases/`.

**Step defs follow ownership.** App-behavior step defs live in `src/tests/`
and share the app harness (`world.ts`). Library-package step defs live in
the package itself (`src/packages/<name>/<name>.steps.ts`), depend only on
`@cucumber/cucumber`, and are picked up by the `packages/**/*.steps.ts`
import glob in `cucumber.js` — so each package's code, steps, and demo sit
in one directory. `spec/packages/<name>/README.md` links across to that
directory; GitHub renders the relative paths as clickable navigation.

Each library package also ships a `demo.html` — a standalone page that
exercises the public API by hand, no app shell required. Run it locally
with `bun run demo` from the package dir. The deploy workflow bundles each
demo into the Pages artifact under `demos/<name>/`, so the README also
links the live URL (`https://zsvedic.github.io/TamedTable/demos/<name>/demo.html`).

## Specs
Under `spec/` — style rules in [writing-style.md](writing-style.md).

## Process
- Outside-in TDD:
  Gherkin → step definitions → API spec → implementation → unit tests as edges surface.
- Don't pre-write tests for hypothetical edges.
