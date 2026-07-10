# web — keep the original, write the phone rules into Gherkin

Compares `src/packages/web` here (263 KB of source: controller, React
components, mobile shell, hooks, four Playwright e2e specs) with the
recreate's (~94 KB source, plus a 40 MB `dist/` build output it committed by
mistake).

## Analysis

Credit first: the recreate's controller matches the original feature for
feature — undo/redo, the history timeline with jump, request counting, SQL in
the browser, settings, diagnostics, the phone dock and bottom sheets. The spec
did its job here.

Where the recreate loses:

- **No browser tests at all.** The original has four Playwright specs
  (formats, mobile, sql, tutorial); the recreate tests only the controller
  API. Nothing ever checks its real page.
- **Rebuild-the-world rendering.** Its `app.ts` (48 KB, no framework) wipes
  the page and rebuilds it on every state change, losing scroll position,
  focus, and half-typed chat text along the way.
- **Parquet save likely broken.** It routes Parquet writing through a DuckDB
  extension that downloads from the internet; the original deliberately uses a
  pure-JS writer so saving works offline.
- A dead shim file and the committed 40 MB `dist/`.

Worth adopting: the recreate wrote Gherkin for phone behaviors the original
only checks in `mobile.e2e.ts` — "the phone page is the table's scroller with
a frozen header", "on desktop nothing scrolls the page", "the query tour step
raises the Type sheet". Promoting those to scenarios makes the mobile rules
part of the spec instead of a test-file detail.

## Questions for you

None.

## Plan

1. Copy the recreate's phone scenarios (see `spec/test-cases/web.feature` in
   TT-recreate) into the original's `spec/test-cases/web.feature`, plus its
   history-sheet scenario if the original lacks it. Write step defs against
   the controller. They document behavior the original already has, so they
   pass right away — any red one is a real find.
2. No code change.
