# CSV codec

`id: "csv"`, extensions `[".csv"]`, content types `["csv"]`. The golden-path
text codec — pure JS, never pulls a heavy engine. Shared contract (the
`FormatCodec` shape, the registry, detection): [../behavior.md](../behavior.md).

## Parse

`parse(bytes, name)` decodes the bytes as UTF-8, then reads them with
`csv-parse`:

- **Header row required.** The first row is the column list, returned as
  `columns`. `core.loadCsv` rejects an empty header (`<path> has no header row`)
  and a duplicate column name (`<path> has duplicate column "X"`); `parseTable`
  (the browser path) makes the same two checks against `name`.
- **Whitespace.** `trim: true` — leading/trailing whitespace around an
  *unquoted* field is stripped; whitespace inside quotes is preserved verbatim.
- **BOM tolerated** (`bom: true`); blank lines skipped (`skip_empty_lines`).
- Every value stays a **string** — the runtime never infers numbers or dates;
  that is the LLM's job via a `mutate`.

## Serialize

`serialize(rows, columns)` emits RFC 4180 CSV via `csv-stringify` and encodes
the result to bytes (UTF-8, `\n` line endings, no BOM):

- A header row of `columns`, then one row per record in `columns` order.
- RFC 4180 quoting for cells containing commas, quotes, or newlines.
- A missing key writes an empty cell; a nested value
  (`typeof === "object"`, non-null) round-trips through `JSON.stringify`.
