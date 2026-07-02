# Features

Each row tracks one user-facing feature: where it ships (Headless, CLI, Web) and which Gherkin scenario covers it. Click an ID to find every place in the repo that references it.

| Feature | ID | Hdls | CLI | Web | Gherkin |
|---|---|---|---|---|---|
| Batch execute | [#BatchExec](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23BatchExec&type=code) | - | ✓ | - | - |
| Cancellation | [#CancelOp](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CancelOp&type=code) | ✓ | ✓ | ✓ | [cancelation.feature](spec/test-cases/cancelation.feature) |
| CLI flags and discovery | [#CliFlags](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CliFlags&type=code) | - | ✓ | - | [cli-flags.feature](spec/test-cases/cli-flags.feature) |
| Column split | [#ColSplit](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ColSplit&type=code) | ✓ | ✓ | ✓ | [colsplit.feature](spec/test-cases/colsplit.feature) |
| Data normalization | [#DataNorm](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23DataNorm&type=code) | ✓ | ✓ | ✓ | [clean-up.feature](spec/test-cases/clean-up.feature) (phone/country/dates tours; also exercised by multilingual & loadsave) |
| Debug output | [#DebugOut](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23DebugOut&type=code) | ✓ | ✓ | - | [debug.feature](spec/test-cases/debug.feature) |
| Deduplication | [#Dedupe](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Dedupe&type=code) | ✓ | ✓ | ✓ | [dedupe.feature](spec/test-cases/dedupe.feature) |
| Diagnostics log | [#Diagnostics](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Diagnostics&type=code) | - | - | ✓ | [diagnostics.feature](spec/test-cases/diagnostics.feature) |
| Filter rows | [#FilterRows](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23FilterRows&type=code) | ✓ | ✓ | ✓ | [filter.feature](spec/test-cases/filter.feature) |
| Group and aggregate | [#Aggregate](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Aggregate&type=code) | ✓ | ✓ | ✓ | [aggregate.feature](spec/test-cases/aggregate.feature) |
| LLM cell placeholders | [#LLMCells](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23LLMCells&type=code) | ✓ | ✓ | ✓ | [placeholders.feature](spec/test-cases/placeholders.feature) |
| LLM output resilience | [#LlmLayer](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23LlmLayer&type=code) | ✓ | ✓ | ✓ | [model-resilience.feature](spec/test-cases/model-resilience.feature) |
| Performance benchmark | [#BenchPerf](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23BenchPerf&type=code) | ✓ | - | - | [performance.feature](spec/test-cases/performance.feature) |
| Model & batch-size sweep | [#BenchSweep](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23BenchSweep&type=code) | - | - | - | [benchmarks/README.md](benchmarks/README.md) (dev tool: `@tamedtable/bench`) |
| Lookup join | [#LookupJoin](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23LookupJoin&type=code) | ✓ | ✓ | ✓ | [join.feature](spec/test-cases/join.feature) |
| Pivot and unpivot | [#PivotData](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23PivotData&type=code) | ✓ | ✓ | ✓ | [pivot.feature](spec/test-cases/pivot.feature) |
| Provider & model selection | [#ProviderSelect](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ProviderSelect&type=code) | - | ✓ | ✓ | [model-config.feature](spec/packages/model-config/model-config.feature) |
| Settings panel | [#SettingsCards](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23SettingsCards&type=code) | - | - | ✓ | [web.feature](spec/test-cases/web.feature) |
| Python export | [#PyExport](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23PyExport&type=code) | ✓ | ✓ | ✓ | [save-py.feature](spec/test-cases/save-py.feature) |
| Record and replay cassettes | [#Cassettes](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Cassettes&type=code) | ✓ | ✓ | - | [cassettes.feature](spec/test-cases/cassettes.feature) |
| REPL commands | [#ReplCmds](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ReplCmds&type=code) | - | ✓ | - | [repl-commands.feature](spec/test-cases/repl-commands.feature) |
| Row and dataset validation | [#Validate](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Validate&type=code) | ✓ | ✓ | ✓ | [validate.feature](spec/test-cases/validate.feature) |
| Select columns | [#ColSelect](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ColSelect&type=code) | ✓ | ✓ | ✓ | - |
| Sort rows | [#SortRows](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23SortRows&type=code) | ✓ | ✓ | ✓ | [sort.feature](spec/test-cases/sort.feature) |
| SQL expressions | [#SqlExpr](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23SqlExpr&type=code) | ✓ | ✓ | ✓ | [sql.feature](spec/test-cases/sql.feature) |
| Tabular format output | [#FormatOut](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23FormatOut&type=code) | ✓ | ✓ | ✓ | [convert.feature](spec/test-cases/convert.feature) |
| Tutorial panel | [#TutorialMode](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23TutorialMode&type=code) | - | - | ✓ | [tutorial.feature](spec/test-cases/tutorial.feature) |
| Voice input (hold-or-tap + hands-free) | [#VoiceInput](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23VoiceInput&type=code) | - | - | ✓ | [voice.feature](spec/test-cases/voice.feature) |
| Web UI | [#WebUI](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23WebUI&type=code) | - | - | ✓ | [web.feature](spec/test-cases/web.feature) |

## Library packages

Each row is a self-contained library package with its own spec under `spec/packages/<name>/` — see [spec/packages/README.md](spec/packages/README.md) for the layout rules. The ID links to every file that references it.

| Area | ID | Description |
|---|---|---|
| Cassette replay | [#Cassettes](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Cassettes&type=code) | Shared fingerprint + replay primitives used by the test recorder and the browser tutorial player — no Node deps, browser-safe (`src/packages/cassette/`) |
| Chat panel | [#ChatPanel](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ChatPanel&type=code) | Chat sidebar with request detail, send/stop input row, and the hold-or-tap `MicButton` (`src/packages/chat-panel/`, spec at `spec/packages/chat-panel/`) |
| File IO | [#FileIO](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23FileIO&type=code) | Format codec registry (parse/serialize behind a load-on-demand `FormatCodec`, bytes seam), format detection, file open/save dialogs (`FilePort`), URL fetch, `.flow` serialization (`src/packages/file-io/`, spec at `spec/packages/file-io/`) |
| Table plan | [#TablePlanSchema](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23TablePlanSchema&type=code) | Zero-dependency base package: the `TablePlan` model + Zod schema (`validateTablePlan`), `Row`/`Expr`/`Transformation`, and the `FormatCodec` interface. Imported by both `core` and `file-io`; `core` re-exports it (`src/packages/table-plan/`) |
| Gherkin Tour parser + driver | [#GherkinTour](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23GherkinTour&type=code) | Zero-dep `.feature` parser (`parseTours`) plus a host-agnostic `TourDriver` + `TourAdapter` that runs the tour flow; the `./ui` export adds a Driver.js spotlight (the only `driver.js`-dependent entry point). `demo.html` tours itself through it (`src/packages/gherkin-tour/`, spec at `spec/packages/gherkin-tour/`) |
| Model config | [#ModelConfig](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ModelConfig&type=code) | Provider/key/model catalogue, config resolution, and the `ModelChooser` React component (`src/packages/model-config/`, spec at `spec/packages/model-config/`) |
| Table view | [#TableView](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23TableView&type=code) | Paged table grid with selection, inline edit, column drag-reorder, and the pure pagination model (`src/packages/table-view/`, spec at `spec/packages/table-view/`) |
| Toolbar | [#Toolbar](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Toolbar&type=code) | Top bar (brand lockup, file readout, action buttons) and the Open-from-URL dialog with sample quick-picks (`src/packages/toolbar/`, spec at `spec/packages/toolbar/`) |
| UI kit | [#UiKit](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23UiKit&type=code) | Brand design tokens plus the primitive React components — `Button`, `Icon`, `SplitButton`, `Toasts`, `ThemeProvider` (`src/packages/ui-kit/`, spec at `spec/packages/ui-kit/`) |
| Voice recording | [#VoicePort](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23VoicePort&type=code) | `VoicePort`, the MediaRecorder→WAV browser implementation, and `buildVoicePrompt` (`src/packages/voice-input/`, spec at `spec/packages/voice-input/`) |
| Hands-free voice capture | [#VoiceInput](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23VoiceInput&type=code) | `ContinuousVoicePort` + the `@ricky0123/vad-web` VAD wrapper (`vad.ts`, `browser-vad.ts` in `src/packages/voice-input/`) and the chat-panel `WaveButton` |

## App code areas

Each row is a logical area of the app implementation (core, headless, CLI, web). The ID links to every file that references it.

| Area | ID | Description |
|---|---|---|
| Main loop | [#MainLoop](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23MainLoop&type=code) | Top-level execution flow: parse → plan → execute → output |
| CLI parsing | [#CliParse](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CliParse&type=code) | Argument parsing and flag handling |
| Config and env | [#ConfigEnv](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ConfigEnv&type=code) | Environment variables and runtime configuration |
| LLM abstraction | [#LlmLayer](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23LlmLayer&type=code) | Prompt construction, model calls, response parsing |
| IO and formats | [#IoFormats](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23IoFormats&type=code) | File reading/writing, format detection, serialisation |
| Error handling | [#ErrHandle](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23ErrHandle&type=code) | Error types, user-facing messages, exit codes |
| Step execution | [#StepExec](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23StepExec&type=code) | Per-step runner: resolve, execute, validate result |
| Web shell | [#WebShell](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23WebShell&type=code) | The framework-agnostic `WebController` composition shell: composes the headless Runner with the domain managers (engine, patch, files, voice, config, tutorial); no DOM (`src/packages/web/src/controller.ts`) |
| Mobile shell | [#MobileShell](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23MobileShell&type=code) | The phone-width (≤768px) presentation: app bar with page pager, frozen-header/index table, five-action dock (Menu · Undo · History · Type · Speak), Type/Speak/History sheets, and a left menu drawer. Same controller as desktop — only the chrome differs (`src/packages/web/src/components/mobile/`, `useIsMobile.ts`); the History sheet reads the journal's `timeline()`/`jumpTo()` |
| Test utilities | [#TestUtils](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23TestUtils&type=code) | Shared helpers used only in the test suite |
| TablePlan schema | [#TablePlanSchema](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23TablePlanSchema&type=code) | Zod schema definition and validation for the TablePlan object |
| Patch apply | [#Patch](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23Patch&type=code) | RFC 6902 patch application, idempotence check, and undo/redo journal |
| DuckDB layer | [#DuckDB](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23DuckDB&type=code) | In-process DuckDB setup, relation registration, and SQL evaluation |
| CSV serialisation | [#CsvSerialize](https://github.com/search?q=repo%3AZSvedic%2FTamedTable%20%23CsvSerialize&type=code) | RFC 4180 CSV output, column ordering, and cell stringification |
