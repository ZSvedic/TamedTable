# #TutorialMode
# Marketing "Enrich & extract" tours — one per homepage item. Key-free @tour
# tours deep-linked from the homepage; each loads its sample, runs the phrase, and
# replays from enrich.json. @cat-enrich groups them in the panel.
Feature: Enrich and extract tours

  Rule: Each Enrich tour runs its phrase key-free

    # Free-form addresses have no consistent delimiter, so the edit is one
    # {llm} extraction per part — a comma split can never separate
    # "Mountain View CA 94043" into City, State, and Zip.
    @web @tour @cat-enrich
    Scenario: Split the address into its parts
      Given the TamedTable web app
      And load "address.csv"
      When query "split the address into its parts"
      Then the spec has 4 transformations
      And no toast is shown
      And columns exist in the spec: "Street", "City", "State", "Zip"
      And the row where "Name" is "Bob" has "City" equal to "Mountain View"
      And the row where "Name" is "Bob" has "State" equal to "CA"
      And the row where "Name" is "Bob" has "Zip" equal to "94043"
      And the row where "Name" is "Ana" has "City" equal to "London"
      And the row where "Name" is "Ana" has "Zip" equal to "NW1 6XE"

    @web @tour @cat-enrich
    Scenario: Fill the country from the city column
      Given the TamedTable web app
      And load "cities.csv"
      And the expected output is "enrich-cities-expected.jsonl"
      When query "fill the country from the city column"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    @web @tour @cat-enrich
    Scenario: Add the industry for each company
      Given the TamedTable web app
      And load "companies.csv"
      And the expected output is "enrich-industry-expected.jsonl"
      When query "add the industry for each company"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    # Every memo names its year, so an extracted date is never a fabricated
    # "current year" guess — a memo without a year would extract null.
    @web @tour @cat-enrich
    Scenario: Extract the amount and date from the memo
      Given the TamedTable web app
      And load "memos.csv"
      When query "extract the amount and date from the memo"
      Then the spec has 2 transformations
      And no toast is shown
      And the row where "Id" is "1" has "Date" equal to "2025-05-03"
      And the row where "Id" is "2" has "Date" equal to "2024-04-08"
      And the row where "Id" is "3" has "Date" equal to "2026-06-01"
