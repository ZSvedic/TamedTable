# #Validate
# validate transformation — flag rows, optionally reject the file.
Feature: Row and dataset validation

  Rule: validate annotates each row with _valid and _validation

    Background:
      Given load "customers-input.csv"

    @headless @cli @web @tour @cat-validate
    Scenario: Flag rows with empty Phone
      Given the expected output is "validate-phone-expected.jsonl"
      When query "Validate that Phone is non-empty"
      Then compare with the expected output
      And columns exist in the spec: "_valid", "_validation"
      And every row has a boolean "_valid"
      And rows with empty Phone have _valid equal to false
      And rows with non-empty Phone have _valid equal to true
      And rows with _valid equal to true have _validation equal to null

    @headless @cli
    Scenario: validate is additive — no rows are dropped
      Given the source has 20 rows and 3 have empty Phone
      When query "Validate that Phone is non-empty"
      Then the current rows count is 20

  Rule: Follow validate with filter to drop failing rows

    @headless @cli
    Scenario: filter on _valid keeps only passing rows
      When user enters the REPL with "customers-input.csv" and types:
        """
        Validate that Phone is non-empty
        Keep only rows where _valid is true
        :save ../temp/validate-filter-out.jsonl
        exit
        """
      Then REPL exit code is 0
      And load "../temp/validate-filter-out.jsonl"
      And every remaining row has _valid equal to true

  Rule: threshold aborts the whole request

    @headless @cli
    Scenario: Failing more than the threshold aborts the request
      Given the source has 20 rows and 10 have empty Phone
      When query "Validate that Phone is non-empty, rejecting the file if more than 20% fail"
      Then the request fails with an error containing "validation failed"
      And the spec is unchanged from before the request

    @headless @cli
    Scenario: Failing within the threshold commits the transformation
      Given the source has 20 rows and 1 has empty Phone
      When query "Validate that Phone is non-empty, rejecting the file if more than 20% fail"
      Then column "_valid" exists in the spec
      And the request commits

  # #TutorialMode
  # Marketing "Validate" tours — one per homepage item. Key-free @tour tours
  # deep-linked from the homepage; each loads its sample, runs the phrase, and
  # replays from validate.json. @cat-validate groups them in the panel.
  Rule: Each Validate tour runs its phrase key-free

    @web @tour @cat-validate
    Scenario: Flag emails that look fake
      Given the TamedTable web app
      And load "emails.csv"
      And the expected output is "validate-emails-expected.jsonl"
      When query "flag emails that look fake"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    @web @tour @cat-validate
    Scenario: Flag any impossible birth date
      Given the TamedTable web app
      And load "birthdates.csv"
      When query "flag any impossible birth date"
      Then the spec has 1 transformation
      And no toast is shown

    @web @tour @cat-validate
    Scenario: Check the city matches the country
      Given the TamedTable web app
      And load "citycountry.csv"
      When query "check the city matches the country"
      Then the spec has 2 transformations
      And no toast is shown

    @web @tour @cat-validate
    Scenario: Flag prices that seem wrong
      Given the TamedTable web app
      And load "prices.csv"
      When query "flag prices that seem wrong"
      Then the spec has 1 transformation
      And no toast is shown

  Rule: Multiple validate transformations overwrite the reserved columns

    @headless @cli
    Scenario: A second validate replaces the prior _valid and _validation
      When user enters the REPL with "customers-input.csv" and types:
        """
        Validate that Phone is non-empty
        Validate that DOB is non-empty
        :save ../temp/validate-second-out.jsonl
        exit
        """
      Then REPL exit code is 0
      And load "../temp/validate-second-out.jsonl"
      And rows with empty DOB have _valid equal to false
      And rows with non-empty DOB but empty Phone have _valid equal to true
