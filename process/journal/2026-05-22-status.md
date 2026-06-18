# Web feature pass — Status Report

**Date:** 2026-05-22

This report covers three web-UI features carried over from the Claude
Design mockups into the shipping app: table **pagination**, a **status
footer**, and a settings-panel **model picker**. They build on the
brand-system redesign merged earlier the same day. The spec-anchored,
red-green order was used — the `@web` Gherkin scenarios were written and
run red first, then the `WebController` and React components were built
until they turned green. The engine packages (`core`, `headless`, `cli`)
were not modified.

## The short version

The web table now shows twenty rows per page with a pager; a status
footer under it reports the selected cell and whether the app is idle,
running, or saved; and the settings panel picks which Anthropic model
writes each spec patch. All three are `WebController` state — never spec
fields — so they sit beside the CLI's viewport in the same "view state,
not wire protocol" split.

`web.feature` grew from 10 to 20 scenarios; the `web` Cucumber profile
passes all 28 (20 web-specific plus 8 shared). A new pure-helper module
adds 9 unit tests. Nothing regressed: `headless` and `cli` return the
same numbers as the V4 baseline.

## What shipped

**Pagination.** `WebController` gains `pageRows()`, `currentPage()`,
`pageCount()`, `totalRows()`, and `goToPage()`, plus a fixed
`pageSize` of 20. The page index is 1-based and clamped on read, so a
request that shortens the table pulls the page back into range with no
extra bookkeeping. The table view renders one page at a time with a
pager — first / previous / numbered / next / last — whose page-number
window (`buildPageList`) collapses long runs behind `…` markers.

**Status footer.** A thin strip under the table reports the current
cell selection as `R<row> · <column>`, the encoding, and an activity
reading — idle, running, or saved. Clicking a cell selects it
(`selectCell`); `activityStatus()` derives the reading from the
streaming flag and a save marker that the next edit, request, or load
clears.

**Model picker.** `model` joins `WebSettings` and `WebControllerOptions`
(default `claude-sonnet-4-6`). The settings panel offers Opus 4.7,
Sonnet 4.6, and Haiku 4.5. `setModel()` rebuilds the engine with the new
model and replays the current spec against the source, so the visible
table is preserved — the same `setSpec` replay path undo/redo already
use. The preference persists in `localStorage`.

**Pure pagination helpers.** `clampPage` and `buildPageList` live in
`pagination.ts` with no React or controller dependency, unit-tested in
`pagination.test.ts` — the page-number-window edge (more than seven
pages) that the 46-row Gherkin fixture never reaches.

## Verification

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`, engine + web) | clean |
| Unit tests (`bun test`) | 59 / 59 pass (50 prior + 9 new) |
| `web` profile (`bun run test:web`) | 28 / 28 scenarios pass |
| `headless` profile | 44 / 51 — unchanged from the V4 baseline |
| `cli` profile | 56 / 63 — unchanged from the V4 baseline |
| `vite build` | succeeds |

The `headless` / `cli` numbers carry the same one pre-existing
`sql.feature` failure and six undefined V3 SQL-cancellation scenarios
reported under V3 and V4 — none of that is this work.

**Not verified:** a real browser was not available in the build
environment, so the new pagination, footer, and model-picker behavior
was exercised through the `web` Cucumber profile against the real
`WebController`, plus an SSR render of the loaded table and the open
settings panel. `vite build` confirms the bundle compiles.

## Spec changes

`behavior.md` and `code-contract.md` both gained the three behaviors in
their `## V2 → Web UI` sections — the canonical home of web behavior.
`behavior.md` describes pagination, the footer, and the model picker in
prose; `code-contract.md` carries the matching `WebController` surface.
`features.csv` records the `Web UI` row at 20 passing scenarios.
