# #TutorialMode
# Marketing "Load, save & reuse" tour — a single combined walkthrough. The save /
# undo / save-flow / save-py items on the homepage all deep-link here. Loads a
# file and runs one transform (replayed from loadsave.json) so there is something
# to save, reuse, or undo. @cat-loadsave groups it in the panel.
Feature: Load, save and reuse tour

  Rule: The combined Load, save and reuse tour runs key-free

    @web @tour @cat-loadsave
    Scenario: Load a file, transform it, then save and reuse
      Given the TamedTable web app
      And load "customers-input.csv"
      When query "normalize the phone numbers"
      Then the spec has 1 transformation
      And no toast is shown
      And every non-null "Phone" matches the pattern "^\+[0-9]{7,15}$"
