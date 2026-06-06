# Features

Each row tracks one user-facing feature: where it ships (Headless, CLI, Web), which Gherkin scenario covers it, and the latest test results. Click an ID to find every place in the repo that references it.

| Feature | ID | Hdls | CLI | Web | Gherkin | Pass | Fail | Last tested |
|---|---|---|---|---|---|---|---|---|
| Batch execute | [#BatchExec](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23BatchExec&type=code) | - | ✓ | - | - | - | - | - |
| Cancellation | [#CancelOp](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CancelOp&type=code) | ✓ | ✓ | ✓ | [cancelation.feature](spec/test-cases/cancelation.feature) | 0 | 3 | 2026-05-27 16:01 |
| CLI flags and discovery | [#CliFlags](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CliFlags&type=code) | - | ✓ | - | [cli-flags.feature](spec/test-cases/cli-flags.feature) | 6 | 0 | 2026-05-27 16:01 |
| Column split | [#ColSplit](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ColSplit&type=code) | ✓ | ✓ | ✓ | [colsplit.feature](spec/test-cases/colsplit.feature) | 8 | 0 | 2026-05-27 16:01 |
| Data normalization | [#DataNorm](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23DataNorm&type=code) | ✓ | ✓ | ✓ | [datanorm.feature](spec/test-cases/datanorm.feature) | 1 | 7 | 2026-05-27 16:01 |
| Debug output | [#DebugOut](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23DebugOut&type=code) | ✓ | ✓ | - | [debug.feature](spec/test-cases/debug.feature) | 3 | 0 | 2026-05-27 16:01 |
| Deduplication | [#Dedupe](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Dedupe&type=code) | ✓ | ✓ | ✓ | [dedupe.feature](spec/test-cases/dedupe.feature) | 1 | 2 | 2026-05-27 16:01 |
| Filter rows | [#FilterRows](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23FilterRows&type=code) | ✓ | ✓ | ✓ | [filter.feature](spec/test-cases/filter.feature) | 1 | 2 | 2026-05-27 16:01 |
| Group and aggregate | [#Aggregate](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Aggregate&type=code) | ✓ | ✓ | ✓ | [aggregate.feature](spec/test-cases/aggregate.feature) | 6 | 0 | 2026-05-27 16:01 |
| LLM cell placeholders | [#LLMCells](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23LLMCells&type=code) | ✓ | ✓ | ✓ | [placeholders.feature](spec/test-cases/placeholders.feature) | 6 | 0 | 2026-05-27 16:01 |
| Lookup join | [#LookupJoin](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23LookupJoin&type=code) | ✓ | ✓ | ✓ | [join.feature](spec/test-cases/join.feature) | 7 | 0 | 2026-05-27 16:01 |
| Pivot and unpivot | [#PivotData](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23PivotData&type=code) | ✓ | ✓ | ✓ | [pivot.feature](spec/test-cases/pivot.feature) | 6 | 0 | 2026-05-27 16:01 |
| Provider & model selection | [#ProviderSelect](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ProviderSelect&type=code) | - | ✓ | ✓ | [model-config.feature](spec/modules/model-config/model-config.feature) | 23 | 0 | 2026-06-06 |
| Settings panel redesign | [#SettingsCards](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23SettingsCards&type=code) | - | - | ✓ | [web.feature](spec/test-cases/web.feature) | 9 | 0 | 2026-06-06 |
| Python export | [#PyExport](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23PyExport&type=code) | ✓ | ✓ | - | [save-py.feature](spec/test-cases/save-py.feature) | 4 | 0 | 2026-05-27 16:01 |
| Record and replay cassettes | [#Cassettes](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Cassettes&type=code) | ✓ | ✓ | - | [cassettes.feature](spec/test-cases/cassettes.feature) | 5 | 0 | 2026-05-27 16:01 |
| REPL commands | [#ReplCmds](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ReplCmds&type=code) | - | ✓ | - | [repl-commands.feature](spec/test-cases/repl-commands.feature) | 37 | 2 | 2026-05-27 16:01 |
| Row and dataset validation | [#Validate](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Validate&type=code) | ✓ | ✓ | ✓ | [validate.feature](spec/test-cases/validate.feature) | 6 | 0 | 2026-05-27 16:01 |
| Select columns | [#ColSelect](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ColSelect&type=code) | ✓ | ✓ | ✓ | - | - | - | - |
| Sort rows | [#SortRows](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23SortRows&type=code) | ✓ | ✓ | ✓ | [sort.feature](spec/test-cases/sort.feature) | 3 | 0 | 2026-05-27 16:01 |
| SQL expressions | [#SqlExpr](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23SqlExpr&type=code) | ✓ | ✓ | ✓ | [sql.feature](spec/test-cases/sql.feature) | 4 | 6 | 2026-05-27 16:01 |
| Tabular format output | [#FormatOut](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23FormatOut&type=code) | ✓ | ✓ | ✓ | [convert.feature](spec/test-cases/convert.feature) | 10 | 0 | 2026-05-27 16:01 |
| Tutorial panel | [#TutorialMode](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23TutorialMode&type=code) | - | - | ✓ | [tutorial.feature](spec/test-cases/tutorial.feature) | 9 | 0 | 2026-06-05 |
| Web UI | [#WebUI](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23WebUI&type=code) | - | - | ✓ | [web.feature](spec/test-cases/web.feature) | 36 | 0 | 2026-06-06 |

## Code areas

Each row is a logical area of the implementation. The ID links to every file that references it.

| Area | ID | Description |
|---|---|---|
| Gherkin Tour parser | [#GherkinTour](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23GherkinTour&type=code) | Zero-dep `.feature` parser; returns `@tutorial` scenarios with typed `TourAction` steps (`src/packages/gherkin-tour/`, spec at `spec/modules/gherkin-tour/`) |
| Model config | [#ModelConfig](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ModelConfig&type=code) | Provider/key/model catalogue and config resolution; zero-dep module (`src/packages/model-config/`, spec at `spec/modules/model-config/`) |
| Main loop | [#MainLoop](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23MainLoop&type=code) | Top-level execution flow: parse → plan → execute → output |
| CLI parsing | [#CliParse](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CliParse&type=code) | Argument parsing and flag handling |
| Config and env | [#ConfigEnv](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ConfigEnv&type=code) | Environment variables and runtime configuration |
| LLM abstraction | [#LlmLayer](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23LlmLayer&type=code) | Prompt construction, model calls, response parsing |
| IO and formats | [#IoFormats](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23IoFormats&type=code) | File reading/writing, format detection, serialisation |
| Error handling | [#ErrHandle](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ErrHandle&type=code) | Error types, user-facing messages, exit codes |
| Step execution | [#StepExec](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23StepExec&type=code) | Per-step runner: resolve, execute, validate result |
| Web server | [#WebServer](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23WebServer&type=code) | HTTP layer, routes, WebSocket handling |
| Test utilities | [#TestUtils](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23TestUtils&type=code) | Shared helpers used only in the test suite |
| Spec schema | [#SpecSchema](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23SpecSchema&type=code) | Zod schema definition and validation for the spec object |
| Patch apply | [#Patch](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Patch&type=code) | RFC 6902 patch application, idempotence check, and undo/redo journal |
| DuckDB layer | [#DuckDB](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23DuckDB&type=code) | In-process DuckDB setup, relation registration, and SQL evaluation |
| CSV serialisation | [#CsvSerialize](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CsvSerialize&type=code) | RFC 4180 CSV output, column ordering, and cell stringification |
