# #IoFormats
# Load + save round-trip for every supported file format. The procedure is
# identical per format, so one Scenario Outline drives them all. Fully offline
# (no model call, no cassette), so it runs on every surface — the @web run
# proves the controller routes binary formats too.
Feature: File formats

  Rule: Every supported format round-trips through load and save

    @headless @cli @web
    Scenario Outline: <format> loads, saves, and reloads the same table
      Given load "<input>"
      Then the table has 20 data rows
      And column "Country" exists in the spec
      When the table is saved as "<output>"
      And the saved file is reloaded
      Then the table has 20 data rows
      And the reloaded rows match the originally loaded rows

      Examples:
        | format  | input                   | output            |
        | CSV     | customers-input.csv     | roundtrip.csv     |
        | JSONL   | customers-input.jsonl   | roundtrip.jsonl   |
        | Parquet | customers-input.parquet | roundtrip.parquet |
        | Arrow   | customers-input.arrow   | roundtrip.arrow   |
