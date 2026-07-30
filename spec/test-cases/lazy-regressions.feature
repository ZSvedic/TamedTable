Feature: Lazy AI execution regressions (RED-LAZY)

  Regressions from the 2026-07-29 hunt-audit (red inventory, group 5/5),
  covering the web shell's lazy AI execution (#LazyExec). Self-contained
  step defs in src/tests/lazy-regressions.steps.ts: each scenario builds its
  own WebController with a fake FilePort and a scripted offline Gemini
  fetch. The RED-LAZY ids are the findings in spec/test-cases/red/README.md;
  the estimate-arithmetic findings (RED-LAZY-3, -4, -8) live in
  src/tests/lazy-estimates.test.ts.

  @web @regression
  Scenario: RED-LAZY-1: page-open after a deterministic sort evaluates the wrong rows
    Given a regression lazy session with an AI column previewed on page 1
    When the user sorts by City through chat and opens page 2
    Then page 2 is evaluated and no off-page rows were billed

  @web @regression
  Scenario: RED-LAZY-2: llm split results are wiped by paging and lost to redo
    Given a regression lazy session with an AI split previewed on page 1
    When the user pages away and back, then undoes and redoes the split
    Then the split's evaluated cells refill from the cell cache with no new AI calls

  @web @regression
  Scenario: RED-LAZY-5: a replace patch bypasses the dependency rule and deletes pending rows
    Given a regression lazy session with an AI column previewed and a sort step appended
    When the model's patch replaces the sort with a filter reading the AI column
    Then the dependency confirmation gates the replace patch and pending rows survive

  @web @regression
  Scenario: RED-LAZY-6: llm sort and group aggregates run table-wide ungated and leak pending sentinels
    Given two regression lazy sessions on the paginated fixture
    When one requests an AI sort and the other an AI group summary through chat
    Then the AI sort is estimate-gated and no outgoing prompt carries the pending sentinel

  @web @regression
  Scenario: RED-LAZY-7: a Save whose gated run ends with failed rows is silently abandoned
    Given a regression lazy session with an AI column previewed and two rows rigged to fail
    When the user saves and confirms the estimate dialog
    Then the Save click ends with a save-ready confirmation or a visible message
