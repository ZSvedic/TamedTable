# Features

Each row tracks one user-facing feature: where it ships (HDLS, CLI, Web), which Gherkin scenario covers it, and the latest test results. Click an ID to find every place in the repo that references it.

| Feature | ID | HDLS | CLI | Web | Gherkin | Pass | Fail | Last tested |
|---|---|---|---|---|---|---|---|---|
| Batch execute | [#BatchExec](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23BatchExec&type=code) | - | ✓ | - | - | - | - | - |
| Cancellation | [#CancelOp](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CancelOp&type=code) | ✓ | ✓ | ✓ | [cancelation.feature](test-cases/cancelation.feature) | 0 | 3 | 2026-05-27 16:01 |
| CLI flags and discovery | [#CliFlags](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CliFlags&type=code) | - | ✓ | - | [cli-flags.feature](test-cases/cli-flags.feature) | 6 | 0 | 2026-05-27 16:01 |
| Column split | [#ColSplit](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ColSplit&type=code) | ✓ | ✓ | ✓ | [colsplit.feature](test-cases/colsplit.feature) | 8 | 0 | 2026-05-27 16:01 |
| Data normalization | [#DataNorm](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23DataNorm&type=code) | ✓ | ✓ | ✓ | [datanorm.feature](test-cases/datanorm.feature) | 1 | 7 | 2026-05-27 16:01 |
| Debug output | [#DebugOut](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23DebugOut&type=code) | ✓ | ✓ | - | [debug.feature](test-cases/debug.feature) | 3 | 0 | 2026-05-27 16:01 |
| Deduplication | [#Dedupe](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Dedupe&type=code) | ✓ | ✓ | ✓ | [dedupe.feature](test-cases/dedupe.feature) | 1 | 2 | 2026-05-27 16:01 |
| Filter rows | [#FilterRows](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23FilterRows&type=code) | ✓ | ✓ | ✓ | [filter.feature](test-cases/filter.feature) | 1 | 2 | 2026-05-27 16:01 |
| Group and aggregate | [#Aggregate](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Aggregate&type=code) | ✓ | ✓ | ✓ | [aggregate.feature](test-cases/aggregate.feature) | 6 | 0 | 2026-05-27 16:01 |
| LLM cell placeholders | [#LLMCells](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23LLMCells&type=code) | ✓ | ✓ | ✓ | [placeholders.feature](test-cases/placeholders.feature) | 6 | 0 | 2026-05-27 16:01 |
| Lookup join | [#LookupJoin](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23LookupJoin&type=code) | ✓ | ✓ | ✓ | [join.feature](test-cases/join.feature) | 7 | 0 | 2026-05-27 16:01 |
| Pivot and unpivot | [#PivotData](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23PivotData&type=code) | ✓ | ✓ | ✓ | [pivot.feature](test-cases/pivot.feature) | 6 | 0 | 2026-05-27 16:01 |
| Python export | [#PyExport](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23PyExport&type=code) | ✓ | ✓ | - | [save-py.feature](test-cases/save-py.feature) | 4 | 0 | 2026-05-27 16:01 |
| Record and replay cassettes | [#Cassettes](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Cassettes&type=code) | ✓ | ✓ | - | [cassettes.feature](test-cases/cassettes.feature) | 5 | 0 | 2026-05-27 16:01 |
| REPL commands | [#ReplCmds](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ReplCmds&type=code) | - | ✓ | - | [repl-commands.feature](test-cases/repl-commands.feature) | 37 | 2 | 2026-05-27 16:01 |
| Row and dataset validation | [#Validate](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Validate&type=code) | ✓ | ✓ | ✓ | [validate.feature](test-cases/validate.feature) | 6 | 0 | 2026-05-27 16:01 |
| Select columns | [#ColSelect](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ColSelect&type=code) | ✓ | ✓ | ✓ | - | - | - | - |
| Sort rows | [#SortRows](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23SortRows&type=code) | ✓ | ✓ | ✓ | [sort.feature](test-cases/sort.feature) | 3 | 0 | 2026-05-27 16:01 |
| SQL expressions | [#SqlExpr](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23SqlExpr&type=code) | ✓ | ✓ | ✓ | [sql.feature](test-cases/sql.feature) | 4 | 6 | 2026-05-27 16:01 |
| Tabular format output | [#FormatOut](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23FormatOut&type=code) | ✓ | ✓ | ✓ | [convert.feature](test-cases/convert.feature) | 10 | 0 | 2026-05-27 16:01 |
| Web UI | [#WebUI](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23WebUI&type=code) | - | - | ✓ | [web.feature](test-cases/web.feature) | 27 | 0 | 2026-05-27 16:01 |
