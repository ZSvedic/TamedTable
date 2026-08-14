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
    Scenario: A text request on Groq needs a Groq key
      Given the TamedTable web app
      And load "customers-input.csv"
      And the API key has not been set
      And user selects the provider "groq"
      When user sends the chat message "Normalize phone numbers"
      Then a toast shows "Text requests require a Groq API key"
      And the spec has 0 transformations

    # The engine builds its model clients once, with the key it was handed
    # (behavior.md § Web UI). A key added after the first request has to reach
    # the next one — before this rebuild it sat unused until a page reload, so
    # every call kept failing while the card sat there looking connected.
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

  # A key is checked against its provider as it is added, so a user learns it
  # works before writing a single transformation — and a key that doesn't work
  # never becomes a setting they have to hunt down and undo.
  Rule: The settings panel connects a provider from a pasted key

    @web
    Scenario: Connecting a Google key selects it and pins its models
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "AIza-good"
      Then the connected providers are "gemini"
      And the selected provider is "gemini"
      And the configured model is "gemini-3.6-flash"
      And the configured cellModel is "gemini-3.1-flash-lite"
      And the connect error is empty

    @web
    Scenario: An unrecognised key is refused before any call goes out
      Given the TamedTable web app
      And the API key has not been set
      When user opens the settings panel
      And user connects the key "hello-there"
      Then the connect error is "Key not recognised. Supported prefixes: AQ.Ab…, sk-proj-…, sk-ant-…, sk-or-…, gsk_…, eyJ…."
      And the connected providers are ""
      And the LLM API was called 0 times

    @web
    Scenario: A key the provider rejects is not stored
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API returns a 401 unauthorized error
      When user opens the settings panel
      And user connects the key "AIza-bad"
      Then the connect error is "Key rejected by Google. Check the key and try again."
      And the connected providers are ""

    # The friend's report: an empty OpenAI balance answers 429 with
    # insufficient_quota, and "wait a minute" is a wait that never ends.
    @web
    Scenario: Connecting a key on an account with no credit says so, not "wait a minute"
      Given the TamedTable web app
      And the LLM API returns a 429 insufficient-quota error
      When user opens the settings panel
      And user connects the key "sk-proj-broke"
      Then the connect error is "Your OpenAI account has no credit left. Add credit (or a billing method) and try again."

    # Retries are off, so a dead key answers once — not after the SDK has slept
    # through its backoff.
    @web
    Scenario: A refused connect makes exactly one model call
      Given the TamedTable web app
      And the LLM API returns a 429 insufficient-quota error
      When user opens the settings panel
      And user connects the key "sk-proj-broke"
      Then the LLM API was called 1 time

    @web
    Scenario: A second provider connects alongside the first and becomes the default
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "AIza-good"
      And user connects the key "sk-ant-good"
      Then the connected providers are "gemini, anthropic"
      And the selected provider is "anthropic"
      And the configured model is "claude-sonnet-4-6"

    # The card has no key field, so replacing in place is the only way to fix
    # an expired key without deleting the card first.
    @web
    Scenario: Re-adding a connected provider's key replaces it in place
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "AIza-first"
      And user connects the key "AIza-second"
      Then the connected providers are "gemini"
      And the configured key for "gemini" is "AIza-second"

    @web
    Scenario: Removing the default falls back to the remaining provider
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "AIza-good"
      And user connects the key "sk-ant-good"
      And user removes the provider "anthropic"
      Then the connected providers are "gemini"
      And the selected provider is "gemini"

    @web
    Scenario: Removing the last provider leaves nothing connected
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "AIza-good"
      And user removes the provider "gemini"
      Then the connected providers are ""

    @web
    # Puter is a gateway: the token is pasted like any other credential, and
    # its whoami proves it without a model call.
    Scenario: Connecting a Puter token pins its Gemini defaults
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "eyJhbGciOiJIUzI1Ni-demo"
      Then the connected providers are "puter"
      And the selected provider is "puter"
      And the configured model is "gemini-3.6-flash"
      And the configured cellModel is "gemini-3.1-flash-lite"

    @web
    # Every other card holds a key the user has their own copy of, so deleting
    # it only forgets ours. Puter's is a session the SDK also keeps — leave it
    # behind and the next sign-in silently returns the same account.
    Scenario: Deleting the Puter card signs out of Puter
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "eyJhbGciOiJIUzI1Ni-demo"
      And user removes the provider "puter"
      Then the connected providers are ""
      And the Puter session has been signed out

    @web
    # Deleting any other card is not a sign-out — there is no session to end.
    Scenario: Deleting a Google card does not touch the Puter session
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "AIza-good"
      And user removes the provider "gemini"
      Then the Puter session has not been signed out

    @web
    # The old code returned null for every failure, and null means "the user
    # closed the window" — so a blocked sign-in looked like a click that never
    # registered.
    Scenario: A failed Puter sign-in says so instead of doing nothing
      Given the TamedTable web app
      And the API key has not been set
      And the Puter sign-in fails with "Your browser blocked the Puter.js sign-in window."
      When user opens the settings panel
      And user signs in to Puter
      Then the connect error is "Your browser blocked the Puter.js sign-in window."
      And the connected providers are ""

    @web
    Scenario: Closing the Puter sign-in window is not an error
      Given the TamedTable web app
      And the API key has not been set
      And the Puter sign-in is closed without signing in
      When user opens the settings panel
      And user signs in to Puter
      Then the connect error is empty
      And the connected providers are ""

    @web
    Scenario: Connecting Groq pins its two open-weight defaults
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "gsk_good"
      Then the selected provider is "groq"
      And the configured model is "openai/gpt-oss-120b"
      And the configured cellModel is "openai/gpt-oss-20b"

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

    @web
    Scenario: A recent whose reload fails is removed from the list
      Given the TamedTable web app
      And the URL "https://example.com/data/customers.csv" serves "customers-input.csv"
      When user loads from URL "https://example.com/data/customers.csv"
      Then the recents list has "customers.csv" tagged "url" first
      Given the URL "https://example.com/data/customers.csv" stops serving
      When user opens the recent entry "customers.csv"
      Then a toast shows "Could not open customers.csv"
      And a toast shows "removed from Recent"
      And the recents list has 0 entries

    @web
    Scenario: A sample recent re-resolves its address against the running deployment
      Given the TamedTable web app
      And the URL "https://old.example.com/samples/customers.csv" serves "customers-input.csv"
      When user loads the sample "customers.csv" from URL "https://old.example.com/samples/customers.csv"
      Then the recents list has "customers.csv" tagged "sample" first
      Given the URL "https://old.example.com/samples/customers.csv" stops serving
      And the sample "customers.csv" is bundled at URL "https://new.example.com/samples/customers.csv"
      And the URL "https://new.example.com/samples/customers.csv" serves "customers-input.csv"
      When user opens the recent entry "customers.csv"
      Then no toast is shown
      And table displays the header and at least the first 5 rows
      And the recents list has "customers.csv" tagged "sample" first
      And the recents list has 1 entries

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
    Scenario: The web app defaults to the Gemini chat model and flash-lite cell model
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

  Rule: The chooser shows one card per connected provider

    @web
    Scenario: With nothing connected the chooser shows no cards
      Given the TamedTable web app
      And the API key has not been set
      When user opens the settings panel
      Then the connected providers are ""

    @web
    Scenario: Only the selected provider's card shows its models
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "AIza-good"
      And user connects the key "sk-proj-good"
      Then the selected provider is "openai"
      And the "gemini" card is collapsed

    @web
    Scenario: Clicking a connected card makes it the default
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "AIza-good"
      And user connects the key "sk-proj-good"
      And user selects the provider "gemini"
      Then the selected provider is "gemini"
      And the configured model is "gemini-3.6-flash"

    @web
    # The tag is read from the provider, never guessed. Anthropic has no free
    # tier so every key is paid; Groq publishes nothing; and Google's only
    # tier-ish header is the inference tier, not a billing one, so it reports
    # nothing either rather than calling a free-tier key PAID.
    Scenario: A card shows a tier tag only when the provider reported one
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers any completion
      When user opens the settings panel
      And user connects the key "sk-ant-good"
      And user connects the key "gsk_good"
      And user connects the key "AIza-good"
      Then the "anthropic" card's tier is "paid"
      And the "groq" card has no tier
      And the "gemini" card has no tier

    @web
    # A row that just went blank looked exactly like one still loading, so a
    # measurement that failed says so and the ⟳ button is the retry.
    Scenario: A refused measurement leaves the row saying the speed is unknown
      Given the TamedTable web app
      And the API key has not been set
      And the LLM API answers the key check but refuses the measurement
      When user opens the settings panel
      And user connects the key "AIza-good"
      Then the connect error is empty
      And the connected providers are "gemini"
      And the "gemini" card's chat speed reads "failed"
      And the "gemini" card's cell speed reads "failed"

    @web
    # The free tier: OpenRouter's single $0 model fills both roles.
    Scenario: Selecting OpenRouter pins the free model in both roles
      Given the TamedTable web app
      When user selects the provider "openrouter"
      Then the configured provider is "openrouter"
      And the configured model is "cohere/north-mini-code:free"
      And the configured cellModel is "cohere/north-mini-code:free"

  Rule: Provider API errors surface descriptive messages

    @web
    Scenario: A Gemini request with a wrong key shows a descriptive error
      Given the TamedTable web app
      And load "customers-input.csv"
      And user selects the provider "gemini"
      And the gemini key is set to "bad-key"
      And the LLM API returns a 401 unauthorized error
      When user sends the chat message "norm dob col"
      Then a toast shows "Invalid API key"
      And a toast shows "unrestricted keys"

    @web
    Scenario: An OpenAI request with a wrong key shows a descriptive error
      Given the TamedTable web app
      And load "customers-input.csv"
      And user selects the provider "openai"
      And the openai key is set to "bad-key"
      And the LLM API returns a 401 unauthorized error
      When user sends the chat message "norm dob col"
      Then a toast shows "Invalid API key"

    @web
    Scenario: A rate-limited request tells the user to wait and retry
      Given the TamedTable web app
      And load "customers-input.csv"
      And user selects the provider "gemini"
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
