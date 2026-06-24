# #DataNorm
Feature: Data normalization of customer records

  Rule: Apply transformations to a loaded CSV

    Background:
      Given load "datanorm-input.csv"
      And the expected output is "datanorm-expected.jsonl"

    @headless @cli @web
    Scenario Outline: Normalize <column>
      When query "<command>"
      Then column "<column>" matches the expected output

      Examples:
        | column  | command                 |
        | Phone   | Normalize phone numbers |
        | Country | Normalize country names |
        | DOB     | Normalize DOB formats   |

    @headless @cli @web
    Scenario: Full normalization round-trip
      Given Phone, Country, and DOB are normalized
      When export as "datanorm-output.jsonl"
      Then "datanorm-output.jsonl" matches the expected output ignoring "Notes"

    @headless @cli
    Scenario: Replace Country with normalized CountryName and CountryISO
      When query "Replace Country column with normalized CountryName and CountryISO"
      Then columns exist in the spec: "CountryName", "CountryISO"
      And column "Country" is absent from the current rows
      And every row has a non-null "CountryName" and "CountryISO"

  # The Open-File / Save-File dialog mechanics are covered once in web.feature;
  # the flow round-trip is proven end-to-end by the CLI execute scenario below.
  Rule: Surface-specific UX flows

    @cli
    Scenario: Execute saved flow from command line
      Given "datanorm.flow" exists
      And the expected output is "datanorm-expected.jsonl"
      When user runs "tamedtable execute datanorm.flow --input datanorm-input.csv --output datanorm-output.jsonl"
      Then "datanorm-output.jsonl" matches the expected output ignoring "Notes"
