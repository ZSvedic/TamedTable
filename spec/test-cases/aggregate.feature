# V2: group transformation — collapse rows into one per by-tuple.
Feature: Group and aggregate

  Rule: group with count, sum, and avg aggregates

    Background:
      Given "datanorm-input.csv" is loaded
      And the golden output is "aggregate-by-country-expected.jsonl"

    @headless @cli @web
    Scenario: Count customers per country
      When user requests "Count customers per Country"
      Then column "Country" exists in the spec
      And column "customer_count" exists in the spec
      And the table matches the golden output

    @headless @cli @web
    Scenario: Aggregate produces one row per distinct by-tuple
      When user requests "Group by Country and count rows"
      Then the number of rows equals the number of distinct Country values in the source

    @headless @cli @web
    Scenario: by-keys and agg columns replace the prior column list
      When user requests "Group by Country and count rows"
      Then column "FirstName" is absent from the current rows
      And column "Phone" is absent from the current rows

  Rule: group preserves first-seen order of by-tuples

    @headless @cli
    Scenario: Output row order matches first appearance of each group
      Given "filter-input.csv" is loaded
      When user requests "Group by Country and count rows"
      Then the first output Country is the Country of the first input row

  Rule: LLM aggregate over a group's row slice

    @headless @cli
    Scenario: Summarize each group with an LLM aggregate
      When user requests "For each Country, write a one-sentence summary of the customers"
      Then column "Country" exists in the spec
      And column "summary" exists in the spec
      And every row has a non-null "summary"

  Rule: Empty input

    @headless @cli
    Scenario: Group on an empty table produces zero rows
      Given "aggregate-empty-input.jsonl" is loaded
      When user requests "Group by Country and count rows"
      Then the number of rows is 0

  Rule: V1 still rejects group as a V2 feature

    @cli @offline
    Scenario: Loading a V1 flow that uses group fails Zod validation
      Given "aggregate.flow" exists
      When user runs "tamedtable execute aggregate.flow --input datanorm-input.csv --output ../temp/agg-out.jsonl"
      Then exit code is 2
      And stderr contains "V2 feature in V1 spec"
