# BROWSER HUNTER — find bugs by being a user

Read `AGENTS.md` and `README.md` first, then `MAP.md`, `spec/behavior.md`, and
`spec/code-contract.md`. Work for **at least five hours**. Spawn as many
subagents as the work supports — one per feature area, plus separate
verification agents. Deliver **one PR**.

Your job is to **find bugs, not fix them**. Every product bug you find is
recorded as a failing test and left failing. Fixing is the human's call
tomorrow morning.

## Why you exist

The suite has 550+ scenarios and three basic features were still broken in the
deployed app (PR #259): a tour died because the production bundle tree-shook
Zod's locale away, an API key saved mid-session never reached the engine, and
joins were unreachable in the browser because only a test could stage a lookup
table. Root cause: the `@web` Cucumber profile drives `WebController` directly
— no DOM, no bundler, no clicks — and the four Playwright specs that do drive
a browser run against the **dev** server and are not in CI.

You close that gap and then use it to hunt.

## Phase 1 — make the harness test the thing we ship

This is the one place you are allowed to change non-test code, and only these:

1. `src/packages/web/playwright.config.ts` — serve the **production build**
   (`bun run build && bun run preview`), not `bun run dev`. Dev does not
   tree-shake or minify, which is exactly the class of bug that escaped.
   Keep a dev-server option for local iteration if you like, but CI must use
   the build.
2. `.github/workflows/ci.yml` — run the e2e suite. It must gate PRs.
3. `src/tests/` — a unit test asserting no step definition reaches past the
   public controller surface: no `.engine.`, `.lazy.`, `.patch.`, or
   `.settingsMgr.` access under `src/tests/**` and `src/packages/**/*.steps.ts`.
   Today there is exactly one violation, `src/tests/v2.steps.ts:198`
   (`engine.registerLookup`) — and PR #259 gave that seam a real UI, so if that
   PR has merged, rewrite the step to use it; if it has not, allowlist that one
   line with a comment pointing at #259 and let the test guard everything else.

Get Phase 1 green and **commit it** before hunting. If the production build
turns out to break something the dev server hid, that is your first finding —
record it and keep going.

## Phase 2 — drive the app as a person, in a real browser

Then write browser-driven user journeys under `src/packages/web/e2e/`, in new
`*.e2e.ts` files grouped by area. Real clicks, real typing, real drags, real
viewport changes. The existing specs (`tutorial.e2e.ts`, `mobile.e2e.ts`,
`formats.e2e.ts`, `sql.e2e.ts`) show the house style; the app is served at
`/TamedTable/app/`.

Cover, at minimum:

- **Open** — sample picker, URL dialog, local file, drag-and-drop on the empty
  page, Recent entries, unsupported extension, empty file, a file bigger than
  one page (the large-file dialog).
- **Save** — every format, the source-name default, the download fallback,
  save after a run (the save-ready click), Save as Python's refusals.
- **Grid** — inline edit, column drag-reorder, column resize, paging, sort and
  filter menus, selection, changed-cell tint, the reveal scroll.
- **Undo/redo/history** — after each of the above, and interleaved.
- **Settings** — provider cards, key fields, the Saved badge, the model rows,
  and what a change does to a table already on screen.
- **Tours** — every tour in the panel, start to finish, including deep links,
  staying in a finished tour, and exiting mid-tour. Tours replay committed
  cassettes and need **no API key** — they are your only route to exercising
  real model-driven behavior, so lean on them hard.
- **Mobile** — the ≤768px layout: app bar, dock, sheets, drawer, pinch zoom,
  frozen header.
- **Chat** — sending, the run progress block, Stop, request detail, Report bug,
  the thread's scroll behavior.

Then push past the happy path, because that is where the bugs are:

- Do everything **twice**, and do things **in the wrong order**. 87% of
  existing scenarios have a single `When`; two of the three bugs in #259 were
  second-action bugs. Change a setting after a run. Undo, then act. Open a
  second file mid-session. Cancel, then retry.
- **Reload the page** in each interesting state and check what survived and
  what should not have.
- Resize between desktop, condensed, and phone widths **while** something is
  in flight or a dialog is open.
- Click the same button twice fast. Press Escape everywhere. Tab through and
  drive by keyboard only.
- Open the app in **two tabs** and change settings in one (localStorage).
- Deep-link into a tour with a URL that does not exist.

## What counts as a finding

A finding is a **reproducible failure**, not an opinion. For each one:

1. A test that fails, on the production build, for the stated reason.
2. The actual failure output, pasted into the report.
3. One sentence on what a user loses.
4. Your best guess at the cause as `file.ts:line` — a guess is fine, say it is.

Not findings: wording you would phrase differently, missing features, styling
preferences, CLI-vs-web differences the spec describes, or anything you cannot
make fail.

## Where red tests go

Keep `bun run test` and the green e2e suite **green** — a reviewer must be able
to see that your PR broke nothing. The bug inventory lives apart:

- Browser findings: `src/packages/web/e2e/red/<area>.e2e.ts`, run by a separate
  Playwright project (`red`) that CI does **not** gate on. Add
  `"test:e2e:red": "playwright test --project=red --pass-with-no-tests"` to the
  web package (the flag keeps the runner happy when the inventory is empty).
- Findings expressible through the controller: `spec/test-cases/red/`, one
  `red-<area>.feature` per area, every scenario tagged `@red` **and** its
  surface tag. Wire it exactly like this so both of tonight's PRs produce a
  byte-identical diff and merge cleanly:
  - in `src/cucumber.js`, add the `red` dir to feature discovery, add
    `and not @red` to `tagsFor`, and export a `red` profile whose tags are
    `@red` (no surface filter);
  - in `src/package.json`, add
    `"test:red": "bun --bun cucumber-js --profile red"`.
  - If `main` already has this wiring when you rebase, keep the existing copy.

Every red test must fail **for its bug**, not for a typo. Run
`bun run test:red` and `bun run test:e2e:red` and confirm each failure message
names the defect.

## The report

`spec/test-cases/red/README.md`, newest finding last, as a table: ID, severity
(critical / major / minor), one-line symptom, the test that proves it, the
suspected cause, and whether it also reproduces on the dev server (a "build
only" bug is its own class and worth flagging). Below the table, a short
paragraph per critical and major finding.

Severity calibration, from the three real bugs: a feature that is dead in the
deployed app is **critical**; a feature that works only after a page reload, or
that silently discards user work, is **major**; a wrong label or a missed
scroll is **minor**.

## Working rules

- Never re-record or delete a cassette. You have no API keys; everything runs
  offline from committed recordings.
- Never edit product code under `src/packages/*/` except the Phase 1 list.
- Never edit an existing green scenario to make room for a finding.
- Commit every hour or so, with the findings file updated — a five-hour session
  that loses its work at hour four is worth nothing.
- Deduplicate before you report: three symptoms of one cause are one finding.
- Ten or more verified findings is the bar. If you are under it at hour four,
  you are testing too politely — go break something.

Open the PR when the timebox is up. Title it as a bug inventory, not a fix, and
lead the body with the findings table. Do not merge.
