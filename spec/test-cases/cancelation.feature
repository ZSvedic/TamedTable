# #CancelOp
@cancel
Feature: Cancel long-running LLM transformation

  Background:
    Given load "customers-input.csv"

  @headless @cli @web
  Scenario: Partial results visible while the LLM transformation runs
    When query "Normalize Country names" via LLM
    And at least one chunk has completed
    Then the table shows transformed values for already-processed rows
    And the table shows original values for unprocessed rows

  @headless @cli @web
  Scenario: Cancellation reverts the in-flight transformation
    When query "Normalize Country names" via LLM
    And user cancels the operation after at least one chunk has completed
    Then processing stops within 2 seconds
    And the spec contains no llm-map transformation for Country
    And the table shows pre-transformation values for every row

  @headless @cli @web
  Scenario: Cancellation does not affect previously-applied transformations
    Given Phone column has been normalized
    When query "Normalize Country names" via LLM
    And user cancels the operation after at least one chunk has completed
    Then Phone column still shows normalized values
    And Country column shows pre-transformation values
