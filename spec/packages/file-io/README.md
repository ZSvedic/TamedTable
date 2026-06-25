# file-io

File input/output for tables: the format **codec registry** (parse/serialize behind a load-on-demand `FormatCodec`), format detection, open/save dialogs (`FilePort`), URL fetching (`fetchTable`), and `.flow` serialization. The seam carries raw bytes, so binary formats plug in as one codec file each.

| What | Where |
|---|---|
| Behavior spec (shared contract) | [behavior.md](behavior.md) |
| Per-format quirks | [formats/csv.md](formats/csv.md), [formats/jsonl.md](formats/jsonl.md) |
| Gherkin scenarios | [file-io.feature](file-io.feature) |
| Code, step defs, demo | [../../../src/packages/file-io/](../../../src/packages/file-io/) |
| Live demo | https://zsvedic.github.io/TamedTable/demos/file-io/demo.html |
