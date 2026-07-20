# Table view

The `@tamedtable/table-view` package owns how a table looks and feels: the
paged grid with cell selection, inline editing, column drag-reorder, and
column resize, the pagination bar, and the pure pagination math behind
them.
It owns no data and no page state — the host holds the rows and the current
page, passes the visible slice in, and hears about every gesture through
callbacks. The app's empty-state panel ("No file loaded") stays in the app:
it is app copy wired to app dialogs.

## Worked example

The web app's wrapper maps `WebController` onto the generic component:

```
<TableView
  id="tutorial-table-view"
  columns={spec.columns.map((c) => c.id)}
  rows={controller.pageRows()}            // just the visible page
  pageStart={(page - 1) * controller.pageSize}
  totalRows={controller.totalRows()}
  page={page} pageCount={controller.pageCount()}
  onPageChange={(p) => controller.goToPage(p)}
  selection={controller.selection}
  onSelectCell={…} onEditCell={…} onReorderColumns={…}
  streaming={controller.streaming}
/>
```

The controller keeps its `pageNum` field (the Cucumber suite drives paging
through it, no DOM involved) but delegates every calculation to this package.

## Pagination model (main entry, React-free)

- `clampPage(page, pageCount)` — clamp a 1-based page into `[1, pageCount]`;
  non-finite input lands on 1.
- `pageCountFor(totalRows, pageSize)` — number of pages, always at least 1.
- `pageSlice(rows, page, pageSize)` — the rows visible on a 1-based page.
- `buildPageList(current, total)` — the pager's number window: up to 7 pages
  render in full; beyond that the first and last page always show, the
  current page keeps one neighbour each side, `'…'` fills the gaps, and a
  cursor near either edge anchors enough pages to keep single steps reachable.

## TableView component (`./components` entry, react peer dependency)

A row-number column, sticky headers, and the visible rows. Gestures:

- Click a cell → `onSelectCell(absoluteRow, column)`; the selected cell
  tints.
- Double-click a cell → an inline editor opens; Enter or blur commits through
  `onEditCell(absoluteRow, column, value)`, Escape cancels.
- Drag a header onto another → the dragged column lands at the target's
  position and `onReorderColumns` receives the full new order. The drag grip
  appears on header hover.
- Drag the boundary between two headers → the column left of the boundary
  resizes. Each header's right edge is a narrow resize handle; hovering it
  shows the `col-resize` cursor, and dragging it never starts a header
  reorder. Widths are view state local to the component, keyed by column id
  (so a width follows its column through a reorder) and reset on remount —
  no callback fires and no spec patch is produced. On the first resize the
  component snapshots every column's rendered width and switches the table
  to fixed layout, so untouched columns keep their size instead of
  reflowing. A column can't shrink below a small floor that keeps its
  handle grabbable.
- `streaming` shows a sticky "Streaming results…" banner spanning the full
  table width even when the table overflows horizontally (the label stays
  pinned to the visible left edge). There is no status footer — selection
  shows on the cell itself, and run/save activity belongs to the host
  (chat progress, toasts).
- A 0-row table states "This table has 0 rows."; the range readout shows
  `<first>–<last> of <total> rows`.

Grid upgrades for lazy AI execution
([behavior.md § Lazy AI execution](../../behavior.md#lazy-ai-execution-lazyexec));
the host owns every piece of state, the grid renders and reports:

- **Changed cells** — the host passes per-cell changed flags with previous
  values; a changed cell tints, and hovering it shows a small
  `was: <previous>` tooltip.
- **Header sort** — clicking a header (not its grip or resize handle) cycles
  ascending → descending → off and shows a ▲/▼ indicator;
  `onSortChange(column, dir | null)` reports it. View state: the host sorts
  the rows it passes in, no spec patch is produced.
- **Filter row** — an optional row of per-column inputs under the header;
  `onFilterChange(column, text)` reports each edit and the host narrows the
  rows (contains-match). Same view-state rule.
- **Autofit** — double-clicking a resize handle sizes that column to its
  widest rendered cell (plus padding), same fixed-layout snapshot as a drag
  resize.
- **Row status marks** — rows carry an optional status: `pending` washes the
  row-number cell muted, `failed` marks it red and adds a retry control
  wired to `onRetryRow(absoluteRow)`.

All styling reads ui-kit theme tokens via `useTheme()`; the pulse and
grip-reveal animations ship inside the component. Stable attributes for
tests: `data-tv-header`, `data-tv-resize`, `data-tv-cell="<absRow>:<col>"`,
`data-tv-edit`, `data-tv-range`, `data-tv-streaming`, `data-tv-sort`,
`data-tv-filter="<col>"`, `data-tv-retry="<absRow>"`.

## Pagination component

`Pagination({ page, pageCount, onPageChange })` — prev/next chevrons
(disabled at the ends) around the `buildPageList` window; the current page is
outlined and carries `aria-current="page"`. Attributes: `data-tv-prev`,
`data-tv-next`, `data-tv-page="<n>"`. TableView embeds it; it also exports
standalone.

## Demo page

The demo (`demo.html` + `demo.tsx`, deployed under `/demos/table-view/`)
mounts the real TableView over 95 generated rows at page size 10, with plain
React state playing the host: edits mutate the sample rows, header drags
reorder the columns, paging works, and a "Toggle streaming" button drives the
banner. Every callback appends to the `#out` event log,
non-empty on load — the demo smoke test's ready signal.
