# #Validate
# validate transformation — flag rows, optionally reject the file.
Feature: Row and dataset validation

  Rule: validate annotates each row with a named flag pair

    # customers-missing-phone.csv is customers-input.csv with 3 phones blanked,
    # so the flag-empty-phone demo actually has something to flag. The check is
    # about one column, so its pair lands immediately right of Phone.
    @headless @cli @web
    Scenario: Flag rows with empty Phone
      Given load "customers-missing-phone.csv"
      And the expected output is "validate-phone-expected.jsonl"
      When query "Validate that Phone is non-empty"
      Then compare with the expected output
      And columns exist in the spec: "Phone_ok", "Phone_ok_note"
      And column "Phone_ok" is immediately right of "Phone" in the spec
      And every row has a boolean "Phone_ok"
      And rows with empty Phone have "Phone_ok" equal to false
      And rows with non-empty Phone have "Phone_ok" equal to true
      And rows where "Phone_ok" is true have "Phone_ok_note" equal to null

    @headless @cli
    Scenario: validate is additive — no rows are dropped
      Given load "customers-input.csv"
      And the source has 20 rows and 3 have empty Phone
      When query "Validate that Phone is non-empty"
      Then the current rows count is 20

  Rule: Follow validate with filter to drop failing rows

    # "the bad rows" names no check, so the filter targets the newest (here
    # only) validate's flag column.
    @headless @cli
    Scenario: A bare follow-up filters on the newest check's flag
      When user enters the REPL with "customers-input.csv" and types:
        """
        Validate that Phone is non-empty
        Now drop the bad rows
        :save ../temp/validate-filter-out.jsonl
        exit
        """
      Then REPL exit code is 0
      And load "../temp/validate-filter-out.jsonl"
      And every remaining row has "Phone_ok" equal to true

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
      Then column "Phone_ok" exists in the spec
      And the request commits

  # #TutorialMode
  # Atomic "Validate" scenarios — CI coverage, one per feature. Each loads its
  # sample, runs the phrase, and replays from validate.json. The section's
  # marketing tour is the single story in showcase-validate.feature.
  Rule: Each Validate phrase runs key-free

    # "Looks fake" is a semantic judgment, so the edit is two steps: an {llm}
    # mutate computing a yes/no column, then a {js} validate reading it. The
    # yes/no column is internal plumbing — the user sees only the Email_ok pair.
    @web
    Scenario: Flag emails that look fake
      Given the TamedTable web app
      And load "emails.csv"
      When query "flag emails that look fake"
      Then the spec has 2 transformations
      And transformation 1 is a "mutate"
      And transformation 2 is a "validate"
      And columns exist in the spec: "Email_ok", "Email_ok_note"
      And column "Email_ok" is immediately right of "Email" in the spec
      And column "_email_fake" is not in the spec columns
      And no toast is shown
      And rows where "Email" is "bill.gates@microsoft.com" have "Email_ok" equal to false
      And rows where "Email" is "asdf@asdf.com" have "Email_ok" equal to false
      And rows where "Email" is "ana@acme.io" have "Email_ok" equal to true
      And rows where "Email" is "cara@startup.dev" have "Email_ok" equal to true
      # The flag pair the request added tints and scrolls into view like any
      # filled cells, and undo/redo restore that step's marks and reveal
      # (spec/behavior.md § Grid upgrades).
      And the table reveals the "Email_ok" column
      And every cell in column "Email_ok" carries the changed marker
      When user undoes the last change
      Then no cells are marked changed
      And no column is revealed
      When user redoes the last change
      Then the table reveals the "Email_ok" column
      And every cell in column "Email_ok" carries the changed marker

    # The predicate must round-trip the day: JS Date rolls 2024-02-30 over to
    # March 1, so an isNaN guard alone can never catch day-overflow dates.
    @web
    Scenario: Flag any impossible birth date
      Given the TamedTable web app
      And load "birthdates.csv"
      When query "flag any impossible birth date"
      Then the spec has 1 transformation
      And columns exist in the spec: "DOB_ok", "DOB_ok_note"
      And column "DOB_ok" is immediately right of "DOB" in the spec
      And no toast is shown
      And rows where "DOB" is "1873-01-01" have "DOB_ok" equal to false
      And rows where "DOB" is "2024-02-30" have "DOB_ok" equal to false
      And rows where "DOB" is "1990-05-12" have "DOB_ok" equal to true
      And rows where "DOB" is "1985-11-03" have "DOB_ok" equal to true
      # A pure {js} validate — no AI column anywhere — still tints its new
      # pair and reveals it: filled is not an AI-only notion.
      And the table reveals the "DOB_ok" column
      And every cell in column "DOB_ok" carries the changed marker

    # The mutate that computes the yes/no column MUST precede the validate that
    # reads it — the runtime rejects the reverse order (see spec/behavior.md
    # § Headless) and the recovery loop asks the model for a corrected patch.
    # The check spans two columns, so its pair appends at the end.
    @web
    Scenario: Check the city matches the country
      Given the TamedTable web app
      And load "citycountry.csv"
      When query "check the city matches the country"
      Then the spec has 2 transformations
      And transformation 1 is a "mutate"
      And transformation 2 is a "validate"
      And columns exist in the spec: "City_Country_ok", "City_Country_ok_note"
      And column "_city_country_match" is not in the spec columns
      And no toast is shown
      And rows where "City" is "Paris" have "City_Country_ok" equal to false
      And rows where "City" is "Osaka" have "City_Country_ok" equal to true
      And rows where "City" is "Lyon" have "City_Country_ok" equal to true
      And rows where "City" is "Berlin" have "City_Country_ok" equal to true

    # Same two-step semantic shape as the fake-emails tour: a plain range check
    # can never catch the missing-zero desk lamp. Item is only context — the
    # check is about Price, so the pair lands right of Price.
    @web
    Scenario: Flag prices that seem wrong
      Given the TamedTable web app
      And load "prices.csv"
      When query "flag prices that seem wrong"
      Then the spec has 2 transformations
      And transformation 1 is a "mutate"
      And transformation 2 is a "validate"
      And columns exist in the spec: "Price_ok", "Price_ok_note"
      And column "Price_ok" is immediately right of "Price" in the spec
      And column "_price_plausible" is not in the spec columns
      And no toast is shown
      And rows where "Item" is "Desk lamp" have "Price_ok" equal to false
      And rows where "Item" is "Notebook" have "Price_ok" equal to true
      And rows where "Item" is "Keyboard" have "Price_ok" equal to true

  Rule: Each check owns its columns, so audits stack

    # Two checks with different names coexist — the second validate adds its
    # own pair instead of erasing the first (spec/behavior.md § validate).
    @headless @cli
    Scenario: A second validate adds its own pair next to the first
      When user enters the REPL with "customers-input.csv" and types:
        """
        Validate that Phone is non-empty
        Validate that DOB is non-empty
        :save ../temp/validate-second-out.jsonl
        exit
        """
      Then REPL exit code is 0
      And load "../temp/validate-second-out.jsonl"
      And rows with empty DOB have "DOB_ok" equal to false
      And rows with empty Phone have "Phone_ok" equal to false
      And rows with non-empty Phone have "Phone_ok" equal to true
