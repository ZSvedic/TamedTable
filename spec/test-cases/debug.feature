# #DebugOut
# Debug block — the [debug] output the REPL prints after a
# natural-language request. See spec/behavior.md § CLI/REPL.
Feature: Debug output

  After every natural-language request the REPL prints a compact,
  on-by-default [debug] block: the executed expression(s) and a one-line
  model-calls / tokens / time summary. Surfaces that make no model call
  print nothing. Exact formatting is pinned by unit tests; these
  scenarios check only presence and absence.

  Rule: A successful request prints a debug block

    @cli
    Scenario: Debug block shows the executed expression and a usage summary
      When user enters the REPL with "customers-input.csv" and types:
        """
        validate dob is non-empty
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "[debug] pred:"
      And REPL stdout contains "tokens ("
      And REPL stdout contains "×"

  Rule: Surfaces that make no model call print no debug block

    @cli @offline
    Scenario: REPL ":" commands print no debug block
      When user enters the REPL with "customers-input.csv" and types:
        """
        :schema
        :undo
        exit
        """
      Then REPL exit code is 0
      And REPL stdout does not contain "[debug]"

    @cli @offline
    Scenario: "tamedtable execute" prints no debug block
      Given "filter.flow" exists
      When user runs "tamedtable execute filter.flow --input filter-input.csv --output ../temp/debug-exec-out.jsonl"
      Then exit code is 0
      And stdout does not contain "[debug]"
