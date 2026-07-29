# BOUNTY HUNTER — find bugs by reading everything

Read `AGENTS.md` and `README.md` first, then `MAP.md`, `spec/behavior.md`,
`spec/code-contract.md`, and every `spec/packages/*/behavior.md`. Work for **at
least five hours**. Spawn as many subagents as the work supports — finders fan
out by area, then separate agents try to **refute** what the finders claim.
Deliver **one PR**.

Your job is to **find bugs, not fix them**. Every bug is recorded as a failing
test and left failing. Fixing is the human's call tomorrow morning.

## Why you exist

The suite has 550+ scenarios and three basic features were still broken in the
deployed app (PR #259). Each hid in the same blind spot: the tests set the
world up the way the *code* finds convenient, not the way a *user* gets there.
A key was always set before the first request, so the engine never had to pick
up a new one. A lookup table was always staged by a test-only call, so nobody
noticed the app had no way to stage one. A validation message was only ever
produced under bun, so nobody noticed the bundler changed its wording.

You are the reader who asks, of every line of spec and code: what state gets
here that the author was not picturing?

## Method

**Fan out.** One finder per area — `core`/`headless` engine, CLI + REPL,
`file-io` and the codecs, `web` controller and its managers, lazy execution,
tutorial/cassette replay, voice, `model-config`, `table-view`, `chat-panel`,
`toolbar`, `gherkin-tour`, the Python export. Each finder reads its area's spec
*and* its code, and hunts for the gap between them.

**Then refute.** A second agent, which did not find it, tries to prove each
claim wrong: read the code again, find the guard the finder missed, check
whether the spec actually permits the behavior. A claim that survives a
genuine attempt to kill it gets written up. Two independent refutations that
fail is the bar for a critical finding.

**Then dedupe and rank.** Three symptoms of one cause are one finding.

## What to hunt

The shapes that produced real bugs here, and their neighbours:

- **State that outlives its reason.** What survives a file load, a model
  switch, a tour exit, an undo past the beginning, a cancelled run? The chat
  thread outliving its own history entries was exactly this.
- **State captured at construction.** Anything read once into a long-lived
  object — keys, models, page size, batch size, a `fetch`, a codec, a cached
  spec — and then changed underneath it. The API-key bug was exactly this.
- **Capabilities with no way in.** Engine features no UI can reach on some
  surface, or that only a test can set up. Browser joins were exactly this.
  Grep the step definitions for setup no user action can produce.
- **Environment drift.** Anything whose behavior differs between bun, Node, and
  the Rollup-built browser bundle: tree-shaking of side-effectful imports,
  `process.env`, timezone and locale, `structuredClone`, number formatting,
  `Intl`. Cassette fingerprints are computed from request bodies, so *any*
  wording that drifts between environments silently breaks tour replay.
- **Ordering and reentrancy.** Two requests racing, a cancel landing between
  commit and journal write, a config change mid-run, a dialog answered after
  the thing that raised it moved on, `busy` flags that can strand.
- **Undo/redo/history.** Jump to an entry, then edit; undo a load; redo after a
  fork; marks and reveal state after each; the lazy cell cache across all of it.
- **Error paths.** Every `catch` that swallows, every message that reaches a
  user, every classification of guidance-vs-app error, every path where a
  failure leaves half-applied state.
- **Data edges.** Empty file, one row, one column, duplicate column names,
  names that collide after a join's `_2` rename, BOM, CRLF, embedded newlines
  and quotes in CSV, unicode and RTL, very wide rows, nulls vs empty strings,
  numbers that look like dates, dates in several formats, values that survive
  a round trip through every codec.
- **Persistence.** `localStorage` shapes across versions — an old stored config
  or recents list meeting new code.
- **The spec against itself.** Two documents that describe the same behavior
  differently; a `spec/packages/*` claim the package does not honor. Those are
  findings too, but only when you can make code fail on the disagreement.

## What counts as a finding

A finding is a **reproducible failure**, not a code-reading opinion. For each:

1. A test that fails for the stated reason — a Gherkin scenario where the
   behavior is reachable through a surface, a bun unit test where it is not.
2. The actual failure output, pasted into the report.
3. One sentence on what a user loses.
4. The cause as `file.ts:line`, and the spec line it contradicts (or "unspecified"
   — an unspecified gap is still a finding if the behavior is plainly wrong).

Not findings: refactors you would prefer, missing features, naming, anything
the spec explicitly allows, and anything you cannot make fail. If you are
confident in a defect but cannot reach it from any surface, that is itself
worth reporting — put it in a short "unreachable but real" appendix, capped at
five, each with the reason it cannot be reached.

## Where red tests go

Keep `bun run test` **green** — a reviewer must be able to see your PR broke
nothing. The bug inventory lives apart, in `spec/test-cases/red/`: one
`red-<area>.feature` per area, every scenario tagged `@red` **and** its surface
tag. Step definitions for them go in `src/tests/red/*.steps.ts`. Wire it
exactly like this, so both of tonight's PRs produce a byte-identical diff and
merge cleanly:

- in `src/cucumber.js`, add the `red` dir to feature discovery, add
  `and not @red` to `tagsFor`, and export a `red` profile whose tags are `@red`
  (no surface filter);
- in `src/package.json`, add `"test:red": "bun --bun cucumber-js --profile red"`.
- If `main` already has this wiring when you rebase, keep the existing copy.

Unit-test findings go in `*.red.test.ts` next to the code, excluded from
`bun test` by the same convention (add the glob exclusion in `bunfig.toml` and
a `test:red:unit` script).

Every red test must fail **for its bug**, not for a typo. Run `bun run test:red`
and confirm each failure message names the defect.

## The report

`spec/test-cases/red/README.md`, as a table: ID, severity (critical / major /
minor), one-line symptom, the test that proves it, the cause, and the spec line
it contradicts. Below the table, a paragraph per critical and major finding —
what happens, why the code does it, and what the fix would have to consider.
No fixes, but a fix hint saves the human an hour.

Severity calibration, from the three real bugs: a feature dead in the deployed
app is **critical**; a feature that works only after a reload, or that silently
discards user work, is **major**; a wrong label is **minor**.

## Working rules

- Never re-record or delete a cassette. You have no API keys; everything runs
  offline from committed recordings.
- Never change product code under `src/packages/*/`. The only non-test edits
  allowed are the red-harness wiring above.
- Never edit an existing green scenario to make room for a finding.
- Commit every hour or so, with the findings file updated — a five-hour session
  that loses its work at hour four is worth nothing.
- Ten or more verified findings is the bar. A finder that reports nothing has
  not looked hard enough; a finder that reports twenty unverified guesses has
  wasted the reviewer's morning. Verified beats numerous.

Open the PR when the timebox is up. Title it as a bug inventory, not a fix, and
lead the body with the findings table. Do not merge.
