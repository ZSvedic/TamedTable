Feature: CLI invocation flags

  The binary surface that runs before any REPL or LLM call:
  help discovery, no-args usage, unknown-flag rejection.

  @cli @offline
  Scenario: --help prints the usage screen and exits 0
    When user invokes "tamedtable --help"
    Then exit code is 0
    And stdout contains "TamedTable"
    And stdout contains ":help"
    And stdout contains ":undo"
    And stdout contains ":redo"
    And stdout contains ":show"
    And stdout contains ":find"
    And stdout contains ":schema"
    And stdout contains "ANTHROPIC_API_KEY"

  @cli @offline
  Scenario: -h is an alias for --help
    When user invokes "tamedtable -h"
    Then exit code is 0
    And stdout contains "TamedTable"

  @cli @offline
  Scenario: bare "help" subcommand also prints usage
    When user invokes "tamedtable help"
    Then exit code is 0
    And stdout contains "TamedTable"

  @cli @offline
  Scenario: No arguments hints at --help
    When user invokes "tamedtable"
    Then exit code is 1
    And stderr contains "Try --help"

  @cli @offline
  Scenario: Unknown option points to --help
    When user invokes "tamedtable --not-a-flag"
    Then exit code is 1
    And stderr contains "--help"
