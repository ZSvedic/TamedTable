# #FormatOut
# CSV output — JSONL ↔ CSV via :save and tamedtable execute.
Feature: Tabular format output

  Rule: :save dispatches on extension

    Background:
      Given load "customers-input.csv"

    @cli @offline
    Scenario: :save writes CSV when the extension is .csv
      When user enters the REPL with "customers-input.csv" and types:
        """
        :save ../temp/customers-output.csv
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "saved"
      And "../temp/customers-output.csv" exists
      And the first line of "../temp/customers-output.csv" is "ID,FirstName,LastName,DOB,Country,Phone"

    @cli @offline
    Scenario: :save still writes JSONL when the extension is .jsonl
      When user enters the REPL with "customers-input.csv" and types:
        """
        :save ../temp/customers-output.jsonl
        exit
        """
      Then REPL exit code is 0
      And "../temp/customers-output.jsonl" exists

    # #FormatOut — :save dispatches through the codec registry, so all four
    # registered formats work (behavior.md:594-598), not just .csv/.jsonl.
    @cli @offline
    Scenario: :save writes Parquet and Arrow through the codec registry
      When user enters the REPL with "customers-input.csv" and types:
        """
        :save ../temp/customers-output.parquet
        :save ../temp/customers-output.arrow
        exit
        """
      Then REPL exit code is 0
      And REPL stdout does not contain ":save: unknown file type"
      And "../temp/customers-output.parquet" exists
      And "../temp/customers-output.arrow" exists

    @cli @offline
    Scenario: :save rejects an unknown output extension
      When user enters the REPL with "customers-input.csv" and types:
        """
        :save ../temp/customers-output.xml
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains ":save: unknown file type"

  Rule: :load accepts any registered format

    # #FormatOut — :load dispatches through the same codec registry as :save,
    # so .csv, .jsonl, .parquet, and .arrow all load (behavior.md:405-407).
    @cli @offline
    Scenario: :load accepts a Parquet source
      When user enters the REPL with "customers-input.csv" and types:
        """
        :load customers-input.parquet
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "Loaded customers-input.parquet"
      And REPL stdout does not contain ":load: unknown file type"

  Rule: CSV writer follows RFC 4180

    @headless @cli
    Scenario: Fields with commas, quotes, or newlines are quoted
      Given a row with FirstName "O'Hara", LastName "Smith, Jr.", Notes "line1\nline2"
      When export as "../temp/quoting.csv"
      Then "../temp/quoting.csv" contains the line "1,O'Hara,\"Smith, Jr.\",\"line1\nline2\""

    @headless @cli
    Scenario: Null and undefined render as empty cells
      Given a row with FirstName "Ada", LastName null
      When export as "../temp/nulls.csv"
      Then "../temp/nulls.csv" contains the line "1,Ada,"

    @headless @cli
    Scenario: Nested objects serialize as compact JSON inside the cell
      Given a row with FirstName "Ada" and an "Address" column equal to the object {"city":"London","zip":"E1"}
      When export as "../temp/nested.csv"
      Then "../temp/nested.csv" contains the line "1,Ada,\"{\"\"city\"\":\"\"London\"\",\"\"zip\"\":\"\"E1\"\"}\""

  Rule: CSV header uses the column label when set

    # behavior.md § CSV output: the header row is the spec's column order,
    # using `label` when set, otherwise `id`.
    @headless
    Scenario: A column's label becomes its CSV header, id otherwise
      Given a headless session whose first column carries the label "Full name"
      When the session exports the table to a temporary CSV file
      Then the exported CSV header row is "Full name,age"

  Rule: Batch execute writes CSV when --output is .csv

    @cli
    Scenario: Execute saved flow with CSV output
      Given "cleanup.flow" exists
      And the expected output is "cleanup-expected.csv"
      When user runs "tamedtable execute cleanup.flow --input customers-input.csv --output ../temp/cleanup-output.csv"
      Then exit code is 0
      And "../temp/cleanup-output.csv" matches the expected output

    @cli
    Scenario: Execute fails clearly when --output extension is unknown
      Given "cleanup.flow" exists
      When user runs "tamedtable execute cleanup.flow --input customers-input.csv --output ../temp/cleanup-output.xml"
      Then exit code is 4
      And stderr contains "unknown file type"

  Rule: :reorder sets the output column order

    # The REPL :reorder command exposes CSV/JSONL column order without a
    # new spec field — named columns move to the front, the rest follow.
    @cli @offline
    Scenario: :reorder changes the CSV header order
      When user enters the REPL with "customers-input.csv" and types:
        """
        :reorder Country,ID
        :save ../temp/reordered.csv
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "reordered columns"
      And the first line of "../temp/reordered.csv" is "Country,ID,FirstName,LastName,DOB,Phone"

  Rule: Mixed-format round-trip

    @cli
    Scenario: Load JSONL, save CSV
      When user enters the REPL with "customers-input.jsonl" and types:
        """
        :save ../temp/from-jsonl.csv
        exit
        """
      Then REPL exit code is 0
      And the first line of "../temp/from-jsonl.csv" is "ID,FirstName,LastName,DOB,Country,Phone"
