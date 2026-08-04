# #TutorialMode
# The "Clean up" showcase tour — one story for the whole homepage section: one
# sample file, every Clean up feature in sequence. A key-free @tour deep-linked
# from the homepage; replays from showcase-cleanup.json. The atomic per-feature
# scenarios stay in clean-up.feature as CI coverage.
Feature: Clean up showcase tour

  Rule: One customer list goes from messy to clean in four asks

    # Each ask reuses a phrase proven by an atomic clean-up scenario; here they
    # run back to back on the same table, so later assertions read the
    # cumulative state (normalized phones stay normalized after the DOB fix).
    @web @tour @cat-cleanup
    Scenario: Clean up a messy customer list
      Given the TamedTable web app
      And load "customers-input.csv"
      When query "normalize the phone numbers"
      Then no toast is shown
      And every non-null "Phone" matches the pattern "^\+[0-9]{7,15}$"
      When query "make the country names consistent"
      Then no toast is shown
      And every row has a non-null "Country"
      And the row where "ID" is "I015" has "Country" equal to "Germany"
      When query "fix the capitalization of names"
      Then no toast is shown
      And the row where "ID" is "I003" has "LastName" equal to "McDonald"
      And the row where "ID" is "I008" has "LastName" equal to "van der Berg"
      And the row where "ID" is "I017" has "FirstName" equal to "张"
      When query "clean up the birth dates"
      Then no toast is shown
      And the row where "ID" is "I009" has "DOB" equal to "1983-03-04"
      And the row where "ID" is "I015" has "DOB" equal to "1993-04-03"
      And the current rows count is 20
