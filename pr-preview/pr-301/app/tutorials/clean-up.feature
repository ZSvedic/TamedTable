# #TutorialMode
# Atomic "Clean up" scenarios: CI coverage, one per feature. Each loads a
# sample, runs the exact phrase a user would type, and replays its model call
# from clean-up.json. The section's marketing tour is the single story in
# showcase-cleanup.feature; these stay browsable via the panel's Dev dropdown.
Feature: Clean up scenarios

  Rule: Each Clean up phrase runs key-free

    Background:
      Given the TamedTable web app
      And load "customers-input.csv"

    # A normalized phone is a + and digits: a letter (the l-for-1 garble) or a
    # bare local number leaking through is a bad recording, not a style choice.
    @web
    Scenario: Normalize the phone numbers
      When query "normalize the phone numbers"
      Then the spec has 1 transformation
      And no toast is shown
      And every non-null "Phone" matches the pattern "^\+[0-9]{7,15}$"

    @web
    Scenario: Make the country names consistent
      Given the expected output is "cleanup-countries-expected.jsonl"
      When query "make the country names consistent"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    # One mutate per name column: a single edit targeting both columns would
    # write the same value into each. Rows I003/I008/I009 carry the miscapitalized
    # names ("mcdonald", "van der berg", "o'neil"); non-Latin names (rows
    # I017-I020) must pass through unchanged, never be nulled as "unrecognizable".
    @web
    Scenario: Fix the capitalization of names
      When query "fix the capitalization of names"
      Then the spec has 2 transformations
      And no toast is shown
      And the row where "ID" is "I003" has "LastName" equal to "McDonald"
      And the row where "ID" is "I008" has "LastName" equal to "van der Berg"
      And the row where "ID" is "I009" has "LastName" equal to "O'Neil"
      And the row where "ID" is "I003" has "FirstName" equal to "Bob"
      And the row where "ID" is "I001" has "FirstName" equal to "John"
      And the row where "ID" is "I001" has "LastName" equal to "D. Doe"
      And the row where "ID" is "I017" has "FirstName" equal to "张"
      And the row where "ID" is "I020" has "LastName" equal to "الفلاني"
      And every row has a non-null "FirstName" and "LastName"

    # Rows I009 and I015 carry the homepage's flagship ambiguity: the same 03/04
    # date read as March 4 on the US row and April 3 on the German row.
    @web
    Scenario: Clean up the birth dates
      Given the expected output is "cleanup-dob-expected.jsonl"
      When query "clean up the birth dates"
      Then the spec has 1 transformation
      And no toast is shown
      And the row where "ID" is "I009" has "DOB" equal to "1983-03-04"
      And the row where "ID" is "I015" has "DOB" equal to "1993-04-03"
      And compare with the expected output
