# Table view

The `@tamedtable/table-view` package owns how a table looks and feels: the
paged grid with cell selection, inline editing, and column drag-reorder, the
pagination bar, the status footer, and the pure pagination math behind them.
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
  status={controller.activityStatus()}    // 'idle' | 'running' | 'saved'
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

- Click a cell → `onSelectCell(absoluteRow, column)`; the selected cell tints
  and the footer reads `R<row+1> · <column>`.
- Double-click a cell → an inline editor opens; Enter or blur commits through
  `onEditCell(absoluteRow, column, value)`, Escape cancels.
- Drag a header onto another → the dragged column lands at the target's
  position and `onReorderColumns` receives the full new order. The drag grip
  appears on header hover.
- `streaming` shows a sticky "Streaming results…" banner; `status` drives the
  footer dot (accent pulse while running, ok when saved).
- A 0-row table states "This table has 0 rows."; the range readout shows
  `<first>–<last> of <total> rows`.

All styling reads ui-kit theme tokens via `useTheme()`; the pulse and
grip-reveal animations ship inside the component. Stable attributes for
tests: `data-tv-header`, `data-tv-cell="<absRow>:<col>"`, `data-tv-edit`,
`data-tv-range`, `data-tv-selection`, `data-tv-status`, `data-tv-streaming`.

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
banner and the footer status. Every callback appends to the `#out` event log,
non-empty on load — the demo smoke test's ready signal.
