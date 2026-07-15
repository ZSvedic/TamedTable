# #OpenFlow
# Opening a saved .flow in the web app applies it to a table, with a
# progress dialog (expandable log, cancel) for long replays. Every scenario
# here is offline: filter.flow is deterministic ({js} only), so no model
# call and no cassette. The replay progress/cancel seam itself is
# headless — the same setSpec the web dialog drives.
Feature: Open and run a saved flow

  Rule: Opening a flow applies it to a table

    @web
    Scenario: Opening a flow runs it against the already-loaded table
      Given the TamedTable web app
      And load "filter-input.csv"
      When user says "Load CSV file"
      And user selects "filter.flow"
      Then the table has 4 rows
      And the undo history lists "Apply flow filter.flow"

    @web
    Scenario: Opening a flow with no table loaded asks for its input first
      Given the TamedTable web app
      When user says "Load CSV file"
      And user selects the flow "filter.flow" which then asks for its input
      Then a toast shows "needs its input table"
      When user selects "filter-input.csv"
      Then the table has 4 rows

    @web
    Scenario: An invalid flow file surfaces an error and changes nothing
      Given the TamedTable web app
      And load "filter-input.csv"
      When user says "Load CSV file"
      And user selects "filter-input.csv" renamed to "broken.flow"
      Then a toast shows "Could not open file"
      And the table has 10 rows

  Rule: A flow replay reports progress and honors cancel

    @headless
    Scenario: Flow replay reports each step as it starts
      Given load "filter-input.csv"
      When the flow "filter.flow" replays with progress tracking
      Then the replay reported step 1 of 1 as "filter" over 10 rows
      And the replayed table has 4 rows

    @headless
    Scenario: Cancelling a flow replay leaves the table unchanged
      Given load "filter-input.csv"
      When the flow "filter.flow" replays but is cancelled at the first step
      Then the replayed table has 10 rows
      And the replayed spec has 0 transformations
