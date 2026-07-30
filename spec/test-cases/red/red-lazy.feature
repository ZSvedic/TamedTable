Feature: Red bug inventory — lazy AI execution (RED-LAZY)

  Each scenario documents one confirmed open defect in the web shell's lazy
  AI execution (#LazyExec) and fails by design. The assertion message leads
  with the RED-LAZY id and the spec line the behavior violates. Estimate
  arithmetic defects (RED-LAZY-3, -4, -8) live in
  src/tests/red/red-lazy.red.test.ts.

  @red @web
  Scenario: RED-LAZY-1: page-open after a deterministic sort evaluates the wrong rows
    Given a red lazy session with an AI column previewed on page 1
    When the user sorts by City through chat and opens page 2
    Then page 2 is evaluated and no off-page rows were billed

  @red @web
  Scenario: RED-LAZY-2: llm split results are wiped by paging and lost to redo
    Given a red lazy session with an AI split previewed on page 1
    When the user pages away and back, then undoes and redoes the split
    Then the split's evaluated cells refill from the cell cache with no new AI calls

  @red @web
  Scenario: RED-LAZY-5: a replace patch bypasses the dependency rule and deletes pending rows
    Given a red lazy session with an AI column previewed and a sort step appended
    When the model's patch replaces the sort with a filter reading the AI column
    Then the dependency confirmation gates the replace patch and pending rows survive

  @red @web
  Scenario: RED-LAZY-6: llm sort and group aggregates run table-wide ungated and leak pending sentinels
    Given two red lazy sessions on the paginated fixture
    When one requests an AI sort and the other an AI group summary through chat
    Then the AI sort is estimate-gated and no outgoing prompt carries the pending sentinel

  @red @web
  Scenario: RED-LAZY-7: a Save whose gated run ends with failed rows is silently abandoned
    Given a red lazy session with an AI column previewed and two rows rigged to fail
    When the user saves and confirms the estimate dialog
    Then the Save click ends with a save-ready confirmation or a visible message
