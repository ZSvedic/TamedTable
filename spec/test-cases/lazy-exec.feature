# #LazyExec
# Edge cases for page-first AI execution (behavior.md § Lazy AI execution).
# Written red in phase 3 of the lazy-AI plan
# (process/journal/2026-07-18-prompt-lazy-ai.md); implemented and recorded in
# phase 4. Model calls replay from cassettes/lazy-exec.json
# (`TAMEDTABLE_CASSETTE=record TAMEDTABLE_FEATURES=lazy-exec bun run
# test:web` refreshes it); the shuffle scenario is deterministic and makes
# no model call at all.
Feature: Lazy AI execution edge cases

  Background:
    Given the TamedTable web app

  Rule: The page is the unit of AI work

    # paginate-input.csv holds 246 rows — 100-row pages leave a 46-row last
    # page. Opening it evaluates exactly those 46 rows, never a full wave.
    @web
    Scenario: The short last page evaluates exactly its rows
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      When user goes to page 3
      Then the current page shows 46 rows
      And the evaluated-rows readout shows "146 of 246 rows evaluated"

    # Row state is per row, never per page: OpenRouter's wave — and page —
    # is 25 rows, so switching re-derives every indicator without touching
    # a row or making a model call.
    @web
    Scenario: Switching provider resizes pages but keeps row state
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      When user selects the provider "openrouter"
      Then the current page shows 25 rows
      And the evaluated-rows readout shows "100 of 246 rows evaluated"
      And the pager marks the pages with pending rows

    @web
    Scenario: A one-page file never sees a dialog and stays fully eager
      Given load "customers-input.csv"
      Then no large-file dialog is shown
      When query "Normalize Country names"
      Then the spec has 1 transformation
      And no toast is shown
      And no evaluated-rows readout is shown
      And no pager button carries a pending mark

  Rule: Row state survives undo, redo, cancel, and failure

    @web
    Scenario: Undo lowers row marks and redo restores them without new AI calls
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      When user undoes the last change
      Then no evaluated-rows readout is shown
      When user redoes the last change without any model call
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"

    # Cancelling lands between waves: the first 100-row wave's results are
    # already cached, the last 46 rows stay pending. The second run touches
    # only those — 46 rows fit one page, so it runs without the dialog.
    @web
    Scenario: Cancel mid-run keeps finished rows; the next run touches only the rest
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      When user starts running on all rows
      Then the estimate dialog shows the rows remaining, estimated tokens, cost, and time
      When user confirms the run and cancels after the first chunk
      Then the evaluated-rows readout shows "200 of 246 rows evaluated"
      When user runs on all rows
      Then every row has a non-null "Segment"
      And no evaluated-rows readout is shown

    @web
    Scenario: A mid-page failure marks exactly the failed rows and bulk retry clears them
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      Given the LLM API fails for rows "User-105, User-110, User-115"
      When user goes to page 2
      Then exactly 3 rows on the current page are marked failed
      And the readout offers to retry 3 failed rows
      Given the LLM API recovers
      When user retries the failed rows
      Then no row is marked failed
      And the evaluated-rows readout shows "200 of 246 rows evaluated"

  Rule: The shuffled view is only a view

    # No AI step, no model call — deterministic, replayable offline.
    @web
    Scenario: Sorting the shuffled sample reorders the view; saving keeps original order
      When user drops the file "showcase-lazy-input.csv" onto the empty page
      Then the large-file dialog offers "Load shuffled" and "Load in original order"
      When user loads the shuffled sample
      Then the Row # column keeps the original row numbers
      When user sorts column "Price" descending from the column menu
      Then the view is sorted by "Price" descending
      When user says "Save data"
      And user saves as "showcase-lazy-input.csv"
      Then the saved file keeps the original row order

  Rule: The dependency rule gates reads of AI-made columns

    @web
    Scenario: Declining the dependency confirmation leaves no trace of the step
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      And query "keep only the business rows" without waiting
      Then the run-all confirmation is shown
      When user declines the run-all confirmation
      Then the spec contains no filter transformation
      And the table spans 3 pages
      And no history entry was added for the declined step

  Rule: Run on all rows and Save share one confirmation

    @web
    Scenario: Save with nothing pending writes directly
      Given load "customers-input.csv"
      When query "Normalize Country names"
      Then no evaluated-rows readout is shown
      When user says "Save data"
      Then no estimate dialog is shown
      And display Save File dialog

  Rule: Edits and evaluation

    @web
    Scenario: A cell edit on a pending page survives evaluation
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      And user edits cell at row 150 column "Name" to "Zoe Quinn"
      When user goes to page 2
      Then cell at row 150 column "Name" shows "Zoe Quinn"
      And every row on the current page has a non-null "Segment"

  Rule: Simple mode restores table-wide execution

    @web
    Scenario: Always run on all rows evaluates the whole table after the estimate
      Given load "paginate-input.csv"
      And load the file in original order
      And the setting "Always run on all rows" is on
      When query "add a Segment column: consumer or business" without waiting
      Then the run-all confirmation is shown
      When user confirms the run
      Then every row has a non-null "Segment"
      And no evaluated-rows readout is shown

  Rule: The column-menu gates offer a free evaluated-rows preview

    @web
    Scenario: Sorting an AI column can preview just the evaluated rows
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      When user sorts column "Segment" descending from the column menu without waiting
      Then the run-all confirmation is shown
      When user chooses to apply to evaluated rows only
      Then the first page is sorted by "Segment" descending with no blanks
      And the evaluated-rows readout shows "100 of 246 rows evaluated"

  Rule: Progress is honest and pages stream in

    @web
    Scenario: Opening a pending page streams its rows in
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      When user opens page 2 and sees the streaming banner while it evaluates
      Then every row on the current page has a non-null "Segment"
      And the newly evaluated cells carry the changed marker

    # Regression (feedback round 4): with a sort active, opening a tail page
    # evaluates it and then folds those rows into the sort — a sorted view must
    # read sorted on every page, not leave later pages in their pre-sort order.
    @web
    Scenario: Paging a sorted AI column keeps each page sorted
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Language column: the official language spoken in each City"
      When user sorts column "Language" ascending from the column menu without waiting
      Then the run-all confirmation is shown
      When user chooses to apply to evaluated rows only
      Then the current page is sorted by "Language" ascending
      When user goes to page 2
      Then the current page is sorted by "Language" ascending
      # Opening page 2 evaluates exactly page 2 — even though the ten cities
      # cycle and page 3's answers are already cached, page 3 stays pending
      # behind its pager mark until the reader opens it.
      And the evaluated-rows readout shows "200 of 246 rows evaluated"

    # Regression (feedback round 3): opening a pending page evaluates only that
    # page. Repeated data (the ten cities cycle) means page 2's answers are
    # already cached from page 1, but filling page 2 must not silently complete
    # page 3 — the readout climbs 100 → 200, and the pager keeps a pending mark.
    @web
    Scenario: Opening a page evaluates only that page, even when the rest is cached
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Language column: the official language spoken in each City"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      And the pager marks the pages with pending rows
      When user goes to page 2
      Then the evaluated-rows readout shows "200 of 246 rows evaluated"
      And the pager marks the pages with pending rows

    # Two AI columns land two chunks per row — the progress divides, so it
    # never reports more rows done than the table has.
    @web
    Scenario: Run-all progress counts rows, not cells
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      And query "add a Tier column: basic or premium, based on the Segment value"
      When user starts running on all rows
      Then the estimate dialog shows the rows remaining, estimated tokens, cost, and time
      When user confirms the run watching its progress
      Then the run-all progress peaked at 146 of 146 rows
      And every row has a non-null "Tier"

    # A save that had to run rows first parks behind one more click — the
    # browser only opens a save picker inside a user gesture, and the run
    # consumed the original one.
    @web
    Scenario: Save with pending rows runs first, then writes on a fresh click
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      When user says "Save data"
      Then the run-all confirmation is shown
      When user confirms the run
      Then the save-ready dialog is shown
      And no save dialog was opened yet
      When user clicks Save file in the save-ready dialog
      Then display Save File dialog
      When user saves as "paginate-input.csv"

    # Regression (feedback round 3): a page-open evaluation fills the visible
    # page with live calls AND silently refills every other row whose prompt is
    # already cached — the ten cities cycle, so the first page seeds them all,
    # and opening page 2 quietly fills the whole table. Those free refills went
    # from blank to a value too, so they must carry the changed marker; if only
    # the live calls are marked, a shuffled or sorted view shows one block
    # tinted and an identically filled block below it bare. The marker means
    # "filled by this request", so it accumulates across the pages the reader
    # opens instead of resetting to the last page.
    @web
    Scenario: Every cell an AI column fills carries the changed marker
      Given load "paginate-input.csv"
      And load the file in original order
      When query "add a Language column: the official language spoken in each City"
      Then every evaluated cell on the current page carries the changed marker
      When user goes to page 2
      Then every evaluated cell on the current page carries the changed marker
      When user goes to page 3
      Then every evaluated cell on the current page carries the changed marker

    # Regression (feedback round 4): ordinary successful work must reach the
    # diagnostics log. A completed request never fires a toast, so before this
    # the log held only saves/errors — a report copied after running a query
    # was empty, with no trace of the query that misbehaved.
    @web
    Scenario: A completed request lands in the diagnostics log
      Given load "paginate-input.csv"
      And load the file in original order
      When user sends the chat message "add a Segment column: consumer or business"
      Then a diagnostics event records the completed request naming "Segment"
