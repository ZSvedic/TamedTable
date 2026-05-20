# V2.5: sort evaluates a {js}, {sql}, or {llm} key — not only a JS one.
Feature: Sort rows by a key

  Rule: A sort key may be a column name or any Expr shape

    @cli @offline
    Scenario: Sort by a {js} key, descending
      Given "sort-js.flow" exists
      And the golden output is "sort-expected.jsonl"
      When user runs "tamedtable execute sort-js.flow --input sort-input.csv --output sort-output.jsonl"
      Then exit code is 0
      And "sort-output.jsonl" matches the golden output

    @cli @offline
    Scenario: Sort by a {sql} key, descending
      Given "sort-sql.flow" exists
      And the golden output is "sort-expected.jsonl"
      When user runs "tamedtable execute sort-sql.flow --input sort-input.csv --output sort-output.jsonl"
      Then exit code is 0
      And "sort-output.jsonl" matches the golden output
