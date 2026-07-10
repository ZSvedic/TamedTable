# headless — keep the behavior, adopt the file split

Compares `src/packages/headless` here (110 KB) with the recreate's (38 KB plus
what it moved into core). The original is one 74 KB `index.ts`; the recreate
split it into engine / sql / client / rate-limiter files — the best structural
idea in the whole recreate. But the rewrite silently dropped behavior.

## Analysis

What the recreate lost:

- **SpecJournal** — undo, redo, the history timeline, jump-to-a-point. Gone,
  along with its 15 tests.
- **Cell-model safety.** A per-cell model from a different provider gets sent
  to the wrong provider's API. The original coerces it to a same-provider
  model first.
- **Half of `diffPlans`.** It never reports reordered columns or removed
  transformations, so those plan edits display wrong.
- Smaller: pivot doesn't skip non-numeric cells (NaN risk), LLM split-reply
  parsing has no fallback for code fences.

One difference only you can rule on: **join multiplicity**. One left row
matches three right rows — the original outputs 1 row (lookup, first match),
the recreate outputs 3 (SQL style). Both specs are silent; both suites use
1-to-1 data so neither notices.

Nothing needs porting in — the original already has all the behavior. The
recreate's contribution is its layout.

## Questions for you

- [ ] Join, one row matching three: output 1 row (original, current) or 3 rows
      (recreate)? Answer: go with 3 rows (recreate's behavior)
- [ ] Split `headless/index.ts` into `engine.ts` (pure transformations),
      `sql.ts` (DuckDB), keeping `journal.ts` and putting the runner loop in
      `index.ts` — files stay inside headless? No behavior change. Answer: Yes, split.

## Plan

1. Write the join answer into `spec/code-contract.md` (join section) and add a
   Gherkin scenario with a 1-to-many fixture. If the answer is "3 rows", that
   is a behavior change: red first, then implement.
2. If the split is approved: move the code as described above, imports only —
   no logic edits. `cd src && bun run test` stays green, no spec change.
   Do this as its own commit, separate from step 1.
