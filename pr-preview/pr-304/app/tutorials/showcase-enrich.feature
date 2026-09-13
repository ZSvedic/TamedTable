# #Enrich #TutorialMode
# The "Enrich & extract" showcase tour: one purchase ledger gains structure in
# four asks: address split, country fill, industry lookup, memo extraction.
# Key-free @tour deep-linked from the homepage; replays from
# showcase-enrich.json. Atomic scenarios stay in enrich.feature as CI coverage.
Feature: Enrich and extract showcase tour

  Rule: One purchase ledger gains four AI-derived columns

    # The split names its parts so the story continues: the City column it
    # creates is exactly what the country fill reads one ask later.
    @web @tour @cat-enrich
    Scenario: Enrich a purchase ledger
      Given the TamedTable web app
      And load "showcase-enrich-input.csv"
      When query "split the address into Street, City, and Zip"
      Then no toast is shown
      And columns exist in the spec: "Street", "City", "Zip"
      And the row where "Id" is "1" has "Zip" equal to "94104"
      When query "fill the country from the city column"
      Then no toast is shown
      And the row where "Id" is "3" has "Country" equal to "Japan"
      And the row where "Id" is "5" has "Country" equal to "Canada"
      When query "add the industry for each company"
      Then no toast is shown
      And every row has a non-null "Industry"
      When query "extract the amount and date from the memo, refunds negative"
      Then no toast is shown
      And the row where "Id" is "2" has "Amount" equal to "-9.50"
      And the row where "Id" is "2" has "Date" equal to "2024-04-08"
