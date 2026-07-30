# Bug inventory — browser hunt

Reproducible failures found by driving the **production build** of the web app
in a real browser (Playwright), plus any expressible through the controller.
Every entry here is a **red test left failing on purpose** — the fix is the
human's call. Nothing in this directory is meant to pass.

- Browser findings live in `src/packages/web/e2e/red/<area>.e2e.ts`, run by the
  Playwright `red` project: `bun run test:e2e:red` (from `src/packages/web/`).
  CI does **not** gate on it.
- Controller-expressible findings live here as `red-<area>.feature`, every
  scenario tagged `@red` + its surface tag, run by `bun run test:red` (from
  `src/`). CI does **not** gate on it.

New findings go in a table below — ID, severity, symptom, the red test that
proves it, the suspected cause, and whether it reproduces on the dev server
too — newest finding last, one section per ID spelling out the repro.

**The inventory is empty right now.** TT-R01, TT-R02, and TT-R03 — three missed
re-renders, all fixed in one PR — were the last entries. Each red test moved
into the green suite (`src/packages/web/e2e/journeys.e2e.ts`) as a regression
guard once it passed. Both runners pass with nothing to run, so the harness is
ready for the next hunt.
</content>
