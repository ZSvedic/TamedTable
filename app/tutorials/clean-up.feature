# #TutorialMode
# Marketing "Clean up" tours — one per homepage item. Each is a key-free @tour
# tour (deep-linked from the homepage "Show me →") that loads a sample, runs the
# exact phrase a user would type, and replays its model call from clean-up.json.
# @cat-cleanup groups them into the "Clean up" panel section.
Feature: Clean up tours

  Rule: Each Clean up tour runs its phrase key-free

    Background:
      Given the TamedTable web app
      And load "customers-input.csv"

    @web @tour @cat-cleanup
    Scenario: Normalize the phone numbers
      When query "normalize the phone numbers"
      Then the spec has 1 transformation
      And no toast is shown

    @web @tour @cat-cleanup
    Scenario: Make the country names consistent
      Given the expected output is "cleanup-countries-expected.jsonl"
      When query "make the country names consistent"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    @web @tour @cat-cleanup
    Scenario: Fix the capitalization of names
      When query "fix the capitalization of names"
      Then the spec has 1 transformation
      And no toast is shown

    @web @tour @cat-cleanup
    Scenario: Clean up the birth dates
      Given the expected output is "cleanup-dob-expected.jsonl"
      When query "clean up the birth dates"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output
