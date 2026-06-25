# Arrow / Feather codec

`id: "arrow"`, extensions `[".arrow", ".feather", ".arrows"]`, content types
`["arrow", "feather", "vnd.apache.arrow"]`. A binary codec backed by
`apache-arrow` (pure JS — the same code runs in Node and the browser, with no
DuckDB extension). Shared contract: [../behavior.md](../behavior.md).

Arrow is read through apache-arrow rather than DuckDB because DuckDB's Arrow-IPC
file reader ships as a community extension that must be downloaded at runtime —
unavailable in the offline test/preview builds. apache-arrow has no such
dependency.

## Parse

`parse(bytes, name)` reads the Arrow IPC payload with `tableFromIPC` and returns
its rows + column order. `Int64`/`Uint64` columns arrive as JS `bigint` and are
normalized the same way the Parquet codec does (safe-range → Number, else
string). Multi-GB inputs log a warning.

## Serialize

`serialize(rows, columns)` writes the Arrow IPC **file** format (a.k.a. Feather
v2) with `tableToIPC(table, 'file')`. Every column is a nullable `Utf8` vector —
string-in/string-out, matching the CSV/JSONL and Parquet codecs — and the
explicit `Utf8` type keeps the schema stable even with zero rows. A missing key
or null writes a null; a nested value round-trips through `JSON.stringify`.
