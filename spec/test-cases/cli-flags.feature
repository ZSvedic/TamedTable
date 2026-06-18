# #CliFlags
Feature: CLI invocation flags

  The binary surface that runs before any REPL or LLM call:
  help discovery, no-args usage, unknown-flag rejection.

  @cli @offline
  Scenario: --help prints the CLI usage screen and exits 0
    When user invokes "tamedtable --help"
    Then exit code is 0
    And stdout contains "tamedtable"
    And stdout contains "execute"
    And stdout contains "--input"
    And stdout contains "--output"
    And stdout contains ":help for commands"
    And stdout contains "ANTHROPIC_API_KEY"

  @cli @offline
  Scenario: --help does not list REPL slash commands
    When user invokes "tamedtable --help"
    Then exit code is 0
    And stdout does not contain ":undo"
    And stdout does not contain ":redo"
    And stdout does not contain ":show"
    And stdout does not contain ":find"
    And stdout does not contain ":schema"

  @cli @offline
  Scenario: -h is an alias for --help
    When user invokes "tamedtable -h"
    Then exit code is 0
    And stdout contains "tamedtable"
    And stdout contains "execute"

  @cli @offline
  Scenario: --version prints the version and exits 0
    When user invokes "tamedtable --version"
    Then exit code is 0
    And stdout contains "tamedtable"

  @cli @offline
  Scenario: -v is an alias for --version
    When user invokes "tamedtable -v"
    Then exit code is 0
    And stdout contains "tamedtable"

  @cli @offline
  Scenario: --version does not start the REPL or list slash commands
    When user invokes "tamedtable --version"
    Then exit code is 0
    And stdout does not contain ":help"
    And stdout does not contain ":undo"
    And stdout does not contain "Usage:"

  @cli @offline
  Scenario: bare "help" subcommand also prints CLI usage
    When user invokes "tamedtable help"
    Then exit code is 0
    And stdout contains "tamedtable"
    And stdout contains "execute"

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
