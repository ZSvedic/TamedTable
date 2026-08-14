# #TutorialMode
# Load/save regression test, no longer a marketing tour (the homepage
# "Load, save & reuse" section is informational only). Loads a file and runs
# one transform (replayed from loadsave.json) so cumulative load → query
# behavior stays covered. Still @web, so it appears in the panel's Dev dropdown.
Feature: Load, save and reuse

  Rule: Load then transform runs key-free

    @web
    Scenario: Load a file, transform it, then save and reuse
      Given the TamedTable web app
      And load "customers-input.csv"
      When query "normalize the phone numbers"
      Then the spec has 1 transformation
      And no toast is shown
      And every non-null "Phone" matches the pattern "^\+[0-9]{7,15}$"
