# File IO

The `@tamedtable/file-io` package owns getting table files in and out of a
browser: the `FilePort` open/save dialog interface with its browser
implementation, file-format detection, fetching a table from a URL, and
serializing a spec into a `.flow` file. It does not own engine IO
(`loadCsv`/`writeRows` live in core) or any app state — no dialog flags, no
toasts, no chat messages; the host app wires outcomes into its own UI.

## Worked example

The user types a URL into the web app's Open URL dialog. The controller calls:

```
picked = await fetchTable("https://example.com/people.csv")
// → { name: "people.csv", text: "name,age\nAda,36\n…", format: "csv" }
```

and loads `picked` into the engine. When the user later clicks Save flow:

```
flow = serializeFlow(spec)
// → '{ "version": 2, "source": "people.csv", "spec": { … } }\n'
await filePort.pickSave("flow.flow", [".flow"], flow)
// → { status: "saved", name: "my.flow" }
```

## FilePort

The dialog interface the host injects — the browser supplies the real one,
tests supply a stub:

```
hasFileSystemAccess: boolean
pickOpen(accept)                        → PickedFile | null   (null = cancelled)
pickSave(suggestedName, accept, content) → SaveOutcome
```

`PickedFile` is `{ name, text }`. `SaveOutcome` is `{ status: "saved" | "downloaded", name }` or `{ status: "cancelled" }`.

`BrowserFilePort` (separate `browser-fs` entry point, DOM required) uses the
File System Access API where the browser has it. Where it doesn't, `pickOpen`
falls back to a hidden `<input type=file>` and `pickSave` to a download
anchor — that save resolves as `downloaded`, never `cancelled`.

## Format detection

`detectFormat(pathname, contentType)` returns `"csv"`, `"jsonl"`, or `null`.
The path extension wins: `.csv` → csv; `.jsonl` or `.ndjson` → jsonl. Only
when the path has no table extension does the Content-Type header decide
(any value containing `csv`, `jsonl`, or `ndjson`). Neither match → `null`.

`sampleNameFromUrl(url, format)` names the download: the URL's last path
segment, or `download.<format>` when the path has none.

## fetchTable

`fetchTable(url, fetch?)` validates, fetches, and returns a `PickedFile`
plus the detected `format`. The optional second argument replaces global
`fetch` (tests, proxies). Every
failure throws an `Error` whose message the host can show as-is, in this
order:

1. Blank input → `Enter a URL.`
2. Unparseable → `That doesn’t look like a valid URL.`
3. Protocol not http/https → `Only http:// and https:// URLs are supported.`
4. Network/CORS failure → `Couldn’t fetch <host> — network error or CORS blocked. (<detail>)`
5. Non-OK response → `Fetch failed: HTTP <status> <statusText>`
6. Format undetectable (path + Content-Type) → `Could not detect format. URL must end in .csv or .jsonl.`

## Flow serialization

`serializeFlow(spec)` wraps a core `Spec` into the `.flow` file format:
pretty-printed JSON `{ version: 2, source, spec }` with a trailing newline.
`source` is the basename of `spec.table`, or `input.csv` when the spec has
no table.

## Demo page

The demo (`demo.html` + `demo.ts`, deployed under `/demos/file-io/`) drives
the real package: a capability line (`#fio-fsa`) reports whether the File
System Access API is live, Open (`#fio-open`) picks a local CSV/JSONL,
Fetch URL (`#fio-url` + `#fio-fetch`) runs `fetchTable`, and Save
(`#fio-save`) round-trips the loaded text through `pickSave`. The loaded
file renders as name (`#fio-name`), detected format (`#fio-format`), and a
20-line preview (`#fio-preview`); failures land in `#fio-error`, save
outcomes in `#fio-outcome`. A `serializeFlow` sample renders into `#out` on
load — the same ready signal the demo smoke test waits for.
