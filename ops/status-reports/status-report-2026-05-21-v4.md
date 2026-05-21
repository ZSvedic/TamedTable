# V4 — Status Report

**Date:** 2026-05-21

This report covers the V4 work: the browser front-end the spec parked in
its `## V4` section. The same spec-anchored, red-green order was used —
the `@web` Gherkin scenarios were wired and run red first, then the web
package was built until they turned green. The engine packages (`core`,
`headless`, `cli`) were not modified.

## The short version

V4 ships the web UI: a new bun-workspace package `src/packages/web/` —
Vite + React — that puts a chat sidebar and a live table view on top of
the unchanged `@tamedtable/headless` engine. Natural-language requests,
streaming results, undo/redo, file dialogs, and the settings-panel API
key all work. Browser gestures (cell edit, column reorder) are translated
into ordinary spec patches, so undo, history, and replay against the
source keep working through the existing `Runner` interface.

A `web` Cucumber profile joins `headless` and `cli`. It passes 18
scenarios: 10 web-specific ones in the new `web.feature`, plus 8 shared
`@web` scenarios from the other features, replayed against the cassettes
the CLI already recorded.

Nothing regressed: the `headless` and `cli` profiles return exactly the
results they did before this work.

## What shipped

**The `@tamedtable/web` package.** A Vite + React app, registered in the
bun workspace. It imports `@tamedtable/headless` directly — no HTTP
layer; the model call goes from the browser to Anthropic through the same
SDK the CLI uses.

**`WebController`.** A framework-agnostic, DOM-free core that wraps a
headless `Runner`, owns the undo/redo journal, debounces streaming
`onChunk` updates into a table overlay, and exposes the surface the React
components render. The Cucumber suite drives this exact class, so the
tests exercise the same code the browser runs.

**Browser gestures as spec patches.** A cell edit becomes a `mutate`
transformation keyed by row index; a column reorder reorders
`spec.columns`. Both are ordinary patches — the same shape the LLM
produces — so undo/redo, history, and replay all keep working with the
`Runner` interface untouched.

**The React UI.** A toolbar (Open / Save data / Save flow / Undo / Redo
/ Settings), a chat sidebar with streaming responses and a per-request
debug detail, an editable and reorderable table, a per-tab settings
panel for the API key, and toasts that carry the recovery-loop error
strings. All visual styling — colors, typography, spacing — is isolated
in one `theme.ts` tokens module so the parallel visual-design pass can be
swapped in with low friction.

**File input/output.** The File System Access API where the browser
supports it, with a download/upload fallback elsewhere. The dialog
handshake takes the place of the CLI's `:load` / `:save`.

**The `web` Cucumber profile.** Added to `cucumber.js` alongside
`headless` and `cli`, with a `surface: 'web'` world parameter. A new
`web.feature` covers the interactions that genuinely differ from the CLI:
the file-dialog handshake, the settings panel, cell-edit and
column-reorder gestures, and the download fallback. Model calls reuse the
existing cassette recorder.

## Verification

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`, engine + web) | clean |
| Unit tests (`bun test`) | 50 / 50 pass |
| `web` profile (`bun run test:web`) | 18 / 18 scenarios pass |
| `headless` profile | 44 / 51 — unchanged from the base branch |
| `cli` profile | 56 / 63 — unchanged from the base branch |
| `vite build` | succeeds (215 modules) |
| `vite dev` | serves and transforms the app |

The `headless` / `cli` numbers are identical to the V3 baseline: each has
one pre-existing `sql.feature` failure and six undefined V3
SQL-cancellation scenarios. None of that is V4 work.

**Not verified:** a real browser was not available in the build
environment, so the golden path (open CSV → request → stream → undo →
save) and the edge cases (empty file, missing API key, failed request)
were exercised through the `web` Cucumber profile against the real
`WebController`, not a live browser. `vite build` and `vite dev` confirm
the bundle compiles and serves.

## Spec gaps found

The spec says the web app "imports `@tamedtable/headless` directly" and
"uses the existing `Runner` interface unmodified." Three details make
that not literally achievable. Each was resolved **without touching the
engine** — the workarounds live entirely in the web package's Vite
config and a `fetch` wrapper.

1. **The engine cannot bundle for a browser as written.**
   `@tamedtable/headless` statically imports `@duckdb/node-api` — a
   native Node addon — and uses `node:fs` / `node:path` / `node:url`.
   Vite aliases these to in-package shims and inlines the system-prompt
   file the engine reads at module init. As a consequence `{sql}` /
   DuckDB transformations are unavailable in the browser build; they are
   outside the V4 web golden path.

2. **No `Runner` method loads in-memory content.** `loadInput(path)`
   reads from a filesystem path, but a file picked through the File
   System Access API has content, not a path. The shell writes picked
   content to a path — an in-memory fs shim in the browser, a temp
   directory in tests — and calls `loadInput` unchanged.

3. **Direct browser-to-Anthropic calls need an extra header**
   (`anthropic-dangerous-direct-browser-access`) and a per-tab key that
   cannot come from an env var, but `HeadlessRunnerOptions` has no
   `headers` field. This was handled through the existing `fetch` option:
   the controller passes a `fetch` wrapper that injects the API key and
   the header live, so the engine is built once and never rebuilt when
   the key changes.

A future revision of `behavior.md` / `code-contract.md` could note these
explicitly — for instance, a `Runner.loadContent(name, text)` seam and a
`headers` option on `HeadlessRunnerOptions` would let the web shell drop
the shims. They are recorded here rather than guessed into the engine.

## What's left

- A real-browser pass of the golden path and edge cases, once a browser
  is available — the automated `web` profile covers the behavior, but not
  the rendering.
- The parallel visual-design output (Claude Design) can be merged by
  replacing `src/packages/web/src/theme.ts`; components reference only
  its tokens.
- The pre-existing `sql.feature` failure and the six undefined V3
  SQL-cancellation scenarios remain open — unchanged by this work and
  still tracked from the V3 report.
