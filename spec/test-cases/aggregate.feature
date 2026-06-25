# #Aggregate
# group transformation — collapse rows into one per by-tuple.
Feature: Group and aggregate

  Rule: group with count, sum, and avg aggregates

    Background:
      Given load "customers-input.csv"
      And the expected output is "aggregate-by-country-expected.jsonl"

    @headless @cli @web
    Scenario: Count customers per country
      When query "Count customers per Country"
      Then columns exist in the spec: "Country", "customer_count"
      And compare with the expected output

    @headless @cli @web
    Scenario: Aggregate produces one row per distinct by-tuple
      When query "Group by Country and count rows"
      Then the number of rows equals the number of distinct Country values in the source

    @headless @cli @web
    Scenario: by-keys and agg columns replace the prior column list
      When query "Group by Country and count rows"
      Then columns are absent from the current rows: "FirstName", "Phone"

  Rule: group preserves first-seen order of by-tuples

    @headless @cli
    Scenario: Output row order matches first appearance of each group
      Given load "filter-input.csv"
      When query "Group by Country and count rows"
      Then the first output Country is the Country of the first input row

  Rule: LLM aggregate over a group's row slice

    @headless @cli
    Scenario: Summarize each group with an LLM aggregate
      When query "For each Country, write a one-sentence summary of the customers"
      Then columns exist in the spec: "Country", "summary"
      And every row has a non-null "summary"

  Rule: Empty input

    @headless @cli
    Scenario: Group on an empty table produces zero rows
      Given load "aggregate-empty-input.jsonl"
      When query "Group by Country and count rows"
      Then the number of rows is 0
