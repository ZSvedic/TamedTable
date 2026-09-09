# HTML codec

`id: "html"`, extensions `[".html", ".htm"]`, content types `["html"]`. A web
page's `<table>` elements, read with `htmlparser2` (pure JS, same code in Node
and the browser). Load-only: the codec has no `serialize`, so a save to
`.html` fails with `cannot save as HTML: load-only format`. Shared contract
(the `FormatCodec` shape, the registry, detection, the table pick):
[../behavior.md](../behavior.md).

Most pages are fetched by URL, and a page address rarely ends in `.html`:
the `text/html` Content-Type is what detects the format, and the URL's
`#fragment` is the table pick (spec/behavior.md § Opening a workbook or a
web page).

## Tables in a page

`listTables(bytes, name)` decodes the bytes as UTF-8 and lists every
`<table>` in document order, nested ones included, each on its own:

- name: the `<caption>` text, else the `id` attribute, else `Table <n>`
- location: `table <n> of <N>`
- header: the first row that holds a `<th>` cell, else the first row; rows
  before the header are skipped
- rows: every row after the header, `tfoot` included; a row with no cells is
  dropped

A page with no `<table>` lists nothing, and the load fails with `<name>: no
table found`.

## Parse

`parse(bytes, name, table)` reads the candidate `table` names (the 1-based
index from `listTables`) and returns its rows + column order. A cell's value
is its text: entities decoded, `<script>` and `<style>` content ignored,
whitespace collapsed to single spaces and trimmed, an empty cell `null`. A
`colspan` repeats the cell's slot, the value in the first slot and `null` in
the rest (in the header that is a `column<i>` name); `rowspan` is not
expanded. Header cells become the column names with the same blank and
duplicate rules as XLSX: `column<i>` for a blank, `_2`, `_3` for a repeat.
A row longer than the header widens the table with `column<i>` columns; a
shorter row pads with `null`.
