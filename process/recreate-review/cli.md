# cli — keep the original code, consider its file split

Compares `src/packages/cli` here (55 KB) with the recreate's (22 KB). Command
set, flags, and table rendering match well. The input loop does not.

## Analysis

The recreate drops piped input. Piping `:save a.csv`, `:save b.jsonl`, `exit`
into it ran only the first save, then hung forever. Cause: it reads lines with
`rl.question()`, so any line arriving while a command is still running has no
listener and is thrown away. The original reads with
`for await (const line of rl)`, which queues every line — correct.
`spec/behavior.md` (batch mode) requires every piped line to run, so this is a
broken written rule, not a taste difference. The recreate's own tests miss it
because they inject input through a test-only path that real piped stdin never
takes.

Smaller recreate regressions: raw error text where the original prints friendly
messages for cancelled/budget errors, Ctrl-C only working in a terminal, exit
code 1 instead of 3 when the input file fails to load.

Done better in the recreate: the code is split into `index.ts` / `session.ts` /
`render.ts` / `help.ts`. The original is one 1000-line `index.ts`.

## Questions for you

- [ ] Split the original's `cli/index.ts` into the same four files? No behavior
      change; the win is readability, the cost is one big diff to review.
      Answer:

## Plan

1. Check `spec/test-cases/` for a scenario that pipes several commands at once
   (the bug class the recreate has). If none exists, add one — it documents
   behavior the original already has, so it passes right away.
2. If the split is approved: refactor `cli/index.ts` into
   `index.ts` / `session.ts` / `render.ts` / `help.ts`, mirroring the recreate's
   boundaries. Pure refactor: `cd src && bun run test` stays green, no spec
   change.
