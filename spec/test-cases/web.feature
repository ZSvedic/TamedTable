# #WebUI
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

  Rule: A URL is a first-class load source

    @web
    Scenario: Opening the URL dialog shows it
      Given the TamedTable web app
      When user opens the URL dialog
      Then the URL dialog is shown

    @web
    Scenario: Closing the URL dialog hides it
      Given the TamedTable web app
      And the URL dialog is already open
      When user closes the URL dialog
      Then the URL dialog is hidden

    @web
    Scenario: Loading a CSV from a URL renders the table
      Given the TamedTable web app
      And the URL "https://example.com/datanorm-input.csv" serves "datanorm-input.csv"
      When user loads from URL "https://example.com/datanorm-input.csv"
      Then table displays the header and at least the first 5 rows

    @web
    Scenario: Loading a JSONL from a URL renders the table
      Given the TamedTable web app
      And the URL "https://example.com/datanorm-input.jsonl" serves "datanorm-input.jsonl"
      When user loads from URL "https://example.com/datanorm-input.jsonl"
      Then table displays the header and at least the first 5 rows

    @web
    Scenario: A non-http URL is rejected with a clear error
      Given the TamedTable web app
      When user tries to load URL "ftp://example.com/data.csv"
      Then loading fails with "http"

    @web
    Scenario: An invalid URL string is rejected with a clear error
      Given the TamedTable web app
      When user tries to load URL "not-a-url"
      Then loading fails with "valid URL"

    @web
    Scenario: An empty URL is rejected
      Given the TamedTable web app
      When user tries to load URL ""
      Then loading fails with "Enter a URL"

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

  Rule: The table view paginates long tables

    Background:
      Given the TamedTable web app
      And "paginate-input.csv" is loaded

    @web
    Scenario: A freshly loaded table opens on the first page
      Then the table spans 3 pages
      And the current page is 1
      And the current page shows 20 rows

    @web
    Scenario: Moving to the next page shows the following rows
      When user goes to page 2
      Then the current page shows 20 rows
      And the first row on the current page has ID "21"

    @web
    Scenario: The last page shows only the remaining rows
      When user goes to page 3
      Then the current page shows 6 rows
      And the first row on the current page has ID "41"

    @web
    Scenario: Paging past the last page clamps to the last page
      When user goes to page 99
      Then the current page is 3

  Rule: A status footer reports selection and activity

    Background:
      Given the TamedTable web app
      And "datanorm-input.csv" is loaded

    @web
    Scenario: A freshly loaded table is idle with no cell selected
      Then the status footer reports "idle"
      And no cell is selected

    @web
    Scenario: Selecting a cell reports its location in the footer
      When user selects the cell at row 3 column "Country"
      Then the selected cell is row 3 column "Country"

    @web
    Scenario: Saving data marks the footer as saved
      When user says "Save data"
      And user saves as "datanorm-output.jsonl"
      Then the status footer reports "saved"

    @web
    Scenario: Editing a cell returns the footer to idle after a save
      When user says "Save data"
      And user saves as "datanorm-output.jsonl"
      And user edits cell at row 1 column "Country" to "United States"
      Then the status footer reports "idle"

  Rule: The settings panel selects the engine model

    @web
    Scenario: The web app defaults to the Sonnet model
      Given the TamedTable web app
      Then the configured model is "claude-sonnet-4-6"

    @web
    Scenario: Choosing a model keeps the loaded table intact
      Given the TamedTable web app
      And "datanorm-input.csv" is loaded
      When user edits cell at row 1 column "Country" to "United States"
      And user selects the model "claude-haiku-4-5"
      Then the configured model is "claude-haiku-4-5"
      And cell at row 1 column "Country" shows "United States"
      And the spec has 1 transformation
