# #LLMCells
Feature: LLM cell placeholders

  The {Column} and {*} placeholders the runtime substitutes into each
  per-row LLM cell prompt before sending it to the cell model. {*} expands
  to a compact JSON object of the row's columns — excluding the target
  column when used inside a mutate value, all columns included otherwise.

  @headless @offline
  Scenario: {Column} substitutes the row's value verbatim
    Given a single-row table with columns "A=hello, B=world"
    And a mutate transformation with value {llm: "Greet {A}"}
    When the runtime renders the per-row cell prompt
    Then the rendered prompt body is "Greet hello"

  @headless @offline
  Scenario: {Column} referencing an unknown column is an evaluation-time error
    Given a single-row table with columns "A=hello"
    And a mutate transformation with value {llm: "Greet {NotAColumn}"}
    When the runtime renders the per-row cell prompt
    Then the runtime raises a placeholder error mentioning "NotAColumn"
    And the error feeds back through the recovery loop

  @headless @offline
  Scenario: {*} inside mutate.value expands to other columns and excludes the target
    Given a single-row table with columns "A=hello, B=world, C=!"
    And a mutate transformation targeting column "A" with value {llm: "Row: {*}"}
    When the runtime renders the per-row cell prompt
    Then the rendered prompt body mentions column "B" with value "world"
    And the rendered prompt body mentions column "C" with value "!"
    And the rendered prompt body does not mention column "A"

  @headless @offline
  Scenario: {*} inside filter.pred expands to all columns
    Given a single-row table with columns "A=hello, B=world"
    And a filter transformation with pred {llm: "Row: {*}"}
    When the runtime renders the per-row cell prompt
    Then the rendered prompt body mentions column "A" with value "hello"
    And the rendered prompt body mentions column "B" with value "world"

  @headless @offline
  Scenario: Cache reuse — without {*} two rows with identical primary input dedupe
    Given a two-row table with rows "A=same, B=x" and "A=same, B=y"
    And a mutate transformation targeting column "C" with value {llm: "Echo {A}"}
    When the runtime evaluates the transformation against a counting fake cell model
    Then the cell model is called exactly 1 time

  @headless @offline
  Scenario: Cache miss — with {*} two rows with identical primary input call twice
    Given a two-row table with rows "A=same, B=x" and "A=same, B=y"
    And a mutate transformation targeting column "C" with value {llm: "Echo {A} given {*}"}
    When the runtime evaluates the transformation against a counting fake cell model
    Then the cell model is called exactly 2 times
