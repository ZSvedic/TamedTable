# V4 Web UI — build prompt for cloud Claude Code

Paste this as the kickoff instruction for a cloud Claude Code session
pointed at the TamedTable repository.

---

## Goal

Build the V4 web front-end for TamedTable: a browser app that mirrors the
CLI's interaction shape — a chat sidebar for natural-language requests and
a data-table view beside it — on top of the existing engine. Deliver it as
a pull request on a `claude/...` branch.

## Read first, in this order

- `README.md` — project overview, how to run, how to test.
- `spec/spec.md` — the index of the spec.
- `spec/behavior.md` — the behavior contract. The web UI is described in
  the **`## V2` → "Web UI"** subsection and parked for delivery in
  **`## V4`**. Read the whole file — undo, cancellation, recovery, and the
  streaming chunk callback all apply unchanged.
- `spec/code-contract.md` — the matching types, signatures, and env vars.
  Web specifics are in **`## V2` → "Web UI"** and **`## V4`**.
- `ops/conventions.md` — stack, repo layout, and dev-process conventions.
- `src/packages/headless/index.ts` — the engine you build on. Do **not**
  modify it.
- `src/packages/cli/index.ts` — the existing CLI front-end. The web UI is a
  second front-end with the same relationship to the engine: study how it
  wraps `createHeadlessRunner`, handles the `onChunk` / `onPlan` / `onDebug`
  callbacks, the undo/redo journal, and the viewport.

## What to build

A new bun-workspace package at `src/packages/web/` — Vite + React,
TypeScript. Per the spec:

- It imports `@tamedtable/headless` directly. **No HTTP layer** — the model
  call goes from the browser to Anthropic through the same SDK.
- It uses the existing `Runner` interface **unmodified**. Cell editing,
  scrolling, column-resize, and column-reorder are browser gestures that
  ultimately produce spec patches — the same shape the LLM produces — so
  undo/redo, history, and replay against the source all keep working.
- The API key is read from a per-tab settings panel, not an env var.
- File input/output uses the File System Access API where available, with a
  download/upload fallback for browsers that lack it. The file-dialog
  handshake takes the place of the CLI's `:load` / `:save`.
- Streaming chunks fire the same callback the CLI uses; debounce them into
  table updates.
- Errors surface as toasts carrying the recovery-loop error strings.

The interaction surface is a chat sidebar (natural-language requests,
streaming responses, the per-request debug detail) and the table view.

## How to work — spec-anchored, outside-in TDD (STIRR)

The behavior is already specified, so the order is Gherkin → step
definitions → implementation, red before green:

1. **Gherkin.** Nine feature files already carry a `@web` tag on scenarios
   (`grep -rl @web spec/test-cases/`). Add a `web` profile to
   `src/cucumber.js` alongside `headless` and `cli`, with its
   `worldParameters` surface. Add web-specific scenarios where the web
   interaction genuinely differs from the CLI — file dialogs, cell-edit
   gestures, the settings panel.
2. **Step definitions / tests.** Wire the web step definitions (or
   component tests where a full browser drive is overkill); run them red.
3. **Implementation.** Build `src/packages/web/` until green.

Model calls on the web surface go through the same cassette recorder —
reuse the wiring in `src/tests/world.ts` that installs it for `@cli` /
`@headless` scenarios.

## Conventions and constraints

- TypeScript everywhere; bun is the runtime and package manager; every
  `bun` command runs from `src/`. Register the new package in the
  workspace.
- Do **not** modify the `Runner` interface or the engine packages — the web
  shell plugs into existing seams.
- Don't over-engineer. No abstractions, fallbacks, or config beyond what
  the spec needs.
- Keep all visual styling — colors, typography, spacing — isolated in one
  theme/tokens module. A separate visual-design pass (Claude Design) is
  running in parallel; its output may be merged in later, so make that a
  low-friction swap rather than styling scattered through components.
- `src/bunfig.toml` pins `minimumReleaseAge` to 7 days — choose
  dependencies that satisfy it.
- If you find a real gap in `behavior.md` / `code-contract.md` — something
  that changes behavior, not a low-level detail — call it out in the PR
  description instead of guessing. Fill low-level details (exact wording,
  pixel choices) with reasonable defaults silently.

## Verify before finishing

- `bun run typecheck` — clean.
- `bun run test` — unit tests plus all three Cucumber profiles; the new
  `web` profile must pass.
- Run the Vite dev server and exercise the golden path in a real browser:
  open a CSV, type a request, watch cells stream in, undo, save. Then the
  edge cases — empty file, missing/invalid API key, a request that fails
  (toast, table unchanged).

## Deliver

A pull request on a `claude/...` branch. Break the work into reviewable
commits — scaffold, then Gherkin, then step definitions, then
implementation. In the PR description: what shipped, the verification
results, and any spec gaps found.
