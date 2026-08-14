# User data

Real user-contributed files, two roles told apart by name: a plain name
(`chess-tournaments.csv`) is a **minimal repro**: the smallest file set that
reproduces a reported failure, loaded by an automated `@regression` scenario in
[test-cases/](../test-cases/) (or a package spec); an `-original` suffix
(`chess-tournaments-original.csv`) is the **full file as the user sent it**,
kept for manual testing only: the automated suite never reads it. Scenarios
stay organized by capability in `test-cases/`, per
[README.md § Regression scenarios](../README.md#regression-scenarios);
fixtures keep their provenance here.

| Report | Minimal repro (automated) | Original (manual) | Scenario |
|---|---|---|---|
| 2026-07-17: every `{sql}` step failed with `Parser Error: syntax error at or near "do"` on a chess-tournament CSV whose columns include the reserved word `do` and the punctuated `Organizator(i)` (PR #237) | `chess-tournaments.csv`, `chess-croatia-sql.flow` | `chess-tournaments-original.csv`, `chess-norm-aggregate.flow` | [test-cases/sql.feature](../test-cases/sql.feature) § reserved-word columns |

One extra file outside the repro pattern: `sorting-liked-videos.flow` is a
hand-saved example flow over
[test-cases/performance-liked-videos.csv](../test-cases/performance-liked-videos.csv),
kept for manual demos: the automated suite never reads it.
