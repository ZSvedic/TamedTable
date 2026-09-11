# XLSX codec

`id: "xlsx"`, extensions `[".xlsx"]`, content types `["spreadsheetml"]`. An
Excel workbook: a zip of OOXML parts. Pure JS in both runtimes (`fflate`
unzips, `htmlparser2` in XML mode reads the parts), so nothing downloads at
run time. Legacy `.xls` is not read. Shared contract (the `FormatCodec`
shape, the registry, detection, the table pick): [../behavior.md](../behavior.md).

## Tables in a workbook

`listTables(bytes, name)` walks the sheets in workbook order:

- A sheet with Excel table objects (`xl/tables/*.xml`, the ranges the author
  formatted as a table) yields one candidate per object, named as in Excel,
  located `Sheet!A1:D21`, its header the range's first row.
- A sheet without table objects yields its data block: from the first
  non-empty row to the last, from the leftmost non-empty column to the
  rightmost. The candidate takes the sheet's name. Leading **title** rows are
  skipped: a row that fills fewer than half the cells of the block's widest
  row, or that is merged across at least half the block's width, is a title,
  not a header. The first row that is neither is the header, and the range is
  measured again over the rows that remain (so `Sales!A1:E5` with a title in
  A1 lists as `Sales!A3:E5`). A block whose widest row fills a single cell is
  a one-column list and keeps its first row.
- A sheet with no cells yields nothing.

## Parse

`parse(bytes, name, table)` reads the candidate `table` names (the 1-based
index from `listTables`; `parseTable` settles the pick first) and returns its
rows + column order. Cells keep their Excel type:

- a shared or inline string, or a formula's cached text, is a string
- a number is a number; a boolean is `true`/`false`; an error (`#N/A`) is its
  text
- a number in a cell whose style is a date format (the built-in date ids or a
  custom format with day, month, or year codes) is ISO text: `2026-01-15`
  for a whole day, `2026-01-15T09:30:00` when it carries a time; the 1904
  date system is honoured
- an empty cell is `null`; a fully empty row is dropped

Header cells become the column names: a blank one is `column<i>` (1-based
position), a repeated one gets `_2`, `_3`, and so on. Rows shorter than the
header pad with `null`; a cell to the right of the header widens the table
with a `column<i>` column.

## Serialize

`serialize(rows, columns, headers)` writes one sheet, `Sheet1`. Row 1 is
`headers` when given (the column labels, as the CSV codec writes them),
otherwise the ids; then one row per record in `columns` order. Each cell is
typed by its value: a number is a numeric cell, a boolean a boolean cell, a
string an inline string, a nested value its `JSON.stringify` text, a missing
key or `null` an empty cell. A workbook TamedTable wrote lists exactly one
candidate, so it reloads without a pick.
