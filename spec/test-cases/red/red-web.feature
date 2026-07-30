Feature: Red bug inventory — web controller (RED-WEB)

  Each scenario documents one confirmed open defect in the web controller and
  fails by design. The assertion message leads with the RED-WEB id and the
  spec line the behavior violates.

  @red @web
  Scenario: RED-WEB-1: flow replay reply ignores the 7-line cap
    Given a red web session with a two-row table loaded
    When the user replays a saved flow of 12 deterministic steps
    Then the flow reply shows at most 7 numbered lines plus an overflow line

  @red @web
  Scenario: RED-WEB-2: flow replay replies never carry the Report bug action
    Given a red web session with a two-row table loaded
    When the user replays a saved flow that throws mid-run
    Then the flow failure reply carries the Report bug action

  @red @web
  Scenario: RED-WEB-3: diagnostics events are lost when storage is readable but not writable
    Given a red web session whose browser storage rejects writes
    When two error toasts are pushed into the session
    Then the diagnostics log still lists both error events

  @red @web
  Scenario: RED-WEB-4: provider switch mid-run orphans the committing engine
    Given a red web session with a chat request held mid-flight
    When the user switches provider before the held reply lands
    Then the table shows the step the chat reply claims was executed

  @red @web
  Scenario: RED-WEB-5: Safari and Firefox network failures are misclassified as app errors
    Given red web sessions whose fetch fails with the Safari and Firefox network messages
    When the user sends a chat request in each session
    Then each reply shows the network guidance sentence and no Report bug action

  @red @web
  Scenario: RED-WEB-6: active column sort goes stale after a committed cell edit
    Given a red web session sorted descending on a numeric column
    When the user edits a sorted cell so its rank changes
    Then the column still reads in descending order
