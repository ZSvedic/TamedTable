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
      When query "add a Segment column: consumer or business"
      And user edits cell at row 150 column "Name" to "Zoe Quinn"
      When user goes to page 2
      Then cell at row 150 column "Name" shows "Zoe Quinn"
      And every row on the current page has a non-null "Segment"

  Rule: Simple mode restores table-wide execution

    @web
    Scenario: Always run on all rows evaluates the whole table after the estimate
      Given load "paginate-input.csv"
      And the setting "Always run on all rows" is on
      When query "add a Segment column: consumer or business" without waiting
      Then the run-all confirmation is shown
      When user confirms the run
      Then every row has a non-null "Segment"
      And no evaluated-rows readout is shown
