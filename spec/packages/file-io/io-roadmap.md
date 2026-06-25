# TamedTable I/O Roadmap

Client-side (browser, BYOK) file-format support beyond the current CSV + JSONL.
Every format below is a bounded file that loads fully into the existing data
model — no backend, no streaming model required. Backend-only / streaming-native
formats (Arrow Flight, Kafka, Delta/Iceberg/Hudi, ORC) are excluded.

## The loader — DuckDB-Wasm

One engine reads the columnar and binary formats, in both runtimes:

- **Node (CLI / headless)** already embeds DuckDB (`@duckdb/node-api`) for
  `{sql}` transformations. It reads CSV, JSON, Parquet, and Arrow natively, and
  Avro / Excel via extensions.
- **Browser** currently *stubs DuckDB out* (`web/src/shims/duckdb.ts` throws),
  so `{sql}` is dead in the web build. Phase 1 adds **duckdb-wasm** to the
  browser, which (a) reads the same formats client-side via
  `registerFileBuffer(bytes)` and (b) **re-enables `{sql}` transforms in the
  web build** — one dependency, two wins.

Cost and shape:

- duckdb-wasm is a multi-MB wasm payload. It is **lazy-loaded** — pulled only the
  first time a non-CSV/JSON file is opened or a `{sql}` transform runs. The
  CSV/JSON golden path keeps its tiny pure-JS parsers (`csv-parse`, native
  `JSON.parse`) and never pays for the wasm.
- DuckDB infers the schema; the codec maps its Arrow result to the existing
  `Row[]` + column list. Mind the BIGINT→`bigint` mapping `core` already handles
  for `{sql}`.
- DuckDB does **not** cover everything. Formats that aren't DuckDB-native and
  need a user-supplied schema (XML, Protobuf) stay bespoke — see Phase 2.

## Phase 1 — columnar & self-describing (one DuckDB integration)

Self-describing / schema-on-write: the schema rides in the file, so import needs
no user input. With DuckDB wired in, each format is a reader call, not a new
library.

| Format | Reader | Status |
|--------|--------|--------|
| [Parquet](https://parquet.apache.org/) | DuckDB `read_parquet` / `COPY … (FORMAT PARQUET)` | **shipped** — load + save, both runtimes |
| [Arrow / Feather](https://arrow.apache.org/) | `apache-arrow` IPC (`tableFromIPC` / `tableToIPC`) | **shipped** — load + save, both runtimes |
| [Avro](https://avro.apache.org/) | `read_avro` (community extension) | pending — see note below |

Arrow uses `apache-arrow` rather than DuckDB: DuckDB's Arrow-IPC file reader is a
community extension that downloads at runtime, which the offline test/preview
builds can't fetch. apache-arrow is pure JS with no such dependency and reads
and writes Arrow IPC identically in Node and the browser.

The DuckDB groundwork was one-time: duckdb-wasm in the web bundle, a shared
Parquet engine (node-api + temp file in Node, `registerFileBuffer` /
`copyFileToBuffer` in the browser), one `FormatCodec` per format mapping the
result to rows. After that, a new self-describing format is a registry row + a
`formats/<name>.md`.

> **Avro:** still pending — the `read_avro` community extension must first be
> confirmed to load under duckdb-wasm (the offline constraint that pushed Arrow
> to apache-arrow applies here too). If it can't, the `avsc` browser-only
> fallback is the alternative.

## Phase 2 — needs user input or a non-DuckDB parser

Not self-describing into rows: the user supplies the interpretation at import
(delimiter, field widths, sheet/range, flatten expression, or a schema).

**DuckDB-native — just surface the options in the import dialog:**

| Format | DuckDB reader | Metadata from user |
|--------|---------------|--------------------|
| TSV / delimited / fixed-width | `read_csv` (delim / columns options) | delimiter or field widths |
| [Excel (.xlsx)](https://ecma-international.org/publications-and-standards/standards/ecma-376/) | `read_xlsx` (excel extension) | sheet, header row, cell range |
| [JSON (nested)](https://www.json.org/) | `read_json` + SQL flatten | JSONPath / flatten expr |
| Google Sheets (export) | reuses CSV / XLSX path | sheet / range |

**Bespoke — not DuckDB-native, keep a small dedicated lib:**

| Format | Client-side lib | ≈ size (gzip) | Metadata from user |
|--------|-----------------|---------------|--------------------|
| [XML](https://www.w3.org/TR/REC-xml/) | native `DOMParser` / [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) | 0 / ~12 KB | XPath / flatten map |
| [Protobuf](https://protobuf.dev/) | [protobufjs](https://github.com/protobufjs/protobuf.js) | ~30 KB | `.proto` schema (user upload) |
| [MessagePack](https://msgpack.org/) | [@msgpack/msgpack](https://github.com/msgpack/msgpack-javascript) | ~10 KB | flatten expr if nested |

### Notes

- **Excel / Avro extensions under wasm:** confirm the `excel` and `avro`
  extensions load in duckdb-wasm (autoload / community) before committing those
  formats; if either is flaky in wasm, fall back to a browser-only lib
  ([SheetJS](https://sheetjs.com/) for Excel, [avsc](https://github.com/mtth/avsc)
  for Avro). Sizes are approximate and version-dependent — confirm before adding.
- **XML / Protobuf:** DuckDB has no native reader and both need a user-supplied
  schema, so they stay bespoke regardless of DuckDB.
- **Bundle:** keep duckdb-wasm behind a dynamic `import()` so the CSV/JSON
  default never loads it. A single file in the ~10 MB → low-GB range is DuckDB's
  happy path; warn (don't silently choke) on multi-GB inputs.
- **LLM bound:** loading cleanly into the model does **not** remove the
  per-chunk context-window limit on the transform step.
