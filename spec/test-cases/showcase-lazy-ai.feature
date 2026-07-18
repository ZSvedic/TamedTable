# #TutorialMode
# The "Lazy AI execution" showcase tour — script only, for now. It opens the
# large bundled sample and walks the page-first story: shuffled sample, an AI
# step that fills just the visible page, the pending-page marks, and the
# run-on-all estimate dialog (shown, not executed — no key, no cost). The UI it
# points at ships with the lazy-execution implementation
# (process/journal/2026-07-18-prompt-lazy-ai.md, phase 4), which records this
# tour and adds the file to the tutorial manifest. Until then: no @web tag, so
# no profile selects it, and @needs-recording as the standing marker that its
# cassette does not exist yet.
Feature: Lazy AI execution showcase tour

  Rule: A big file previews for cents and runs in full only on request

    @tour @cat-lazy @needs-recording
    Scenario: Clean 25,000 rows for cents
      Given the TamedTable web app
      And load "showcase-lazy-input.csv"
      Then the large-file dialog offers a shuffled sample and the shuffle badge is shown
      When query "add a Category column: kitchen, electronics, clothing, sports, or other"
      Then no toast is shown
      And the evaluated-rows readout shows "20 of 25000 rows evaluated"
      And the pager marks the pages with pending rows
      When user opens the run-on-all estimate dialog
      Then the estimate dialog shows the rows remaining, estimated tokens, cost, and time
