# #TableView
# The table display package: paged grid with selection, inline editing, and
# column drag-reorder, plus the pure pagination model behind the pager.
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
      Then the footer selection reads "R3 · name"

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
    Scenario: The streaming banner follows the streaming flag
      Given the table-view demo page
      When the user toggles streaming
      Then the streaming banner is visible
      And the footer status is "running"
