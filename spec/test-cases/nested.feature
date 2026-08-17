# #NestedCells
# A JSONL cell can hold a whole list or object (a chat transcript, a list of
# tags). It keeps that structure through load, transform, and save, and every
# text view of it writes compact JSON, never "[object Object]".
Feature: Nested values in a cell

  Rule: A nested cell keeps its structure

    @headless @cli @web
    Scenario: A nested column loads as a list, not as text
      Given load "nested-input.jsonl"
      Then the table has 3 data rows
      And the cell at row 1 column "conversations" holds a list of 2 items

    @headless @cli @web
    Scenario: Saving to JSONL writes the structure back
      Given load "nested-input.jsonl"
      When the table is saved as "nested-roundtrip.jsonl"
      And the saved file is reloaded
      Then the reloaded rows match the originally loaded rows

    # The story's point: reaching into a nested value is ordinary {js} work.
    @cli @offline
    Scenario: A {js} expression indexes into a nested cell
      Given "nested.flow" exists
      And the expected output is "nested-expected.jsonl"
      When user runs "tamedtable execute nested.flow --input nested-input.jsonl --output nested-output.jsonl"
      Then exit code is 0
      And "nested-output.jsonl" matches the expected output

  Rule: Every text view of a nested cell writes compact JSON

    # @regression: reported 2026-08-17. A ShareGPT-style .jsonl loaded from a
    # URL showed "[object Object],[object Object]" in every conversations cell.
    @headless @cli @web @regression
    Scenario: The cell's display text is its compact JSON
      Given load "nested-input.jsonl"
      Then the cell at row 1 column "conversations" displays '[{"from":"human","value":"Knock knock."},{"from":"gpt","value":"Who is there?"}]'
      And no cell displays "[object Object]"

    @cli @offline
    Scenario: The REPL viewport prints the nested cell as JSON
      When user enters the REPL with "nested-input.jsonl" and types:
        """
        :show
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains '[{"from":"human","value":"Knock knock."}'

    @headless @cli @web
    Scenario: Saving to a format without nested types writes that same JSON text
      Given load "nested-input.jsonl"
      And the expected output is "nested-expected.csv"
      When export as "nested-output.csv"
      Then "nested-output.csv" matches the expected output

  Rule: The browser reads, filters, sorts, and edits a nested cell

    Background:
      Given the TamedTable web app
      And load "nested-input.jsonl"

    @web
    Scenario: A column filter matches the nested cell's JSON text
      When user filters column "conversations" by "stick"
      Then the table view shows 1 rows

    @web
    Scenario: A column sort orders by the nested cell's JSON text
      When user sorts column "conversations" descending from the column menu
      Then the page rows are in descending "conversations" display order

    # Clean parse-back: the editor opens on the JSON text, so committing edited
    # JSON has to store a list again, not the text of one.
    @web
    Scenario: Editing a nested cell keeps it a list
      When user edits cell at row 1 column "conversations" to '[{"from":"human","value":"New setup."}]'
      Then the cell at row 1 column "conversations" holds a list of 1 item
      And the cell at row 1 column "conversations" displays '[{"from":"human","value":"New setup."}]'

    @web
    Scenario: Editing a cell to plain text still stores plain text
      When user edits cell at row 1 column "conversations" to "not json at all"
      Then the cell at row 1 column "conversations" holds no list
      And the cell at row 1 column "conversations" displays "not json at all"

    # A "__proto__" key inside edited JSON is data, not a prototype: it has to
    # land as an own key on the cell, the same rule the pivot and mutate paths
    # already follow (src/tests/data-integrity.test.ts).
    @web
    Scenario: Editing a cell to JSON with a __proto__ key stores data, not a prototype
      When user edits cell at row 1 column "conversations" to '{"__proto__":{"polluted":true}}'
      Then the cell at row 1 column "conversations" has the own key "__proto__"
      And no row inherits a "polluted" key

    # A bare number stays the string the CSV rules promise: only a JSON list or
    # object parses back.
    @web
    Scenario: Editing a cell to a bare number still stores a string
      When user edits cell at row 1 column "subreddit" to "12"
      Then the cell at row 1 column "subreddit" holds the string "12"
