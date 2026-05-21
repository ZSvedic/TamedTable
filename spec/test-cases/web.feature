# V4: web front-end — interactions that genuinely differ from the CLI.
# Every scenario here is offline: file dialogs, the settings panel, and
# browser gestures (cell edit, column reorder) make no model call. The
# shared transformation behavior is covered by the @web scenarios in the
# other feature files, which replay the same cassettes the CLI uses.
Feature: Web front-end

  Rule: The settings panel supplies the API key

    @web
    Scenario: A request without an API key surfaces a toast and changes nothing
      Given the TamedTable web app
      And "datanorm-input.csv" is loaded
      And the API key has not been set
      When user sends the chat message "Normalize phone numbers"
      Then a toast shows "API key"
      And the spec has 0 transformations

    @web
    Scenario: Saving an API key in the settings panel configures the engine
      Given the TamedTable web app
      And "datanorm-input.csv" is loaded
      When user opens the settings panel
      And user saves the API key "sk-ant-example-key"
      Then the configured API key is "sk-ant-example-key"

  Rule: Files move through a dialog handshake

    @web
    Scenario: Load CSV via the Open File dialog
      Given the TamedTable web app
      When user says "Load CSV file"
      Then display Open File dialog
      When user selects "datanorm-input.csv"
      Then table displays the header and at least the first 5 rows

    @web
    Scenario: Opening an empty file yields an empty table without an error
      Given the TamedTable web app
      When user says "Load CSV file"
      And user selects "aggregate-empty-input.jsonl"
      Then the table has 0 rows
      And no toast is shown

    @web
    Scenario: Save flow via the Save File dialog
      Given the TamedTable web app
      And "datanorm-input.csv" is loaded
      When user edits cell at row 1 column "Country" to "United States"
      And user says "Save flow"
      Then display Save File dialog
      When user saves as "datanorm.flow"
      Then "datanorm.flow" contains a mutate transformation

    @web
    Scenario: Without File System Access support, saving falls back to a download
      Given the TamedTable web app without File System Access support
      And "datanorm-input.csv" is loaded
      When user says "Save data"
      And user saves as "datanorm-output.jsonl"
      Then the file is delivered as a download

  Rule: Browser gestures produce spec patches

    Background:
      Given the TamedTable web app
      And "datanorm-input.csv" is loaded

    @web
    Scenario: Editing a cell appends a mutate transformation
      When user edits cell at row 1 column "Country" to "United States"
      Then cell at row 1 column "Country" shows "United States"
      And the spec has 1 transformation

    @web
    Scenario: Undo reverts a cell edit
      When user edits cell at row 1 column "Country" to "United States"
      And user undoes the last change
      Then cell at row 1 column "Country" shows the original value
      And the spec has 0 transformations

    @web
    Scenario: Reordering columns by drag updates the column order
      When user reorders columns so "Country" comes first
      Then the first column is "Country"

    @web
    Scenario: Undo reverts a column reorder
      When user reorders columns so "Country" comes first
      And user undoes the last change
      Then the first column is "ID"
