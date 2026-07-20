# #TableView
# The table display package: paged grid with selection, inline editing, and
# column drag-reorder and resize, plus the pure pagination model behind the pager.
Feature: Table view package

  Rule: The pagination model is pure math

    @headless
    Scenario: There is always at least one page
      Then pageCountFor 0 rows at size 10 is 1
      And pageCountFor 95 rows at size 10 is 10

    @headless
    Scenario: Out-of-range pages clamp into range
      Then clampPage 0 of 10 pages is 1
      And clampPage 99 of 10 pages is 10
      And clampPage 3 of 10 pages is 3

    @headless
    Scenario: The last page holds the remainder
      Then pageSlice of 95 rows at size 10 page 10 has 5 rows
      And pageSlice of 95 rows at size 10 page 1 has 10 rows

    @headless
    Scenario: Short pagers render every page number
      Then the page list for page 1 of 7 is "1,2,3,4,5,6,7"

    @headless
    Scenario: Long pagers window around the current page
      Then the page list for page 17 of 40 is "1,…,16,17,18,…,40"

    @headless
    Scenario: A cursor near the edge keeps single steps reachable
      Then the page list for page 2 of 40 is "1,2,3,4,5,…,40"

  Rule: The demo page exercises the grid in a real browser

    @web
    Scenario: The first page renders with its range readout
      Given the table-view demo page
      Then the demo range reads "1–10 of 95 rows"
      And the demo table has 10 body rows
      And page 1 is the current page

    @web
    Scenario: Paging moves the visible window
      Given the table-view demo page
      When the user clicks next page
      Then the demo range reads "11–20 of 95 rows"
      When the user clicks page 10
      Then the demo range reads "91–95 of 95 rows"

    @web
    Scenario: Clicking a cell selects it
      Given the table-view demo page
      When the user clicks cell "2:name"
      Then the demo event log shows "select 2:name"

    @web
    Scenario: Double-clicking edits a cell and Enter commits
      Given the table-view demo page
      When the user edits cell "0:name" to "Grace"
      Then cell "0:name" shows "Grace"
      And the demo event log shows "edit 0:name=Grace"

    @web
    Scenario: Dragging a header reorders the columns
      Given the table-view demo page
      When the user drags the "age" header onto the "ID" header
      Then the first column header is "age"
      And the demo event log shows "reorder"

    @web
    Scenario: Dragging a header's right edge resizes the column
      Given the table-view demo page
      When the user drags the right edge of the "name" header 80 px right
      Then the "name" header is about 80 px wider

    @web
    Scenario: Resizing a column does not trigger a reorder
      Given the table-view demo page
      When the user drags the right edge of the "name" header 80 px right
      Then the demo event log does not show "reorder"
      And the first column header is "ID"

    @web
    Scenario: Columns still reorder after a resize
      Given the table-view demo page
      When the user drags the right edge of the "name" header 80 px right
      And the user drags the "age" header onto the "ID" header
      Then the first column header is "age"
      And the demo event log shows "reorder"

    @web
    Scenario: The streaming banner follows the streaming flag
      Given the table-view demo page
      When the user toggles streaming
      Then the streaming banner is visible

  Rule: The column menu sorts, filters, autofits, and deletes — the host applies

    # #LazyExec grid upgrades: sort/filter are host view state reported
    # through callbacks; the header shows the ▲/▼ and funnel marks.
    @web
    Scenario: Sort descending from the column menu reorders and marks the header
      Given the table-view demo page
      When the user opens the "age" column menu
      And the user picks "Sort descending"
      Then the "age" header shows the "desc" sort indicator
      And the demo event log shows "sort age desc"

    @web
    Scenario: Picking the active direction clears the sort
      Given the table-view demo page
      When the user opens the "age" column menu
      And the user picks "Sort descending"
      And the user opens the "age" column menu
      And the user picks "Sort descending"
      Then the demo event log shows "sort age off"

    @web
    Scenario: A filter narrows the rows and marks the header with a funnel
      Given the table-view demo page
      When the user opens the "city" column menu
      And the user filters by "Osaka"
      Then the demo range reads "1–10 of 19 rows"
      And the "city" header carries a funnel mark
      And the demo event log shows "filter city=Osaka"

    @web
    Scenario: Delete column reports to the host
      Given the table-view demo page
      When the user opens the "city" column menu
      And the user picks "Delete column"
      Then the demo event log shows "delete city"

    @web
    Scenario: Autofit sizes a stretched column back to its content
      Given the table-view demo page
      When the user drags the right edge of the "name" header 200 px right
      And the user opens the "name" column menu
      And the user picks "Autofit width"
      Then the "name" header is narrower than 200 px

  Rule: Row marks, pager dots, and changed cells surface the host's row state

    @web
    Scenario: Pending and failed rows mark their Row # cell
      Given the table-view demo page
      Then the row numbered 7 is marked "failed"
      And page 10 carries a pending dot
      When the user clicks page 10
      Then 5 rows on the page are marked "pending"

    @web
    Scenario: An edited cell tints as changed and remembers the previous value
      Given the table-view demo page
      When the user edits cell "0:name" to "Grace"
      Then cell "0:name" is marked changed with previous value "Person 1"

    @web
    Scenario: Sorting keeps original numbers in the Row # column
      Given the table-view demo page
      When the user opens the "age" column menu
      And the user picks "Sort descending"
      Then the first row number is not 1

  Rule: Cells copy, URLs link, and headers stay legible

    @headless
    Scenario: The default column width follows the title, clamped
      Then defaultColumnWidth of "ID" is 120
      And defaultColumnWidth of "Category" is 120
      And defaultColumnWidth of "Subcategory or theme" is 208
      And defaultColumnWidth of "An absurdly long column title nobody should type" is 240

    @headless
    Scenario: Only strict http URLs count as links
      Then urlHref of "https://example.org/p/1" is "https://example.org/p/1"
      And urlHref of "http://a.b/c?d=1" is "http://a.b/c?d=1"
      And urlHref of "justify.me" is null
      And urlHref of "see https://example.org" is null
      And urlHref of "ftp://example.org" is null

    @web
    Scenario: Cmd or Ctrl+C copies the selected cell
      Given the table-view demo page
      When the user clicks cell "2:name"
      And the user presses the copy shortcut
      Then the demo event log shows "copy 2:name=Person 3"

    @web
    Scenario: A URL cell renders as a link and a dotted word does not
      Given the table-view demo page
      Then cell "0:site" holds a link to "https://example.org/p/1"
      And cell "1:site" holds no link
