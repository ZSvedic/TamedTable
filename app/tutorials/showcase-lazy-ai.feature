# #TutorialMode #LazyExec
# The "Lazy AI execution" showcase tour — the homepage's top section. It drops
# the large bundled sample and walks the page-first story: the one-click
# large-file dialog, the shuffled sample whose Row # column keeps original
# numbers, an AI step that fills just the visible page, the pending-page
# marks, and the run-on-all estimate dialog (shown, not executed — no key,
# no cost). Replays key-free from cassettes/showcase-lazy-ai.json.
Feature: Lazy AI execution showcase tour

  Rule: A big file previews for cents and runs in full only on request

    @web @tour @cat-lazy
    Scenario: Clean 25,000 rows for cents
      Given the TamedTable web app
      When user drops the file "showcase-lazy-input.csv" onto the empty page
      Then the large-file dialog offers "Load shuffled" and "Load in original order"
      When user loads the shuffled sample
      Then the Row # column keeps the original row numbers
      When query "add a Category column: kitchen, electronics, clothing, sports, or other"
      Then no toast is shown
      And the evaluated-rows readout shows "100 of 25000 rows evaluated"
      And the pager marks the pages with pending rows
      When user opens the run-on-all estimate dialog
      Then the estimate dialog shows the rows remaining, estimated tokens, cost, and time
