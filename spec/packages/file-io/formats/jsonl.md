# JSONL codec

`id: "jsonl"`, extensions `[".jsonl", ".ndjson"]`, content types
`["jsonl", "ndjson"]`. The golden-path text codec — pure JS, native
`JSON.parse`/`JSON.stringify`, never pulls a heavy engine. Shared contract (the
`FormatCodec` shape, the registry, detection): [../behavior.md](../behavior.md).

## Parse

`parse(bytes, name)` decodes the bytes as UTF-8 and reads one JSON object per
line:

- Blank lines (after trimming) are skipped.
- A line that is not valid JSON throws `<name>:<lineNumber> malformed JSON: <detail>`.
- Each row keeps its **native JSON types** — JSONL does not stringify like CSV.
- `columns` is the **union of keys across all rows**, in first-seen order (the
  order each key first appears, scanning rows top to bottom). A file with no
  data rows yields no columns and loads as an empty table.

## Serialize

`serialize(rows, columns?)` writes one JSON object per line and encodes the
result to bytes (UTF-8), with a trailing newline when there is any output:

- **With `columns`** (the `writeRows`/Save-data path): keys are emitted in that
  order, a missing key written as `null`, and any extra keys not in the list
  appended after.
- **Without `columns`**: each row is written verbatim in its own key order.
