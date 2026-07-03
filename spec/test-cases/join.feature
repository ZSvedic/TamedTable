# #LookupJoin
# join transformation — enrich left rows from a second source.
Feature: Lookup join

  Rule: Left join keeps unmatched left rows with null right columns

    Background:
      Given load "customers-input.csv"
      And load the lookup table "join-country-codes.csv" with columns "Country, ISO, Region"

    @headless @cli @web @tour @cat-deterministic
    Scenario: Left join enriches each customer with ISO and Region
      Given the expected output is "join-tour-expected.jsonl"
      When query "Join with join-country-codes.csv on Country to add ISO and Region"
      Then compare with the expected output
      And columns exist in the spec: "ISO", "Region"
      And every row keeps its original FirstName

    @headless @cli
    Scenario: Unmatched left rows get null right-side columns
      Given the lookup table has no entry for Country "Atlantis"
      And the customer table contains a row with Country "Atlantis"
      When query "Join with join-country-codes.csv on Country to add ISO and Region"
      Then the Atlantis row has ISO equal to null
      And the Atlantis row has Region equal to null

  Rule: Inner join drops unmatched left rows

    @headless @cli
    Scenario: Inner join removes left rows without a match
      Given the customer table contains a row with Country "Atlantis"
      When query "Inner join with join-country-codes.csv on Country"
      Then the current rows contain no row with Country "Atlantis"

  Rule: Column name collisions auto-rename right-side columns

    @headless @cli
    Scenario: Right column with the same name as a left column is renamed
      Given the lookup table "join-country-codes.csv" has a column "Country"
      When query "Join with join-country-codes.csv on Country to add ISO"
      Then columns exist in the spec: "Country", "Country_2"

  Rule: Right-side input dispatches on extension

    @headless @cli
    Scenario: join.with with .jsonl loads as JSONL
      When query "Join with join-country-codes.jsonl on Country to add ISO"
      Then column "ISO" exists in the spec

    @headless @cli @offline
    Scenario: join.with with an unknown extension rejects at validation
      Given "join-unknown-ext.flow" exists with join.with = "join-country-codes.parquet"
      When user runs "tamedtable execute join-unknown-ext.flow --input customers-input.csv --output ../temp/join-out.jsonl"
      Then exit code is 2
      And stderr contains "unknown file type"

  Rule: undo reverses the column-shape change

    @headless @cli
    Scenario: :undo removes the joined columns
      When user enters the REPL with "customers-input.csv" and types:
        """
        Join with join-country-codes.csv on Country to add ISO and Region
        :undo
        :schema
        exit
        """
      Then REPL exit code is 0
      And the last REPL table reprint does not contain "ISO"
      And the last REPL table reprint does not contain "Region"
