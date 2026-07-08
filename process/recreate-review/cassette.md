# cassette — keep the original

Compares `src/packages/cassette` here (3.8 KB) with the recreate's (19 KB). The
recreate is 5x bigger because of one added file, and that file is the problem.

## Analysis

The recreate added `matcher.ts` (18 KB): when a replay lookup misses, it
guesses the closest recording by comparing text content, and in some paths
makes up a response from scratch. It exists because the recreate could not
reproduce the original's exact request bytes, so strict lookups kept missing.

Both repos' specs say the opposite: "a changed prompt is always a miss, never a
silent stale hit." A guessing matcher can serve a wrong recording and make a
real regression look green. This is the main reason the recreate's passing test
suite proves little.

Everything else — recording format, hashing, the Node record/replay layer in
`src/tests/cassette.ts` — is equivalent in both repos.

## Questions for you

None.

## Plan

1. Code: no change. Never port `matcher.ts`.
2. Spec (optional, one line): add to the cassette section of
   `spec/code-contract.md` that replay never falls back to content matching.
   The strict rule is already written; this just closes the loophole the
   recreate used.
3. Docs-only change, so commit straight to `main` per CLAUDE.md.
