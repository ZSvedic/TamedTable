# #Dedupe
Feature: Deduplicate customer records

  Rule: Drop duplicate rows from a loaded CSV

    Background:
      Given load "dedupe-input.csv"
      And the expected output is "dedupe-expected.jsonl"

    @headless @cli @web @tour @cat-deterministic
    Scenario: Drop duplicates by Email
      When query "Remove duplicate rows by Email"
      Then compare with the expected output

    @headless @cli @web
    Scenario: Export deduplicated data
      Given duplicates are removed by Email
      When export as "dedupe-output.jsonl"
      Then "dedupe-output.jsonl" matches the expected output

  Rule: Surface-specific UX flows

    @cli
    Scenario: Execute saved flow from command line
      Given "dedupe.flow" exists
      And the expected output is "dedupe-expected.jsonl"
      When user runs "tamedtable execute dedupe.flow --input dedupe-input.csv --output dedupe-output.jsonl"
      Then "dedupe-output.jsonl" matches the expected output
