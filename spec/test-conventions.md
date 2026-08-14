# Test conventions

How the Gherkin suite is organized and kept small. The scenarios themselves are
the map: read the `.feature` files directly: app behavior in
[`test-cases/`](test-cases/), library-package behavior in
[`packages/`](packages/). Scenario tags show which surfaces run a scenario
(`@headless`, `@cli`, `@web`), whether it is a marketing tour (`@tour`) and its
panel category (`@cat-…`), and `@offline` / `@scripted` / `@cancel` runner
modes.

**The default suite runs every feature file.** `src/cucumber.js` globs all of
`test-cases/` + `packages/`; `TAMEDTABLE_FEATURES=a,b` narrows it for local
iteration. A scenario that calls the model needs a committed cassette to replay
offline: one missing its tape is tagged `@needs-recording` and excluded from
the default run until `bun run test:record` makes the tape (record mode includes
those scenarios). No scenario carries the tag today: the last holdouts, the
Lazy AI execution tour and the `lazy-exec.feature` edge cases, recorded when
the lazy-execution implementation landed. (`datanorm.feature` was removed: its strict byte-golden NL
assertions were brittle and never recorded, and the normalization behavior is
covered offline by the clean-up / loadsave / multilingual scenarios.)

## Keeping `.feature` files small

Four levers, in rough order of safety. The first two are pure wins; the last two
trade something away: use them only where the note below says it's safe.

1. **Outline identical-shape scenarios.** When N scenarios differ only in inputs
   and expected values, fold them into one `Scenario Outline` with an `Examples`
   table (see `multilingual.feature`, `model-config.feature`, the `web.feature`
   URL-rejection rule). Two hard exceptions: **`@tour` scenarios must stay
   plain scenarios** (the tour parser skips outlines and the homepage deep-links
   each by exact name), and an outline over `@web` non-tour scenarios silently
   drops them from the browser **Dev dropdown** (same parser skip): acceptable,
   but note it.
2. **Use the plural assertion steps.** Replace a ladder of `And column "X" exists
   in the spec` with `Then columns exist in the spec: "A", "B", …` (and the
   `columns are absent from the current rows: …` mirror). Column names stay
   verbatim, so grep still finds them. Defined in `src/tests/common.steps.ts`.
3. **Combine tiny same-setup scenarios into one walkthrough**: the
   `loadsave.feature` trick. Safe **only** when assertions read *cumulative*
   output (e.g. `REPL stdout contains …`) and the session carries **no sticky
   state** between the merged steps. The four `repl-commands` clusters (`:help`,
   `:find`, `:load`, `:save`/`:save-flow`) qualify; the stateful ones (`:viewport`
   pins, `:undo`/`:redo` stack, `:show` viewport cursor) do **not**: leave them.
4. **Push library behavior down to `packages/*.feature`.** App feature files
   should keep only a thin integration pass; the exhaustive cases live in the
   package's own feature (see URL validation: `file-io.feature` owns the matrix,
   `web.feature` keeps one rejection outline).

**Failure clarity beats raw brevity.** A scenario name should still say what
broke. A 10-command walkthrough that asserts eight behaviors reports "walkthrough
failed" and makes you hunt: don't merge past the point where the name stops
describing the failure.

## Cross-file observations (DRY)

- **One showcase tour per homepage section, atomic scenarios for CI.** The
  `@tour` scenarios are the `showcase-*.feature` stories: one sample file,
  several phrases in sequence, and the homepage deep-links each by exact
  name. The old one-phrase scenarios stay in their per-feature files as plain
  `@web`/`@cli`/`@headless` CI coverage (and in the panel's Dev dropdown);
  don't re-tag them `@tour`.
- **URL validation lives in two layers, by design.**
  `packages/file-io/file-io.feature` owns the library matrix (blank / garbage /
  non-http / network / HTTP-status); `web.feature` keeps one `Scenario Outline`
  as the thin dialog integration pass. Resolved, no further folding.
- **`Export … data` + `Execute saved flow`** repeat across `filter` / `dedupe`
  (with sibling execute-flow scenarios in `convert`). Kept as per-op
  proof: each op's round-trip is worth its own scenario; fold only if the set
  grows past one-per-op.
- **`multilingual.feature`** is now 1 Spanish text tour + a 4-row text outline +
  5 voice scenarios. The voice ones each need their own clip and the Chinese one
  documents a real synthetic-audio gap: those stay separate.

