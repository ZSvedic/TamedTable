# TamedTable I/O Roadmap

Client-side (browser, BYOK) file-format support beyond the current CSV + JSONL.
Every format below is a bounded file that loads fully into the existing data model
— no backend, no streaming model required. Backend-only / streaming-native formats
(Arrow Flight, Kafka, Delta/Iceberg/Hudi, ORC) are excluded.

Sizes are **approximate, gzipped** and version-dependent — confirm on bundlephobia
before committing. All sizes assume on-demand (`import()`) loading per detected file type.

---

## Phase 1 — Row-based schema formats

*Self-describing / schema-on-write: the schema is embedded in the file and maps
straight to rows. No user input needed at import.*

| Format | Client-side lib | ≈ size (gzip) | Lazy-loadable |
|--------|-----------------|---------------|---------------|
| [Parquet](https://parquet.apache.org/) | [hyparquet](https://github.com/hyparam/hyparquet) | ~10 KB | Yes |
| [Arrow / Feather](https://arrow.apache.org/) | [apache-arrow](https://arrow.apache.org/js/) | ~45 KB | Yes |
| [Avro](https://avro.apache.org/) | [avsc](https://github.com/mtth/avsc) | ~35 KB | Yes — schema embedded; flatten only if records nest |

---

## Phase 2 — Schema-on-read formats

*Not self-describing into rows. The user supplies the interpretation at import time
(delimiter, field widths, sheet/range, flatten expression, or a `.proto` schema).
"Schema-on-read" is more accurate than "schema-less" — Protobuf and Avro-IDL very
much need a schema; it's just provided at read time rather than carried by the file.*

| Format | Client-side lib | ≈ size (gzip) | Metadata needed from user | Lazy-loadable |
|--------|-----------------|---------------|---------------------------|---------------|
| [Excel (.xlsx/.xls)](https://ecma-international.org/publications-and-standards/standards/ecma-376/) | [SheetJS](https://sheetjs.com/) | ~140 KB | sheet, header row, cell range | Yes |
| [TSV / fixed-width / delimited](https://www.rfc-editor.org/rfc/rfc4180.html) | [Papa Parse](https://www.papaparse.com/) | ~7 KB | delimiter or field widths | Yes |
| [JSON (nested)](https://www.json.org/) | native `JSON.parse` | 0 | JSONPath / flatten expr | n/a (native) |
| [XML](https://www.w3.org/TR/REC-xml/) | [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) (or native `DOMParser`) | ~12 KB / 0 | XPath / flatten map | Yes (if lib) |
| [MessagePack](https://msgpack.org/) | [@msgpack/msgpack](https://github.com/msgpack/msgpack-javascript) | ~10 KB | flatten expr if nested | Yes |
| [Protobuf](https://protobuf.dev/) | [protobufjs](https://github.com/protobufjs/protobuf.js) | ~30 KB | `.proto` schema (user upload) | Yes |
| Google Sheets (export) | reuses CSV/XLSX path | 0 extra | sheet / range | n/a |

---

### Notes

- **SheetJS:** the public npm `xlsx` registry copy is stale (stuck at 0.18.5). The
  authoritative source is the SheetJS CDN / site, not npmjs — pin accordingly.
- **Arrow ↔ Parquet:** once an Arrow-based reader is in for Parquet, Feather is nearly
  free (same `apache-arrow` lib), so Phase 1 is cheaper than three separate adds suggest.
- **XML / JSON** cost **0 bytes** if you stay on native `DOMParser` / `JSON.parse`;
  the listed libs are only for ergonomic flattening.
- **LLM bound:** "row-based" here means loads cleanly into the model — it does **not**
  remove the per-chunk context-window limit on the transform step.
