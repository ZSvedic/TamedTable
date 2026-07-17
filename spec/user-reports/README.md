# User reports

Failing inputs users reported, distilled into replayable fixtures — the data
half of a regression. Each report contributes the smallest file set that
reproduces the failure (a `.flow`, its source CSV); the Gherkin scenario that
replays it lives with the capability it tests in
[test-cases/](../test-cases/) (or a package spec), tagged `@regression`, per
[README.md § Regression scenarios](../README.md#regression-scenarios) —
scenarios stay organized by capability, fixtures keep their provenance here.

| Report | Fixtures | Scenario |
|---|---|---|
| 2026-07-17 — every `{sql}` step failed with `Parser Error: syntax error at or near "do"` on a chess-tournament CSV whose columns include the reserved word `do` and the punctuated `Organizator(i)` (PR #237) | `chess-tournaments.csv`, `chess-croatia-sql.flow` | [test-cases/sql.feature](../test-cases/sql.feature) § reserved-word columns |
