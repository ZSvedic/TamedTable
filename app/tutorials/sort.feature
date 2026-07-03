# #SortRows
# sort evaluates a {js}, {sql}, or {llm} key — not only a JS one.
# a sort may carry a `limit` to keep only the top N rows.
Feature: Sort rows by a key

  Rule: A sort with a limit keeps only the top N rows

    @cli @offline
    Scenario: Sort by a {js} key, descending, limited to the top 2
      Given "sort-topn.flow" exists
      And the expected output is "sort-topn-expected.jsonl"
      When user runs "tamedtable execute sort-topn.flow --input sort-input.csv --output sort-topn-output.jsonl"
      Then exit code is 0
      And "sort-topn-output.jsonl" matches the expected output

  # #TutorialMode
  # Marketing "Deterministic → Sort or top-N" tour. Key-free @tour tour
  # deep-linked from the homepage; loads a sample, runs the phrase, and replays
  # from sort.json. @cat-deterministic groups it with filter/dedupe/join/pivot.
  Rule: The Sort top-N tour runs its phrase key-free

    @web @tour @cat-deterministic
    Scenario: Sort by revenue, top 10
      Given the TamedTable web app
      And load "sales.csv"
      And the expected output is "sort-tour-expected.jsonl"
      # The recorded edit sorts numerically desc and trims to the top 10 rows
      # (a filter), so 2 of the 12 sales rows visibly drop out.
      When query "sort by revenue, top 10"
      Then the spec has 2 transformations
      And no toast is shown
      And compare with the expected output
      And the current page shows 10 rows

  # Regression: the comparator ordered numeric strings as text ("10" before
  # "2"), so a CSV revenue column sorted alphabetically.
  Rule: Numeric strings compare as numbers, not text

    @cli @offline @regression
    Scenario: Sort by a bare column of numeric strings, descending
      Given "sort-column.flow" exists
      And the expected output is "sort-column-expected.jsonl"
      When user runs "tamedtable execute sort-column.flow --input sales.csv --output sort-column-output.jsonl"
      Then exit code is 0
      And "sort-column-output.jsonl" matches the expected output

  Rule: A sort key may be a column name or any Expr shape

    @cli @offline
    Scenario: Sort by a {js} key, descending
      Given "sort-js.flow" exists
      And the expected output is "sort-expected.jsonl"
      When user runs "tamedtable execute sort-js.flow --input sort-input.csv --output sort-output.jsonl"
      Then exit code is 0
      And "sort-output.jsonl" matches the expected output

    @cli @offline
    Scenario: Sort by a {sql} key, descending
      Given "sort-sql.flow" exists
      And the expected output is "sort-expected.jsonl"
      When user runs "tamedtable execute sort-sql.flow --input sort-input.csv --output sort-output.jsonl"
      Then exit code is 0
      And "sort-output.jsonl" matches the expected output
