# #Dedupe
Feature: Deduplicate customer records

  Rule: Drop duplicate rows from a loaded CSV

    Background:
      Given "dedupe-input.csv" is loaded
      And the golden output is "dedupe-expected.jsonl"

    @headless @cli @web
    Scenario: Drop duplicates by Email
      When user requests "Remove duplicate rows by Email"
      Then the table matches the golden output

    @headless @cli @web
    Scenario: Export deduplicated data
      Given duplicates are removed by Email
      When user requests to export as "dedupe-output.jsonl"
      Then "dedupe-output.jsonl" matches the golden output

  Rule: Surface-specific UX flows

    @cli
    Scenario: Execute saved flow from command line
      Given "dedupe.flow" exists
      And the golden output is "dedupe-expected.jsonl"
      When user runs "tamedtable execute dedupe.flow --input dedupe-input.csv --output dedupe-output.jsonl"
      Then "dedupe-output.jsonl" matches the golden output
