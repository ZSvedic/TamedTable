# Parquet codec

`id: "parquet"`, extensions `[".parquet", ".pq"]`, content types `["parquet"]`.
A binary codec backed by DuckDB. Shared contract (the `FormatCodec` shape, the
registry, detection): [../behavior.md](../behavior.md).

## Engine

The codec calls a `{ readParquetBytes, writeParquetBytes }` engine that has two
implementations; the web build aliases the Node one to the browser one:

- **Node (CLI / headless):** `@duckdb/node-api`. Bytes are written to a
  short-lived temp file and read with `read_parquet`; writing is `COPY … TO …
  (FORMAT PARQUET)` to a temp file, then read back. node-api is a native addon,
  so it loads through a computed-specifier dynamic import — bundlers never
  follow it into the browser. Reads and writes Parquet offline.
- **Browser:** [hyparquet](https://github.com/hyparam/hyparquet) reads and
  [hyparquet-writer](https://github.com/hyparam/hyparquet-writer) writes — both
  pure JS. duckdb-wasm is *not* used for Parquet because its Parquet support
  autoloads an extension from `extensions.duckdb.org` at runtime, which fails in
  offline / locked-down environments (including the test and preview builds).
  hyparquet has no such dependency, so the web app's "Save data" can write
  Parquet client-side.

The codec itself is therefore runtime-agnostic — it just calls the engine.

## Parse

`parse(bytes, name)` reads the Parquet file and returns its rows + column order.
DuckDB infers the schema. `BIGINT`/`Int64` columns arrive as JS `bigint`; the
codec normalizes each cell the same way the engine's `{sql}` path does — a
safe-range bigint becomes a Number, anything larger a string. Very large inputs
(multi-GB) log a warning rather than failing silently.

## Serialize

`serialize(rows, columns)` writes every column as `VARCHAR`, mirroring the
engine's string-in/string-out cell model for CSV/JSONL, so a load→save→load
round-trip is stable. A missing key writes `NULL`; a nested value round-trips
through `JSON.stringify`.
