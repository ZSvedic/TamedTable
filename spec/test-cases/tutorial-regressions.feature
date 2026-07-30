Feature: Tutorial mode regressions (RED-TUT)

  Regressions from the 2026-07-29 hunt-audit (red inventory, group 5/5),
  covering tutorial mode (tours, cassette replay, deep links).
  Self-contained step defs in src/tests/tutorial-regressions.steps.ts: each
  scenario builds its own WebController with TutorialSources read straight
  from disk. The RED-TUT ids are the findings in
  spec/test-cases/red/README.md; RED-TUT-4 and RED-TUT-5 have no reachable
  app surface and live as unit tests
  (src/packages/gherkin-tour/parse-edges.test.ts and
  src/packages/web/tutorial-copy.test.ts).

  @web @regression
  Scenario: RED-TUT-1: a tour's staged lookup table silently shadows the user's own join file after the tour ends
    Given a regression tut session that played the join tour to the end and exited
    When the user loads their own table and asks for a join naming the tour's lookup file
    Then the join asks for the user's own lookup file

  @web @regression
  Scenario: RED-TUT-2: an off-script final query still earns the permanent completion checkmark
    Given a regression tut session playing a crafted tour whose final query misses the tape
    When the visitor clicks Next through the terminal stop and the replay settles
    Then the tour is not remembered as played to the end

  @web @regression
  Scenario: RED-TUT-3: Esc during a step's execution does not stop the step
    Given a regression tut session playing the filter tour with a slow fixture fetch
    When the visitor presses Esc while the load step's fetch is in flight
    Then the regression tut app is back in the empty state
    And the regression tut step cursor reports no active step

  @web @regression
  Scenario: RED-TUT-6: a zero-step manifest entry reports a played tour that never ran
    Given a regression tut session with the shipped tour manifest
    When a deep link opens the zero-step dev scenario
    Then the deep link reports that no tour played
