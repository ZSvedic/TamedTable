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
- **Reveal** — an optional `reveal: { column, seq }` prop names the column
  the host wants on screen (the app passes the first changed column after a
  request commits, and again on undo/redo). Each new `seq` scrolls that
  column's header into view with a minimal nearest-edge scroll — a column
  already visible doesn't move — so appended columns surface without
  yanking the reader away from the columns beside them. The scroll itself
  is the React-free `revealHeader(th, stickyRight?)` on the main entry,
  shared with the app's phone grid (`stickyRight` clears a frozen left
  column the header would otherwise hide under).
- **Column menu** — every data header ends in a **⋮** button (revealed on
  hover, always tappable on touch) opening a per-column menu, grouped by
  hairline separators: **Sort ascending** / **Sort descending** (picking the
  active direction clears it) · **Filter…** (a small input popover,
  contains-match) / **Remove filter** (shown only when a filter is set, it
  reports an empty filter) · **Autofit width** · **Delete column**. Sort and
  filter report through `onSortChange(column, dir | null)` /
  `onFilterChange(column, text)` and are view state — the host reorders or
  narrows the rows it passes in. Delete reports `onDeleteColumn(column)`; what
  it means is the host's call (in the app it commits a spec step). The header
  itself shows the state: a ▲/▼ sort indicator and a funnel mark (an SVG
  funnel icon, distinct from the sort arrows) when a filter is active.
- **Autofit** — the menu entry, or double-clicking a visible column
  separator (the resize handle straddles the border and shows the
  `col-resize` cursor there), sizes that column to the wider of its widest
  data cell on the current page and its own header (title plus the grip and ⋮
  chrome), plus padding — so a short value never hides the column name. Same
  fixed-layout snapshot as a drag resize.
- **Row status marks** — rows carry an optional status: `pending` washes the
  row-number cell muted, `failed` marks it red. Retry is a host affordance
  (the app's pagination-bar readout), not a grid control.
- The row-number column's header reads **Row #** and accepts a host-supplied
  hover hint (the app explains original numbering while the view is
  shuffled).
- **Copy** — with a cell selected (and not editing), Cmd/Ctrl+C copies its
  text to the clipboard and reports `onCopyCell(row, column, text)`; a live
  text selection anywhere on the page takes precedence (the browser copy is
  never hijacked).
- **URL cells** — a cell whose entire value is a valid `http(s)://` URL
  renders as a link (new tab). Nothing looser: no bare-domain guessing, a
  value that merely contains a dot stays plain text.
- **Headers** — the ⋮ menu button is visually distinct, and header text
  reserves space for it: a title that doesn't fit ellipsizes ("Cat…")
  instead of running under the button. Under fixed layout, a column with no
  measured width defaults to one sized to its title (clamped to a sensible
  range).

All styling reads ui-kit theme tokens via `useTheme()`; the pulse and
grip-reveal animations ship inside the component. Stable attributes for
tests: `data-tv-header`, `data-tv-resize`, `data-tv-cell="<absRow>:<col>"`,
`data-tv-edit`, `data-tv-range`, `data-tv-streaming`, `data-tv-menu="<col>"`
(the ⋮ button), `data-tv-colmenu="<col>"` (the open menu, with
`data-tv-menu-item` entries and `data-tv-filter-input`), `data-tv-sort`,
`data-tv-filtered="<col>"`, `data-tv-rowstatus`, `data-tv-changed`, and
`data-tv-pending` (a marked pager button).

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
