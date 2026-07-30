# CSV codec

`id: "csv"`, extensions `[".csv"]`, content types `["csv"]`. The golden-path
text codec — pure JS, never pulls a heavy engine. Shared contract (the
`FormatCodec` shape, the registry, detection): [../behavior.md](../behavior.md).

## Parse

`parse(bytes, name)` decodes the bytes as UTF-8, then reads them with
`csv-parse`:

- **Header row required.** The first *record* is the column list, returned as
  `columns` — parsed as arrays, so a quoted newline inside a header field (a
  valid RFC 4180 record, including files TamedTable itself saved) is one column,
  not a truncated header. `core.loadCsv` rejects an empty header
  (`<path> has no header row`) and a duplicate column name
  (`<path> has duplicate column "X"`); `parseTable` (the browser path) makes the
  same two checks against `name`.
- **Whitespace.** `trim: true` — leading/trailing whitespace around an
  *unquoted* field is stripped; whitespace inside quotes is preserved verbatim.
- **BOM tolerated** (`bom: true`); blank lines skipped (`skip_empty_lines`) for
  both the header and the rows, so a file that opens with a blank line still
  loads its real header.
- A column named `__proto__` lands as an own property (never the prototype
  setter), so its cells survive the parse.
- **Ragged rows reject the file.** A row with fewer or more cells than the
  header throws (`Invalid Record Length: …` from `csv-parse`) — the file is
  never silently padded or truncated.
- Every value stays a **string** — the runtime never infers numbers or dates;
  that is the LLM's job via a `mutate`.

## Serialize

`serialize(rows, columns)` emits RFC 4180 CSV via `csv-stringify` and encodes
the result to bytes (UTF-8, `\n` line endings, no BOM):

- A header row (the column `label` when set, otherwise the id — the CSV codec
  takes an optional `headers` list; other formats keep the ids), then one row
  per record in `columns` order.
- RFC 4180 quoting for cells containing commas, quotes, or newlines — and a
  lone CR, which RFC 4180 TEXTDATA excludes, so a value ending in CR survives a
  save→load round trip instead of being eaten by the record-delimiter
  auto-detection.
- A missing key (or a JS `undefined`) writes an empty cell; a nested value
  (`typeof === "object"`, non-null) round-trips through `JSON.stringify`.
