# #Validate
# V2: validate transformation — flag rows, optionally reject the file.
Feature: Row and dataset validation

  Rule: validate annotates each row with _valid and _validation

    Background:
      Given "datanorm-input.csv" is loaded

    @headless @cli @web
    Scenario: Flag rows with empty Phone
      When user requests "Validate that Phone is non-empty"
      Then column "_valid" exists in the spec
      And column "_validation" exists in the spec
      And every row has a boolean "_valid"
      And rows with empty Phone have _valid equal to false
      And rows with non-empty Phone have _valid equal to true
      And rows with _valid equal to true have _validation equal to null

    @headless @cli
    Scenario: validate is additive — no rows are dropped
      Given the source has 20 rows and 3 have empty Phone
      When user requests "Validate that Phone is non-empty"
      Then the current rows count is 20

  Rule: Follow validate with filter to drop failing rows

    @headless @cli
    Scenario: filter on _valid keeps only passing rows
      When user enters the REPL with "datanorm-input.csv" and types:
        """
        Validate that Phone is non-empty
        Keep only rows where _valid is true
        :save ../temp/validate-filter-out.jsonl
        exit
        """
      Then REPL exit code is 0
      And "../temp/validate-filter-out.jsonl" is loaded
      And every remaining row has _valid equal to true

  Rule: threshold aborts the whole request

    @headless @cli
    Scenario: Failing more than the threshold aborts the request
      Given the source has 20 rows and 10 have empty Phone
      When user requests "Validate that Phone is non-empty, rejecting the file if more than 20% fail"
      Then the request fails with an error containing "validation failed"
      And the spec is unchanged from before the request

    @headless @cli
    Scenario: Failing within the threshold commits the transformation
      Given the source has 20 rows and 1 has empty Phone
      When user requests "Validate that Phone is non-empty, rejecting the file if more than 20% fail"
      Then column "_valid" exists in the spec
      And the request commits

  Rule: Multiple validate transformations overwrite the reserved columns

    @headless @cli
    Scenario: A second validate replaces the prior _valid and _validation
      When user enters the REPL with "datanorm-input.csv" and types:
        """
        Validate that Phone is non-empty
        Validate that DOB is non-empty
        :save ../temp/validate-second-out.jsonl
        exit
        """
      Then REPL exit code is 0
      And "../temp/validate-second-out.jsonl" is loaded
      And rows with empty DOB have _valid equal to false
      And rows with non-empty DOB but empty Phone have _valid equal to true
