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

    # The engine builds its model clients once, with the key it was handed
    # (behavior.md § Web UI). A key typed after the first request has to reach
    # the next one — before this rebuild it sat unused until a page reload, so
    # every call kept failing while the card read "✓ Saved".
    @web @offline
    Scenario: A key saved after the first request reaches the next one
      Given the TamedTable web app
      And the provider "gemini" has API key "stale-key"
      And load "customers-input.csv"
      And the LLM API returns a 401 unauthorized error
      When user sends the chat message "norm dob col"
      Then the last model call carried the API key "stale-key"
      When user saves the "gemini" API key "fresh-key"
      And user sends the chat message "norm dob col"
      Then the last model call carried the API key "fresh-key"

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

    # Opening a table is a fresh start (behavior.md § Web UI): the load clears
    # the undo history, so the thread that referenced it goes too — only the
    # new file's "Loaded …" line is left.
    @web
    Scenario: Opening a table starts a fresh chat thread
      Given the TamedTable web app
      And load "filter-input.csv"
      When user says "Open flow"
      And user selects "filter.flow"
      Then the chat has 3 messages
      When user says "Load CSV file"
      And user selects "customers-input.csv"
      Then the chat has 1 message
      And the last assistant reply shows "Loaded customers-input.csv"

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
      Then a toast shows "Saved out.parquet."

    @web
    Scenario: Save as writes a copy in a different format
      Given the TamedTable web app
      And load "customers-input.parquet"
      When user says "Save as JSONL"
      Then the suggested save name ends with ".jsonl"
      When user saves as "out.jsonl"
      Then a toast shows "Saved out.jsonl."

  Rule: A saved flow can be opened and run on the current table

    @web
    Scenario: Open .flow & run replays the recipe on the open table
      Given the TamedTable web app
      And load "filter-input.csv"
      When user says "Open flow"
      Then display Open File dialog
      When user selects "filter.flow"
      Then the table has 4 rows
      And the chat shows a user message "Run filter.flow"
      And the last assistant reply shows "Executed steps:"
      And the last assistant reply shows "1. filter (js)"
      And the last assistant reply shows "Ran filter.flow — 4 rows, 4 columns."
      And a single undo returns the table to 10 rows

    # The reply tracks its step's undo state (behavior.md § Web UI): while the
    # entry is undone the heading reads "Undone steps:" with a hollow marker,
    # and redo restores "Executed steps:". The flow replay commits one history
    # entry with no model calls, so this replays cassette-free.
    @web
    Scenario: Undo flips the flow's reply to Undone steps and redo restores it
      Given the TamedTable web app
      And load "filter-input.csv"
      When user says "Open flow"
      And user selects "filter.flow"
      Then the last assistant reply shows "Executed steps:"
      And the last assistant reply is not marked undone
      When user undoes the last change
      Then the last assistant reply shows "Undone steps:"
      And the last assistant reply is marked undone
      When user redoes the last change
      Then the last assistant reply shows "Executed steps:"
      And the last assistant reply is not marked undone

    # A join names a second file, and the browser has no working directory to
    # resolve it against (behavior.md § Web UI) — so the run stops and asks.
    # Deterministic: a flow replay makes no model call.
    @web @offline
    Scenario: A join whose lookup table is not staged asks for the file
      Given the TamedTable web app
      And load "customers-input.csv"
      When user says "Open flow"
      And user selects "join-lookup.flow"
      Then the lookup dialog asks for "join-country-codes.csv"
      When user chooses the lookup file "join-country-codes.csv"
      Then columns exist in the spec: "ISO", "Region"
      And the chat shows a user message "Run join-lookup.flow"

    # A join emitted with no filename (`with: null` — the user named none, and
    # the model never invents one) asks with the same dialog; the picked file's
    # own name is written into the step, so the executed-steps reply and the
    # spec show the real file (behavior.md § Web UI).
    @web @offline
    Scenario: A join with no filename takes the picked file's name
      Given the TamedTable web app
      And load "customers-input.csv"
      When user says "Open flow"
      And user selects "join-null.flow"
      Then the lookup dialog asks for no particular file
      When user chooses the lookup file "renamed-codes.csv"
      Then columns exist in the spec: "ISO", "Region"
      And the last assistant reply shows "join renamed-codes.csv"

    @web @offline
    Scenario: Cancelling the lookup dialog leaves the table untouched
      Given the TamedTable web app
      And load "customers-input.csv"
      When user says "Open flow"
      And user selects "join-lookup.flow"
      And user dismisses the lookup dialog
      Then the spec has 0 transformations
      And the table has 20 rows
      And no toast is shown

    # A staged lookup lasts the session, so a second join against the same name
    # runs straight through.
    @web @offline
    Scenario: A second join against a staged lookup does not ask again
      Given the TamedTable web app
      And load "customers-input.csv"
      When user says "Open flow"
      And user selects "join-lookup.flow"
      And user chooses the lookup file "join-country-codes.csv"
      And user undoes the last change
      And user says "Open flow"
      And user selects "join-lookup.flow"
      Then no lookup dialog is shown
      And columns exist in the spec: "ISO", "Region"

    @web
    Scenario: A flow reading a column the current table lacks is refused
      Given the TamedTable web app
      And load "sort-input.csv"
      When user says "Open flow"
      And user selects "filter.flow"
      Then the flow error dialog shows "Country"
      And the table has 4 rows

    @web
    Scenario: A flow with AI cells needs the selected provider's key
      Given the TamedTable web app
      And load "customers-input.csv"
      And the API key has not been set
      And user selects the provider "gemini"
      When user says "Open flow"
      And user selects "cleanup.flow"
      Then the flow error dialog shows "Running a flow with AI cells requires a Google API key"

    @web
    Scenario: An invalid flow file surfaces the error dialog
      Given the TamedTable web app
      And load "filter-input.csv"
      When user says "Open flow"
      And user selects "customers-input.csv"
      Then the flow error dialog shows "Could not run flow"
      When user dismisses the flow error dialog
      Then no flow error dialog is shown

  Rule: Successful loads are remembered as recents

    @web
    Scenario: A local load lands at the top of the recents list
      Given the TamedTable web app
      When user says "Load CSV file"
      And user selects "customers-input.csv"
      Then the recents list has "customers-input.csv" tagged "local" first

    @web
    Scenario: The recents list is capped at 5, newest first
      Given the TamedTable web app
      When user loads 6 fixture files locally
      Then the recents list has 5 entries

  Rule: The empty page accepts a dropped file

    @web
    Scenario: Dropping a CSV onto the empty page loads it
      Given the TamedTable web app
      When user drops the file "customers-input.csv" onto the empty page
      Then table displays the header and at least the first 5 rows

    @web
    Scenario: Dropping an unsupported file shows an error toast
      Given the TamedTable web app
      When user drops a file named "notes.txt" containing "hello" onto the empty page
      Then a toast shows "Could not open file"

  Rule: A drop with a table loaded asks before replacing it

    A drop never replaces the table silently (behavior.md § Web UI): the
    replace-table confirmation names the dropped file; confirming loads it
    like the empty-page drop, cancelling leaves everything untouched.

    Background:
      Given the TamedTable web app
      And load "filter-input.csv"

    @web
    Scenario: Confirming the replace dialog loads the dropped file
      When user drops the file "customers-input.csv" onto the table
      Then the replace-table dialog names "customers-input.csv"
      And the table has 10 rows
      When user confirms replacing the table
      Then the table has 20 rows
      And the chat has 1 message

    @web
    Scenario: Cancelling the replace dialog keeps the current table
      When user drops the file "customers-input.csv" onto the table
      And user cancels replacing the table
      Then no replace-table dialog is shown
      And the table has 10 rows

  Rule: A view filter dies with the column it filters

    Sort and filter are view state over the columns the spec has now
    (behavior.md § Web UI): a spec change that removes a column — undo, a
    history jump, Delete column, a chat request — drops any view filter or
    sort on that column, so it never silently empties the table.

    Background:
      Given the TamedTable web app
      And load "customers-input.csv"

    @web
    Scenario: Undo drops the view filter on a column the undo removes
      When user says "Open flow"
      And user selects "join-lookup.flow"
      And user chooses the lookup file "join-country-codes.csv"
      And user filters column "ISO" by "CA"
      And user undoes the last change
      Then the table view shows 20 rows
      And no column filter is active

    @web
    Scenario: Deleting a filtered column drops its filter
      When user filters column "Country" by "Canada"
      And user deletes the column "Country"
      Then the table view shows 20 rows
      And no column filter is active

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
    # Format is detected from the path extension first and from the Content-Type
    # header as a fallback (behavior.md § Loading from a URL): an extension-less
    # download URL served as text/csv still loads.
    Scenario: An extension-less URL served as text/csv loads via the Content-Type fallback
      Given the TamedTable web app
      And the URL "https://api.example.com/export" serves "two-columns.csv"
      When user loads from URL "https://api.example.com/export"
      Then the table columns are "a,b"

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

  Rule: The history timeline drives redo and jump

    The History sheet reads the full timeline — done steps first, then the
    undone ones — with a cursor on the current step. A fresh load clears
    the journal, so the load itself is never an entry.

    Background:
      Given the TamedTable web app
      And load "customers-input.csv"

    @web
    Scenario: Redo restores an undone change
      When user edits cell at row 1 column "Country" to "United States"
      And user undoes the last change
      And user redoes the last change
      Then cell at row 1 column "Country" shows "United States"
      And the spec has 1 transformation

    @web
    Scenario: The history timeline lists every change, newest current
      When user edits cell at row 1 column "Country" to "United States"
      And user reorders columns so "Country" comes first
      Then the history timeline shows 2 entries
      And the history cursor is at entry 1
      And history entry 0 is labelled "edit Country row 1"
      And history entry 1 is labelled "reorder columns"

    @web
    Scenario: Jumping the history to an earlier point restores that state
      When user edits cell at row 1 column "Country" to "United States"
      And user reorders columns so "Country" comes first
      And user jumps to history entry 0
      Then the spec has 1 transformation
      And the history cursor is at entry 0
      When user jumps to history entry 1
      Then the first column is "Country"

    @web
    Scenario: A new change after undo clears the redone tail
      When user edits cell at row 1 column "Country" to "United States"
      And user undoes the last change
      And user reorders columns so "Country" comes first
      Then the history timeline shows 1 entry
      And the history cursor is at entry 0

  Rule: On a phone a tour's query step cues the Type sheet

    The controller signals each tour step's focus target; the mobile shell
    raises the Type sheet exactly when that target is the chat composer, so
    the composer the tour spotlights is on screen. The layout halves of the
    phone rules — the page is the table's scroller under a frozen header,
    pinch-to-zoom scales the table but never the app bar or dock, the Type
    composer grows with the draft up to five lines, and on desktop nothing
    scrolls the page — are browser facts checked in
    src/packages/web/e2e/mobile.e2e.ts.

    @web
    Scenario: The query tour step targets the chat composer
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      When user plays the tutorial
      Then the tour step targets the Open control
      When user advances to the next tutorial step
      Then the tour step targets the chat composer

  Rule: The table view paginates long tables

    Background:
      Given the TamedTable web app
      And load "paginate-input.csv"
      # The 246-row file exceeds one page, so the unified load path raises the
      # large-file dialog (#LazyExec) — resolve it to commit the table.
      And load the file in original order

    # The page size is one AI-cell concurrency wave: batch size × concurrent
    # batches = 20 × 5 = 100 rows with the defaults, so a streaming page
    # fills in wave by wave.
    @web
    Scenario: A freshly loaded table opens on the first page
      Then the table spans 3 pages
      And the current page is 1
      And the current page shows 100 rows

    @web
    Scenario: Moving to the next page shows the following rows
      When user goes to page 2
      Then the current page shows 100 rows
      And the first row on the current page has ID "101"

    @web
    # OpenRouter pins cell batch 5, so its wave — and page — is 5 × 5 = 25;
    # switching back to a provider without a pin restores the 100-row wave.
    Scenario: Selecting the OpenRouter provider shrinks the page to its wave
      When user selects the provider "openrouter"
      Then the current page shows 25 rows
      When user selects the provider "gemini"
      Then the current page shows 100 rows

    @web
    Scenario: The last page shows only the remaining rows
      When user goes to page 3
      Then the current page shows 46 rows
      And the first row on the current page has ID "201"

    @web
    Scenario: Paging past the last page clamps to the last page
      When user goes to page 99
      Then the current page is 3

  Rule: Clicking a cell selects it

    Background:
      Given the TamedTable web app
      And load "customers-input.csv"

    @web
    Scenario: A freshly loaded table has no cell selected
      Then no cell is selected

    @web
    Scenario: Selecting a cell records its location
      When user selects the cell at row 3 column "Country"
      Then the selected cell is row 3 column "Country"

  Rule: The settings panel selects the engine model

    @web
    Scenario: The web app defaults to the Gemini primary and flash-lite cell model
      Given the TamedTable web app
      Then the configured model is "gemini-3.6-flash"
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
      Then the configured model is "gemini-3.6-flash"
      And cell at row 1 column "Country" shows "United States"
      And the spec has 1 transformation

  Rule: The settings panel shows accordion provider cards

    @web
    Scenario: Settings panel opens with four provider cards
      Given the TamedTable web app
      When user opens the settings panel
      Then the settings panel shows 4 provider cards
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
    # The free tier: OpenRouter's single $0 model fills both roles.
    Scenario: Clicking the OpenRouter card selects the free provider and models
      Given the TamedTable web app
      When user opens the settings panel
      And user clicks the provider card "openrouter"
      Then the expanded card body shows env hint "OPENROUTER_API_KEY"
      And the configured provider is "openrouter"
      And the configured model is "cohere/north-mini-code:free"
      And the configured cellModel is "cohere/north-mini-code:free"

    @web
    Scenario: Settings panel opens with the currently selected provider card expanded
      Given the TamedTable web app
      When user selects the provider "openai"
      And user opens the settings panel
      Then the provider card "openai" is expanded

  Rule: Settings changes confirm with a Saved badge on the touched card

    @web
    Scenario: Opening the settings panel shows no Saved badge
      Given the TamedTable web app
      When user opens the settings panel
      Then no provider card shows a Saved badge

    @web
    Scenario: Saving an API key shows the Saved badge on that provider's card
      Given the TamedTable web app
      When user opens the settings panel
      And user saves the API key "sk-ant-example-key"
      Then the provider card "anthropic" shows the Saved badge

    @web
    Scenario: Picking a provider card shows the Saved badge on it
      Given the TamedTable web app
      When user opens the settings panel
      And user clicks the provider card "gemini"
      Then the provider card "gemini" shows the Saved badge

    @web
    Scenario: Each save restarts the badge's green phase
      Given the TamedTable web app
      When user opens the settings panel
      And user saves the API key "sk-ant"
      And user saves the API key "sk-ant-example-key"
      Then the provider card "anthropic" shows the Saved badge
      And the Saved badge has restarted 2 times

    @web
    Scenario: Reopening the settings panel clears the Saved badge
      Given the TamedTable web app
      When user opens the settings panel
      And user saves the API key "sk-ant-example-key"
      And user closes the settings panel
      And user opens the settings panel
      Then no provider card shows a Saved badge

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

    @web
    Scenario: A rate-limited request tells the user to wait and retry
      Given the TamedTable web app
      And load "customers-input.csv"
      And user clicks the provider card "gemini"
      And the gemini key is set to "good-key"
      And the LLM API returns a 429 rate-limit error
      When user sends the chat message "norm dob col"
      Then a toast shows "Rate limited by the Google API. Wait a minute and try again."

  Rule: Work in progress guards the tab

    # The browser shell wires this to beforeunload: refreshing or closing
    # with anything to lose raises the browser's own confirmation first —
    # evaluated rows and edits cost real work (behavior.md § Web UI).
    @web
    Scenario: Refreshing with work in progress warns first
      Given the TamedTable web app
      And load "customers-input.csv"
      Then leaving the page needs no confirmation
      When user edits cell at row 1 column "Country" to "United States"
      Then leaving the page asks for confirmation

  # Regressions from the 2026-07-29 hunt-audit (red inventory, group 4/5).
  # Self-contained step defs in src/tests/web-regressions.steps.ts: each
  # scenario builds its own WebController with an in-memory FilePort and an
  # injected fetch. The RED-WEB ids are the findings in
  # spec/test-cases/red/README.md.
  Rule: Controller edges keep the thread, the log, and the view truthful

    @web @regression
    Scenario: RED-WEB-1: a flow replay reply caps at 7 numbered lines plus overflow
      Given a regression web session with a two-row table loaded
      When the user replays a saved flow of 12 deterministic steps
      Then the flow reply shows at most 7 numbered lines plus an overflow line

    @web @regression
    Scenario: RED-WEB-2: a mid-run flow failure reply carries the Report bug action
      Given a regression web session with a two-row table loaded
      When the user replays a saved flow that throws mid-run
      Then the flow failure reply carries the Report bug action

    @web @regression
    Scenario: RED-WEB-3: diagnostics events survive storage that is readable but not writable
      Given a regression web session whose browser storage rejects writes
      When two error toasts are pushed into the session
      Then the diagnostics log still lists both error events

    @web @regression
    Scenario: RED-WEB-4: a provider switch mid-run is refused, so chat and table agree
      Given a regression web session with a chat request held mid-flight
      When the user switches provider before the held reply lands
      Then the table shows the step the chat reply claims was executed

    @web @regression
    Scenario: RED-WEB-5: Safari and Firefox network failures classify as network guidance
      Given regression web sessions whose fetch fails with the Safari and Firefox network messages
      When the user sends a chat request in each session
      Then each reply shows the network guidance sentence and no Report bug action

    @web @regression
    Scenario: RED-WEB-6: an active column sort folds a committed cell edit back into order
      Given a regression web session sorted descending on a numeric column
      When the user edits a sorted cell so its rank changes
      Then the column still reads in descending order
