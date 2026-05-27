# #PyExport
# V2.5: :save-py — export the current flow as a standalone Python script.
Feature: Export a flow as a Python script

  Rule: :save-py writes a runnable Python script for a deterministic flow

    @cli
    Scenario: :save-py exports a deterministic flow as a Python script
      When user enters the REPL with "datanorm-input.csv" and types:
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

  Rule: :save-py refuses a flow that cannot run deterministically

    @cli
    Scenario: :save-py refuses a flow that contains an LLM cell
      When user enters the REPL with "datanorm-input.csv" and types:
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
      When user enters the REPL with "datanorm-input.csv" and types:
        """
        :save-py ../temp/save-py-flow.txt
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains ":save-py: output must be a .py file"

    @cli @offline
    Scenario: :save-py with no path prints usage
      When user enters the REPL with "datanorm-input.csv" and types:
        """
        :save-py
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains ":save-py: missing path"
