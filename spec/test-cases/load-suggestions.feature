# #LoadSuggestions
# After a table loads, one bounded model call proposes 2 to 4 requests the
# engine can execute (behavior.md § Suggested requests after a load). The
# three surfaces send a byte-identical request, so one recording serves all of
# them. The suggestion wording is model output: every assertion below is
# structural (count, shape, grounding, executability), never a wording golden.
# Suggestions are opt-in for a runner, so each scenario switches them on.
Feature: Suggested requests after a table loads

  Rule: One call returns two to four sentences, and every one executes

    @headless
    Scenario: Suggestions are grounded in the table and each one runs
      Given load suggestions are on
      And load "customers-input.csv"
      When suggestions are requested
      Then between 2 and 4 suggestions are returned
      And every suggestion is a sentence ending in a period
      And no suggestion is empty, repeated, or longer than 80 characters
      And at least one suggestion names a column of the table
      When every suggestion is sent as a request in turn
      Then every suggestion committed at least one transformation

  Rule: The CLI lists the suggestions after the table and runs one by its number

    @cli
    Scenario: Typing a suggestion's number runs it
      Given load suggestions are on
      When user enters the REPL with "customers-input.csv" and types:
        """
        1
        :save-flow ../temp/load-suggestions.flow
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "Suggestions (type a number to run one):"
      And the REPL ran suggestion 1 by its listed text
      And the flow "../temp/load-suggestions.flow" has 1 transformation

    @cli @offline
    Scenario: A number past the list makes no model call
      When user enters the REPL with "customers-input.csv" and types:
        """
        7
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "no suggestion 7"
      And the REPL made no model call

  Rule: The web chat shows the suggestions as chips that fill the input

    @web
    Scenario: Picking a chip removes it, and sending its text runs
      Given the TamedTable web app
      And load suggestions are on
      And the provider "gemini" has API key "AIza-example-key"
      And load "customers-input.csv"
      Then between 2 and 4 suggestion chips are shown
      When user picks suggestion chip 1
      Then one fewer suggestion chip is shown
      When user sends the picked suggestion
      Then the spec has 1 transformation

    @web @offline
    Scenario: Without a key for the selected provider nothing is asked
      Given the TamedTable web app
      And load suggestions are on
      And the API key has not been set
      And load "customers-input.csv"
      Then no suggestion chips are shown
      And the LLM API was called 0 times
