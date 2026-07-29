Feature: Red bug inventory — tutorial mode and cassette replay (RED-TUT)

  Each scenario documents one confirmed open defect in tutorial mode (tours,
  cassette replay, deep links) and fails by design. The assertion message
  leads with the RED-TUT id and the spec line the behavior violates.
  RED-TUT-4 and RED-TUT-5 have no reachable surface and live as unit red
  tests (src/packages/gherkin-tour/parse-edges.red.test.ts and
  src/packages/web/tutorial-copy.red.test.ts, run via `bun run test:red:unit`).

  @red @web
  Scenario: RED-TUT-1: a tour's staged lookup table silently shadows the user's own join file after the tour ends
    Given a red tut session that played the join tour to the end and exited
    When the user loads their own table and asks for a join naming the tour's lookup file
    Then the join asks for the user's own lookup file

  @red @web
  Scenario: RED-TUT-2: an off-script final query still earns the permanent completion checkmark
    Given a red tut session playing a crafted tour whose final query misses the tape
    When the visitor clicks Next through the terminal stop and the replay settles
    Then the tour is not remembered as played to the end

  @red @web
  Scenario: RED-TUT-3: Esc during a step's execution does not stop the step
    Given a red tut session playing the filter tour with a slow fixture fetch
    When the visitor presses Esc while the load step's fetch is in flight
    Then the red tut app is back in the empty state
    And the red tut step cursor reports no active step

  @red @web
  Scenario: RED-TUT-6: a zero-step manifest entry reports a played tour that never ran
    Given a red tut session with the shipped tour manifest
    When a deep link opens the zero-step dev scenario
    Then the deep link reports that no tour played
