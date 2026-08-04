# #PyExport
# :save-py — export the current flow as a standalone Python script.
Feature: Export a flow as a Python script

  Rule: :save-py writes a runnable Python script for a deterministic flow

    @cli
    Scenario: :save-py exports a deterministic flow as a Python script
      When user enters the REPL with "customers-input.csv" and types:
        """
        Show only customers in the USA
        :save-py ../temp/save-py-flow.py
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "saved Python script"
      And "../temp/save-py-flow.py" exists
      And the first line of "../temp/save-py-flow.py" is "#!/usr/bin/env -S uv run --script"
      And "../temp/save-py-flow.py" contains the line "# /// script"

  Rule: Running the exported script reproduces the flow's output

    # Same phrase as the scenario above, so both model calls (spec patch +
    # Python generation) replay from the cassette already on tape. The script
    # itself runs deterministically — the equivalence check needs no model.
    @cli
    Scenario: The exported script writes the same rows the session saved
      When user enters the REPL with "customers-input.csv" and types:
        """
        Show only customers in the USA
        :save ../temp/save-py-manual.jsonl
        :save-py ../temp/save-py-equiv.py
        exit
        """
      Then REPL exit code is 0
      And "../temp/save-py-equiv.py" exists
      When user runs the exported script "../temp/save-py-equiv.py" with input "customers-input.csv" and output "../temp/save-py-script.jsonl"
      Then exit code is 0
      And "../temp/save-py-script.jsonl" has the same rows as "../temp/save-py-manual.jsonl"

  Rule: The web app exports the same flow through the Save-flow dropdown

    # Generating the script is a model call, so it outlives the click that
    # started it and the browser refuses the save picker ("Must be handling a
    # user gesture"). The finished script parks in the save-ready dialog and
    # the picker opens from its fresh click instead (issue #278).
    @web
    Scenario: Save as Python writes a script for a deterministic flow
      Given the TamedTable web app
      And load "customers-input.csv"
      When user sends the chat message "Show only customers in the USA"
      And user says "Save as Python"
      Then the save-ready dialog is shown
      And no save dialog was opened yet
      When user clicks Save file in the save-ready dialog
      Then the suggested save name ends with ".py"
      When user saves as "customers-flow.py"
      Then a toast shows "Saved customers-flow.py."

  Rule: :save-py refuses a flow that cannot run deterministically

    @cli
    Scenario: :save-py refuses a flow that contains an LLM cell
      When user enters the REPL with "customers-input.csv" and types:
        """
        Normalize country names
        :save-py ../temp/save-py-llm.py
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "flow contains LLM cells"

  Rule: :save-py validates its argument

    @cli @offline
    Scenario: :save-py rejects a non-.py output path
      When user enters the REPL with "customers-input.csv" and types:
        """
        :save-py ../temp/save-py-flow.txt
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains ":save-py: output must be a .py file"

    @cli @offline
    Scenario: :save-py with no path prints usage
      When user enters the REPL with "customers-input.csv" and types:
        """
        :save-py
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains ":save-py: missing path"
