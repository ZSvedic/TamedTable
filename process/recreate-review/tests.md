# tests — keep the original, steal one file

Compares `src/tests` here (162 KB, ~27 files) with the recreate's (123 KB, ~10
files). Same job — hooks, step definitions, cassette replay — different
consolidation, and one uneven trade.

## Analysis

Neither repo's "web" profile drives a real browser: both test the
`WebController` API headlessly. The differences are elsewhere:

- **Assertions.** Spot-checking shared scenarios: undo and CLI are equal, but
  on SQL cancel/recovery the original asserts the recovery prompt contains the
  actual DuckDB error text while the recreate only counts calls. The
  recreate's consolidation into four mega-files is cosmetic; its looser
  assertions are not.
- **Guard tests.** The original's four cross-cutting guards
  (`no-hardcoded-colors`, `icons-sync`, `voice-prompt-sync`,
  `tutorial-categories`) have no recreate equivalent.
- **Runner.** The recreate replaced `cucumber-js` profiles with its own
  `run-cucumber.ts`. It hardcodes three profiles, drops the perf profile, and
  loses the auto-discovery of new feature files. A re-implementation, not an
  improvement.
- **One genuine find: `curl-fetch.ts`.** In record mode, Bun's `fetch` cannot
  get through the Claude sandbox's proxy, so the recreate shells out to
  `curl`, which honors the proxy settings. That is why re-recording cassettes
  from a sandbox session works there and not here. Replay never uses it.

## Questions for you

None.

## Plan

1. Port `curl-fetch.ts` from TT-recreate's `src/tests/` and use it as the
   record-mode fetch fallback in `src/tests/cassette.ts`. Replay behavior
   unchanged; verify with `cd src && bun run test` (replay stays green) —
   an actual re-record still needs an API key and is not part of this task.
2. Everything else: no change.
