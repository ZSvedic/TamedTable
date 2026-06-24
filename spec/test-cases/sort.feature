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
      When query "sort by revenue, top 10"
      Then the spec has 1 transformation
      And no toast is shown

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
