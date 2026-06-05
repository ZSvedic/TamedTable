# #FilterRows
Feature: Filter customer records

  Rule: Subset rows from a loaded CSV

    Background:
      Given "filter-input.csv" is loaded
      And the golden output is "filter-expected.jsonl"

    @headless @cli @web @tutorial
    Scenario: Filter by Country
      When user requests "Show only customers in the USA"
      Then the table matches the golden output

    @headless @cli @web
    Scenario: Export filtered data
      Given the table is filtered to USA customers
      When user requests to export as "filter-output.jsonl"
      Then "filter-output.jsonl" matches the golden output

  Rule: Surface-specific UX flows

    @cli
    Scenario: Execute saved flow from command line
      Given "filter.flow" exists
      And the golden output is "filter-expected.jsonl"
      When user runs "tamedtable execute filter.flow --input filter-input.csv --output filter-output.jsonl"
      Then "filter-output.jsonl" matches the golden output
