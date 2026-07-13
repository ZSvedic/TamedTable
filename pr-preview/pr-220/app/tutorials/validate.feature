# #Validate
# validate transformation — flag rows, optionally reject the file.
Feature: Row and dataset validation

  Rule: validate annotates each row with _valid and _validation

    # customers-missing-phone.csv is customers-input.csv with 3 phones blanked,
    # so the flag-empty-phone demo actually has something to flag.
    @headless @cli @web @tour @cat-validate
    Scenario: Flag rows with empty Phone
      Given load "customers-missing-phone.csv"
      And the expected output is "validate-phone-expected.jsonl"
      When query "Validate that Phone is non-empty"
      Then compare with the expected output
      And columns exist in the spec: "_valid", "_validation"
      And every row has a boolean "_valid"
      And rows with empty Phone have _valid equal to false
      And rows with non-empty Phone have _valid equal to true
      And rows with _valid equal to true have _validation equal to null

    @headless @cli
    Scenario: validate is additive — no rows are dropped
      Given load "customers-input.csv"
      And the source has 20 rows and 3 have empty Phone
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

    # "Looks fake" is a semantic judgment, so the edit is two steps: an {llm}
    # mutate computing a yes/no column, then a {js} validate reading it.
    @web @tour @cat-validate
    Scenario: Flag emails that look fake
      Given the TamedTable web app
      And load "emails.csv"
      When query "flag emails that look fake"
      Then the spec has 2 transformations
      And transformation 1 is a "mutate"
      And transformation 2 is a "validate"
      And no toast is shown
      And rows where "Email" is "bill.gates@microsoft.com" have _valid equal to false
      And rows where "Email" is "asdf@asdf.com" have _valid equal to false
      And rows where "Email" is "ana@acme.io" have _valid equal to true
      And rows where "Email" is "cara@startup.dev" have _valid equal to true

    # The predicate must round-trip the day: JS Date rolls 2024-02-30 over to
    # March 1, so an isNaN guard alone can never catch day-overflow dates.
    @web @tour @cat-validate
    Scenario: Flag any impossible birth date
      Given the TamedTable web app
      And load "birthdates.csv"
      When query "flag any impossible birth date"
      Then the spec has 1 transformation
      And no toast is shown
      And rows where "DOB" is "1873-01-01" have _valid equal to false
      And rows where "DOB" is "2024-02-30" have _valid equal to false
      And rows where "DOB" is "1990-05-12" have _valid equal to true
      And rows where "DOB" is "1985-11-03" have _valid equal to true

    # The mutate that computes the yes/no column MUST precede the validate that
    # reads it — the runtime rejects the reverse order (see spec/behavior.md
    # § Headless) and the recovery loop asks the model for a corrected patch.
    @web @tour @cat-validate
    Scenario: Check the city matches the country
      Given the TamedTable web app
      And load "citycountry.csv"
      When query "check the city matches the country"
      Then the spec has 2 transformations
      And transformation 1 is a "mutate"
      And transformation 2 is a "validate"
      And no toast is shown
      And rows where "City" is "Paris" have _valid equal to false
      And rows where "City" is "Osaka" have _valid equal to true
      And rows where "City" is "Lyon" have _valid equal to true
      And rows where "City" is "Berlin" have _valid equal to true

    # Same two-step semantic-judgment shape as the fake-emails tour: a plain
    # range check can never catch the missing-zero desk lamp.
    @web @tour @cat-validate
    Scenario: Flag prices that seem wrong
      Given the TamedTable web app
      And load "prices.csv"
      When query "flag prices that seem wrong"
      Then the spec has 2 transformations
      And transformation 1 is a "mutate"
      And transformation 2 is a "validate"
      And no toast is shown
      And rows where "Item" is "Desk lamp" have _valid equal to false
      And rows where "Item" is "Notebook" have _valid equal to true
      And rows where "Item" is "Keyboard" have _valid equal to true

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
