# #TutorialMode
# The "Be exact" showcase tour: one quarterly sales sheet through five
# deterministic steps: dedupe, lookup join, filter, pivot, sort. Every step
# runs in the SQL engine; the only model call per ask is the spec patch.
# Key-free @tour deep-linked from the homepage; replays from
# showcase-exact.json. Atomic scenarios stay in filter/sort/dedupe/pivot/join.
Feature: Be exact showcase tour

  Rule: One sales sheet is deduped, joined, filtered, pivoted, and sorted

    # The join's Region column is what the filter reads one ask later: the
    # lookup table is a silent prerequisite, hidden from the tour steps.
    @web @tour @cat-deterministic
    Scenario: Shape a quarterly sales report
      Given the TamedTable web app
      And load "showcase-exact-input.csv"
      And load the lookup table "join-country-codes.csv" with columns "Country, ISO, Region"
      And the expected output is "showcase-exact-expected.jsonl"
      When query "Remove the duplicated rows"
      Then no toast is shown
      And the current rows count is 22
      When query "Join with join-country-codes.csv on Country to add ISO and Region"
      Then no toast is shown
      And columns exist in the spec: "ISO", "Region"
      When query "Show only customers in Europe"
      Then no toast is shown
      And the current rows count is 12
      When query "Pivot Quarter into columns, with Revenue as the value"
      Then no toast is shown
      And columns exist in the spec: "Q1", "Q2", "Q3", "Q4"
      When query "Sort by Q4, descending"
      Then no toast is shown
      And the row where "Customer" is "Thames Analytics" has "Q4" equal to "25900"
      And compare with the expected output
