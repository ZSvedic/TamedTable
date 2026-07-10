# web — keep the original, write the phone rules into Gherkin

Compares `src/packages/web` here (263 KB of source: controller, React
components, mobile shell, hooks, four Playwright e2e specs) with the
recreate's (~94 KB source, plus a 40 MB `dist/` build output it committed by
mistake).

## Where the 169 KB difference goes

Most of the gap is not "the recreate wrote leaner code" — it's things the
recreate doesn't have at all, plus comments. Byte accounting:

| Bucket | ORG | REC | Gap |
|---|---|---|---|
| Tests in the package (4 Playwright specs, 2 unit tests, playwright config) | 35 KB | 0 | 35 KB |
| `public/` icons | 12 KB | 0 | 12 KB |
| Build config (vite, tsconfig, index.html vs a 2.5 KB `build.ts`) | 12 KB | 4 KB | 8 KB |
| Node-API shims for the browser | 12 KB | 8 KB | 4 KB |
| Comments and blank lines inside app code | 51 KB | 6 KB | 45 KB |
| App code with comments stripped | 142 KB | 79 KB | 63 KB |

The `public/` icons are deploy copies of `marketing/brand/` — Vite serves
`public/` at the site root, and `src/` must stay a self-contained deployable
unit, so it can't read `marketing/` at build time. The recreate ships no icon
at all: its page loads fine but the tab is blank and there is no home-screen
icon.

So of the 169 KB: ~55 KB is missing tests and assets, ~45 KB is
documentation (a quarter of the original's controller lines are comments —
the `#TutorialMode`-style headers that MAP.md and the spec link into; the
recreate comments ~5% of lines), and only ~63 KB is genuinely smaller code.

That remaining 63 KB buys less, not the same thing cheaper:

- **UI**: the original's 13 React components (79 KB stripped) vs one 46 KB
  imperative `app.ts` — the smaller version is exactly the
  rebuild-the-world renderer criticized below. React's diffing is what the
  original pays those bytes for; the recreate saves them by losing scroll,
  focus, and typed text on every state change.
- **Diagnostics**: 13 KB vs 4 KB — the recreate drops `redactString` and
  the secret-key detection, so its bug reports can leak key material.
- **Tutorial**: the original's 39 KB `TutorialManager` + panel lazy-loads
  feature files and cassettes, caches them, and persists completion; the
  recreate inlines a thinner version into its controller.

Conclusion: the honest like-for-like number is 142 KB vs 79 KB, and the
recreate's savings come from omitted behavior (state-preserving rendering,
secret redaction) rather than better factoring. "Less code" here is not
"easier to maintain" — it's uncommented code with no tests next to it.

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

1. Copy the recreate's phone scenarios (they live in the recreate's
   `spec/test-cases/shell.feature`, not its `web.feature`) into the
   original's `spec/test-cases/web.feature`, plus its history-sheet
   scenarios, which the original lacks. Write step defs against the
   controller. They document behavior the original already has, so they
   pass right away — any red one is a real find.
2. No code change.

Done — outcome of step 1:

- The history scenarios (redo, timeline listing, jump, redo-tail clearing)
  landed controller-level and surfaced one real design difference: the
  recreate's timeline lists the load as entry 0; the original's journal
  deliberately clears on load, so the scenarios were adapted to that.
- The tour scenario landed as the controller cue (the query step targets
  the composer) — raising the Type sheet from that cue is the shell's job,
  stated in the Rule description.
- The two layout scenarios (phone page is the table's scroller; desktop
  never scrolls) are browser facts a controller step can't see; they stay
  in `e2e/mobile.e2e.ts`, where the missing desktop no-scroll check was
  added — the one genuine coverage gap the recreate exposed.
