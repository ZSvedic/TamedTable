# #LazyExec
# Edge cases for page-first AI execution (behavior.md § Lazy AI execution).
# Written red in phase 3 of the lazy-AI plan
# (process/journal/2026-07-18-prompt-lazy-ai.md); phase 4 implements them
# slice by slice. Like the Lazy AI showcase tour, no surface tag selects
# these yet — @needs-recording is the standing marker that their cassettes
# cannot exist before the UI they exercise ships. Phase 4 tags each slice's
# scenarios @web and records the tapes.
Feature: Lazy AI execution edge cases

  Background:
    Given the TamedTable web app

  Rule: The page is the unit of AI work

    # paginate-input.csv holds 246 rows — 100-row pages leave a 46-row last
    # page. Opening it evaluates exactly those 46 rows, never a full wave.
    @needs-recording
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
    @needs-recording
    Scenario: Switching provider resizes pages but keeps row state
      Given load "paginate-input.csv"
      When query "add a Segment column: consumer or business"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      When user selects the provider "openrouter"
      Then the current page shows 25 rows
      And the evaluated-rows readout shows "100 of 246 rows evaluated"
      And the pager marks the pages with pending rows

    @needs-recording
    Scenario: A one-page file never sees a dialog and stays fully eager
      Given load "customers-input.csv"
      Then no large-file dialog is shown
      When query "Normalize Country names"
      Then column "Country" was normalized in the final state
      And no evaluated-rows readout is shown
      And no pager button carries a pending mark

  Rule: Row state survives undo, redo, cancel, and failure

    @needs-recording
    Scenario: Undo lowers row marks and redo restores them without new AI calls
      Given load "paginate-input.csv"
      When query "add a Segment column: consumer or business"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      When user undoes the last change
      Then no evaluated-rows readout is shown
      When user redoes the last change
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      And the redo made no new model call

    @needs-recording
    Scenario: Cancel mid-run keeps finished rows; the next run touches only the rest
      Given load "paginate-input.csv"
      When query "add a Segment column: consumer or business" via LLM
      And user runs on all rows
      And user cancels the run after at least one chunk has completed
      Then processing stops within 2 seconds
      And the table shows transformed values for already-processed rows
      When user runs on all rows
      Then the second run touches only pending and failed rows
      And every row has a non-null "Segment"

    @needs-recording
    Scenario: A mid-page failure marks exactly the failed rows and bulk retry clears them
      Given load "paginate-input.csv"
      And the LLM API fails for 3 rows of the first page
      When query "add a Segment column: consumer or business"
      Then exactly 3 rows are marked failed and keep their error
      And the readout offers "Retry 3 failed rows"
      When user retries the failed rows
      Then no row is marked failed
      And the evaluated-rows readout shows "100 of 246 rows evaluated"

  Rule: The shuffled view is only a view

    @needs-recording
    Scenario: Sorting the shuffled sample reorders the view; saving keeps original order
      Given load "showcase-lazy-input.csv"
      Then the large-file dialog offers "Load shuffled" and "Load in original order"
      When user loads the shuffled sample
      Then the Row # column keeps the original row numbers
      When user sorts column "Price" descending from the column menu
      Then the header of column "Price" shows the descending sort indicator
      And the visible rows are the shuffled sample ordered by Price
      When user saves as "showcase-lazy-output.csv"
      Then the saved file keeps the original row order

  Rule: The dependency rule gates reads of AI-made columns

    @needs-recording
    Scenario: Declining the dependency confirmation leaves no trace of the step
      Given load "paginate-input.csv"
      When query "add a Segment column: consumer or business"
      And query "keep only the business rows"
      Then the run-all confirmation is shown
      When user declines the run-all confirmation
      Then the spec contains no filter transformation
      And the table spans 3 pages
      And no history entry was added for the declined step

  Rule: Run on all rows and Save share one confirmation

    @needs-recording
    Scenario: Save with nothing pending writes directly
      Given load "customers-input.csv"
      When query "Normalize Country names"
      Then no evaluated-rows readout is shown
      When user saves as "customers-output.csv"
      Then no estimate dialog is shown
      And display Save File dialog

  Rule: Edits and evaluation

    @needs-recording
    Scenario: A cell edit on a pending page survives evaluation
      Given load "paginate-input.csv"
      When query "add a Segment column: consumer or business"
      And user goes to page 2
      And user edits cell at row 150 column "Name" to "Zoe Quinn" while the page is still evaluating
      Then the cell at row 150 column "Name" shows "Zoe Quinn"
      And every row on the current page has a non-null "Segment"
