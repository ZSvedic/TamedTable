# #OpenFlow
# The replay progress/cancel seam behind the web's flow-run dialog — the
# same setSpec the "Open .flow & run on current data…" path drives (the
# dialog UX itself is covered by web.feature § "A saved flow can be opened
# and run on the current table"). Offline: filter.flow is deterministic
# ({js} only), so no model call and no cassette.
Feature: Flow replay progress and cancel

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
