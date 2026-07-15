# #FilterRows
Feature: Filter customer records

  Rule: Subset rows from a loaded CSV

    Background:
      Given load "filter-input.csv"
      And the expected output is "filter-expected.jsonl"

    @headless @cli @web @tour @cat-deterministic
    Scenario: Filter by Country
      When query "Show only customers in the USA"
      Then compare with the expected output

    @headless @cli @web
    Scenario: Export filtered data
      Given the table is filtered to USA customers
      When export as "filter-output.jsonl"
      Then "filter-output.jsonl" matches the expected output

  Rule: A committed request is stamped on the spec as provenance

    @headless
    Scenario: The request text becomes query metadata on the transformations it adds
      Given load "filter-input.csv"
      When query "Show only customers in the USA"
      Then every transformation the request added carries "Show only customers in the USA" as query metadata
      And a saved flow carries the same query metadata

  Rule: Surface-specific UX flows

    @cli
    Scenario: Execute saved flow from command line
      Given "filter.flow" exists
      And the expected output is "filter-expected.jsonl"
      When user runs "tamedtable execute filter.flow --input filter-input.csv --output filter-output.jsonl"
      Then "filter-output.jsonl" matches the expected output
