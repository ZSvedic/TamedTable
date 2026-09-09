# File IO

The `@tamedtable/file-io` package owns getting table files in and out: the
format **codecs** (parse/serialize) behind a load-on-demand registry, format
detection, the `FilePort` open/save dialog interface with its browser
implementation, fetching a table from a URL, and serializing a plan into a
`.flow` file. `core` owns only byte-acquisition: reading and writing files by
path with `node:fs`, and delegates every parse/serialize to this package's
registry (`loadCsv`/`writeRows` are thin `node:fs` wrappers over a codec). The
package holds no app state, no dialog flags, no toasts, no chat messages; the
host app wires outcomes into its own UI.

Per-format quirks live in their own pages, one per codec:

- [formats/csv.md](formats/csv.md): CSV (RFC 4180, header handling)
- [formats/jsonl.md](formats/jsonl.md): JSONL / NDJSON (one object per line)
- [formats/parquet.md](formats/parquet.md): Parquet (DuckDB reader/writer)
- [formats/arrow.md](formats/arrow.md): Arrow / Feather (apache-arrow IPC)
- [formats/xlsx.md](formats/xlsx.md): Excel workbook (zip + OOXML, pure JS)
- [formats/html.md](formats/html.md): HTML page tables (load-only)

## Worked example

The user types a URL into the web app's Open URL dialog. The controller calls:

```
table = await fetchTable("https://example.com/people.csv")
// → { name: "people.csv", bytes: <Uint8Array of "name,age\nAda,36\n…">, format: "csv" }
{ rows, spec } = await parseTable(table.name, table.bytes)
// → rows: [{ name: "Ada", age: "36" }, …], spec: { table: "people.csv", columns: […] }
```

and loads the rows into the engine via `Runner.loadParsed`. When the user later
picks "Save recipe as .flow…":

```
flow = serializeFlow(spec)
// → '{ "version": 2, "source": "people.csv", "spec": { … } }\n'
await filePort.pickSave("flow.flow", [".flow"], new TextEncoder().encode(flow))
// → { status: "saved", name: "my.flow" }
```

## Format codecs and the registry

Every format is a `FormatCodec` (declared in `@tamedtable/table-plan`), held in
a load-on-demand registry:

```
interface ParsedTable { rows; columns }            // columns: string[]
interface FormatCodec {
  id; extensions; contentTypes                      // synchronous descriptor
  parse(bytes, name, table?) → ParsedTable | Promise<…>  // text codecs decode synchronously
  serialize?(rows, columns, headers?) → Uint8Array | Promise<…> // absent on a load-only format
  listTables?(bytes, name) → TableCandidate[]       // formats that hold several tables
  load?() → Promise<void>                           // dynamic import of a heavy engine
}
```

`parse`/`serialize` may return a value or a Promise: the pure-JS text codecs
(CSV, JSONL) stay synchronous, while the binary codecs (Parquet via DuckDB,
Arrow via apache-arrow) are async. Every caller `await`s, so both shapes work.

The seam carries raw **bytes** (`Uint8Array`), not text, so a binary format
works the same as a text one: the codec decodes internally. The registry
exposes:

- `detectFormat(pathname, contentType)` / `formatForExtension(pathname)`: read
  the synchronous descriptor table (id + extensions + content types).
- `loadCodec(id)`: dynamic-`import()` the codec, pulling its parser only on
  first use, so a run never bundles a format it doesn't touch.
- `canSerialize(id)`: whether the format saves; `html` does not.
- `parseTable(name, bytes, { format?, table? })`: detect from `name` (or take
  `format`), parse the bytes, and build a fresh-load `TablePlan` (the
  browser's path-free counterpart to `core.loadCsv`). `table` is the pick
  for a multi-table format, below.

A new format is one codec file plus one registry row; `detectFormat` is a lookup
over the registry, not a hand-written `if` ladder.

## Tables inside a source

A workbook or an HTML page holds any number of tables, so its codec adds
`listTables(bytes, name)`, one `TableCandidate` per table:

```
{ index: 2, name: "Orders", location: "Orders!B3:E8", rowCount: 5,
  columns: ["OrderID", "Customer", "Amount", "Date"] }
```

`index` is 1-based and is what a `#<n>` pick names. `parseTable` lists the
candidates, then `chooseTable(name, candidates, pick?)` settles which one
`codec.parse(bytes, name, index)` reads:

- no candidate → throws `<name>: no table found`
- one candidate → it, pick or not
- several, no pick → throws `TableChoiceError`, whose message the host can
  show as-is: `<name> holds N tables; add #<n> or #<name> to pick one:`
  then one line per candidate,
  `  2. Orders (Orders!B3:E8): 5 rows: OrderID, Customer, Amount, Date`
- a pick → the candidate with that number, or the one whose name matches
  case-insensitively; nothing matching throws `<name>: no table "<pick>"`
  followed by the same list

`splitTableSelector(path)` takes the pick off a local path
(`report.xlsx#Orders` → `{ source: "report.xlsx", table: "Orders" }`), but
only when the part before the `#` ends in a multi-table extension, so a `#`
inside a CSV name stays a character. `formatForExtension` tolerates the
fragment the same way. For a URL the fragment is the pick whatever the
format: browsers never send it, and `fetchTable` returns it as `table`.
What the app does with a `TableChoiceError` is the host's call: the web
app raises its table picker, the CLI prints the message
(spec/behavior.md § Opening a workbook or a web page).

## FilePort

The dialog interface the host injects: the browser supplies the real one,
tests supply a stub:

```
hasFileSystemAccess: boolean
pickOpen(accept)                              → PickedFile | null   (null = cancelled)
pickSave(suggestedName, accept, contentBytes) → SaveOutcome
```

`PickedFile` is `{ name, bytes }`: the dialog seam carries raw bytes
(`Uint8Array`), so binary formats work the same as text and the codec decodes
internally. `pickSave`'s `content` is bytes too. `SaveOutcome` is
`{ status: "saved" | "downloaded", name }` or `{ status: "cancelled" }`.

`BrowserFilePort` (separate `browser-fs` entry point, DOM required) uses the
File System Access API where the browser has it. Where it doesn't, `pickOpen`
falls back to a hidden `<input type=file>` and `pickSave` to a download
anchor: that save resolves as `downloaded`, never `cancelled`.

Only a real user cancel maps to the quiet outcome: `BrowserFilePort` turns the
picker's `AbortError` into `null` (Open) or `{ status: "cancelled" }` (Save)
and rethrows every other error, so a genuine failure: permissions, disk:
surfaces instead of looking like a cancel.

## Format detection

`detectFormat(pathname, contentType)` returns a `FormatId`: `"csv"`,
`"jsonl"`, `"parquet"`, `"arrow"`, `"xlsx"`, or `"html"`, or `null`. The
path extension wins: `.csv` → csv; `.jsonl` or `.ndjson` → jsonl;
`.parquet` or `.pq` → parquet; `.arrow`, `.feather`, or `.arrows` → arrow;
`.xlsx` → xlsx; `.html` or `.htm` → html. Only when the path has no table
extension does the Content-Type header decide (any value containing one of
the registry's content-type tokens, e.g. `csv`, `ndjson`, `parquet`,
`feather`, `spreadsheetml`, `html`), which is how a page address with no
extension loads as HTML. Neither match → `null`.

`sampleNameFromUrl(url, format)` names the download: the URL's last path
segment, or `download.<format>` when the path has none.

## fetchTable

`fetchTable(url, fetch?)` validates, fetches, and returns a `PickedFile`
(name + bytes) plus the detected `format` and, when the URL carried a
`#fragment`, that fragment as `table`: the pick for a multi-table source
(the fragment is never sent). The optional second argument replaces global
`fetch` (tests, proxies). Every failure throws an `Error` whose message the
host can show as-is, in this order:

1. Blank input → `Enter a URL.`
2. Unparseable → `That doesn’t look like a valid URL.`
3. Protocol not http/https → `Only http:// and https:// URLs are supported.`
4. Network/CORS failure → `Couldn’t fetch <host>: network error or CORS blocked. (<detail>)`
5. Non-OK response → `Fetch failed: HTTP <status> <statusText>`
6. Format undetectable (path + Content-Type) → `Could not detect format. URL must end in .csv, .jsonl, .parquet, .arrow, .xlsx, or .html.`

## Flow serialization

`serializeFlow(spec)` wraps a `TablePlan` into the `.flow` file format:
pretty-printed JSON `{ version: 2, source, spec }` with a trailing newline.
`source` is the basename of `spec.table`, or `input.csv` when the spec has
no table.

`parseFlow(text)` is the inverse, the browser's flow reader (the CLI's
`execute` keeps its own path-based loader). It parses the text as JSON,
accepts `version` 1 or 2, validates `spec` through `validateTablePlan`,
and returns `{ source, spec }` (`source` falls back to `""` when the file
carries none). Anything else: bad JSON, another `version`, a spec the
schema rejects: throws with a message the host can show as-is.

## Demo page

The demo (`demo.html` + `demo.ts`, deployed under `/demos/file-io/`) drives
the real package: a capability line (`#fio-fsa`) reports whether the File
System Access API is live, Open (`#fio-open`) picks a local CSV/JSONL,
Fetch URL (`#fio-url` + `#fio-fetch`) runs `fetchTable`, and Save
(`#fio-save`) round-trips the loaded bytes through `pickSave`. The loaded
file renders as name (`#fio-name`), detected format (`#fio-format`), and a
20-line preview (`#fio-preview`, decoded from the bytes); failures land in
`#fio-error`, save
outcomes in `#fio-outcome`. A `serializeFlow` sample renders into `#out` on
load: the same ready signal the demo smoke test waits for.
