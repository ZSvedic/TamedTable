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
      And load "customers-input.csv"
      And the API key has not been set
      When user sends the chat message "Normalize phone numbers"
      Then a toast shows "API key"
      And the spec has 0 transformations

    @web
    Scenario: A text request needs the selected provider's key, not Anthropic's
      Given the TamedTable web app
      And load "customers-input.csv"
      And the API key has not been set
      And the provider "anthropic" has API key "sk-ant-example-key"
      And user selects the provider "gemini"
      When user sends the chat message "Normalize phone numbers"
      Then a toast shows "Text requests require a Google API key"
      And the spec has 0 transformations

    @web
    Scenario: Saving an API key in the settings panel configures the engine
      Given the TamedTable web app
      And load "customers-input.csv"
      When user opens the settings panel
      And user saves the API key "sk-ant-example-key"
      Then the configured API key is "sk-ant-example-key"

  Rule: Files move through a dialog handshake

    @web
    Scenario: Load CSV via the Open File dialog
      Given the TamedTable web app
      When user says "Load CSV file"
      Then display Open File dialog
      When user selects "customers-input.csv"
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
      And load "customers-input.csv"
      When user edits cell at row 1 column "Country" to "United States"
      And user says "Save flow"
      Then display Save File dialog
      When user saves as "cleanup.flow"
      Then "cleanup.flow" contains a mutate transformation

    @web
    Scenario: Save as Python needs the selected provider's key
      Given the TamedTable web app
      And load "customers-input.csv"
      And the API key has not been set
      And user selects the provider "gemini"
      When user says "Save as Python"
      Then a toast shows "Exporting to Python requires a Google API key"
      And the status footer reports "idle"

    @web
    Scenario: Without File System Access support, saving falls back to a download
      Given the TamedTable web app without File System Access support
      And load "customers-input.csv"
      When user says "Save data"
      And user saves as "customers-output.jsonl"
      Then the file is delivered as a download

    @web
    Scenario: Save data writes the format the table was loaded as
      Given the TamedTable web app
      And load "customers-input.parquet"
      When user says "Save data"
      Then the suggested save name ends with ".parquet"
      When user saves as "out.parquet"
      Then the status footer reports "saved"

    @web
    Scenario: Save as writes a copy in a different format
      Given the TamedTable web app
      And load "customers-input.parquet"
      When user says "Save as JSONL"
      Then the suggested save name ends with ".jsonl"
      When user saves as "out.jsonl"
      Then the status footer reports "saved"

  Rule: Samples have their own picker, separate from the URL dialog

    @web
    Scenario: Opening the sample picker shows it
      Given the TamedTable web app
      When user opens the sample picker
      Then the sample picker is shown

    @web
    Scenario: Closing the sample picker hides it
      Given the TamedTable web app
      And the sample picker is already open
      When user closes the sample picker
      Then the sample picker is hidden

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
      And the URL "https://example.com/customers-input.csv" serves "customers-input.csv"
      When user loads from URL "https://example.com/customers-input.csv"
      Then table displays the header and at least the first 5 rows

    @web
    Scenario: Loading a JSONL from a URL renders the table
      Given the TamedTable web app
      And the URL "https://example.com/customers-input.jsonl" serves "customers-input.jsonl"
      When user loads from URL "https://example.com/customers-input.jsonl"
      Then table displays the header and at least the first 5 rows

    @web
    # The dialog's three rejection paths share one shape. The library-level
    # checks (blank / garbage / non-http / network / HTTP-status) live in
    # file-io.feature; these are the thin integration pass through the dialog.
    Scenario Outline: <kind> is rejected with a clear error
      Given the TamedTable web app
      When user tries to load URL "<url>"
      Then loading fails with "<message>"

      Examples:
        | kind           | url                        | message     |
        | A non-http URL | ftp://example.com/data.csv | http        |
        | An invalid URL | not-a-url                  | valid URL   |
        | An empty URL   |                            | Enter a URL |

  Rule: Browser gestures produce spec patches

    Background:
      Given the TamedTable web app
      And load "customers-input.csv"

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
      And load "paginate-input.csv"

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
      And load "customers-input.csv"

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
      And user saves as "customers-output.jsonl"
      Then the status footer reports "saved"

    @web
    Scenario: Editing a cell returns the footer to idle after a save
      When user says "Save data"
      And user saves as "customers-output.jsonl"
      And user edits cell at row 1 column "Country" to "United States"
      Then the status footer reports "idle"

  Rule: The settings panel selects the engine model

    @web
    Scenario: The web app defaults to the Gemini primary and flash-lite cell model
      Given the TamedTable web app
      Then the configured model is "gemini-3.5-flash"
      And the configured cellModel is "gemini-3.1-flash-lite"

    @web
    Scenario: Selecting a provider pins its fixed default models
      Given the TamedTable web app
      When user selects the provider "anthropic"
      Then the configured model is "claude-sonnet-4-6"
      And the configured cellModel is "claude-haiku-4-5"

    @web
    Scenario: Switching provider keeps the loaded table intact
      Given the TamedTable web app
      And load "customers-input.csv"
      When user edits cell at row 1 column "Country" to "United States"
      And user selects the provider "gemini"
      Then the configured model is "gemini-3.5-flash"
      And cell at row 1 column "Country" shows "United States"
      And the spec has 1 transformation

  Rule: The settings panel shows accordion provider cards

    @web
    Scenario: Settings panel opens with three provider cards
      Given the TamedTable web app
      When user opens the settings panel
      Then the settings panel shows 3 provider cards
      And no provider card is expanded

    @web
    Scenario: Clicking the Google card expands it and selects Google
      Given the TamedTable web app
      When user opens the settings panel
      And user clicks the provider card "gemini"
      Then the provider card "gemini" is expanded
      And the configured provider is "gemini"

    @web
    Scenario: Clicking the Google card shows the GEMINI_API_KEY env hint
      Given the TamedTable web app
      When user opens the settings panel
      And user clicks the provider card "gemini"
      Then the expanded card body shows env hint "GEMINI_API_KEY"

    @web
    Scenario: Clicking a second card collapses the first
      Given the TamedTable web app
      When user opens the settings panel
      And user clicks the provider card "gemini"
      And user clicks the provider card "openai"
      Then the provider card "openai" is expanded
      And the provider card "gemini" is collapsed

    @web
    Scenario: Clicking the OpenAI card shows GPT models and the env hint
      Given the TamedTable web app
      When user opens the settings panel
      And user clicks the provider card "openai"
      Then the model list contains "gpt-5.5" with voice tag false
      And the model list contains "gpt-5.4-mini" with voice tag false
      And the expanded card body shows env hint "OPENAI_API_KEY"

    @web
    Scenario: Clicking an already-open card collapses it
      Given the TamedTable web app
      When user opens the settings panel
      And user clicks the provider card "gemini"
      And user clicks the provider card "gemini"
      Then no provider card is expanded

    @web
    Scenario: Clicking the Anthropic card shows the ANTHROPIC_API_KEY env hint
      Given the TamedTable web app
      When user opens the settings panel
      And user clicks the provider card "anthropic"
      Then the expanded card body shows env hint "ANTHROPIC_API_KEY"
      And the configured provider is "anthropic"

    @web
    Scenario: Settings panel opens with the currently selected provider card expanded
      Given the TamedTable web app
      When user selects the provider "openai"
      And user opens the settings panel
      Then the provider card "openai" is expanded

  Rule: Provider API errors surface descriptive messages

    @web
    Scenario: A Gemini request with a wrong key shows a descriptive error
      Given the TamedTable web app
      And load "customers-input.csv"
      And user clicks the provider card "gemini"
      And the gemini key is set to "bad-key"
      And the LLM API returns a 401 unauthorized error
      When user sends the chat message "norm dob col"
      Then a toast shows "Invalid API key"
      And a toast shows "unrestricted keys"

    @web
    Scenario: An OpenAI request with a wrong key shows a descriptive error
      Given the TamedTable web app
      And load "customers-input.csv"
      And user clicks the provider card "openai"
      And the openai key is set to "bad-key"
      And the LLM API returns a 401 unauthorized error
      When user sends the chat message "norm dob col"
      Then a toast shows "Invalid API key"
