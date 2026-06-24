# #TutorialMode
# Marketing "Enrich & extract" tours — one per homepage item. Key-free @tutorial
# tours deep-linked from the homepage; each loads its sample, runs the phrase, and
# replays from enrich.json. @cat-enrich groups them in the panel.
Feature: Enrich and extract tours

  Rule: Each Enrich tour runs its phrase key-free

    @web @tutorial @cat-enrich
    Scenario: Split the address into its parts
      Given the TamedTable web app
      And load "address.csv"
      When query "split the address into its parts"
      Then the spec has 1 transformation
      And no toast is shown

    @web @tutorial @cat-enrich
    Scenario: Fill the country from the city column
      Given the TamedTable web app
      And load "cities.csv"
      When query "fill the country from the city column"
      Then the spec has 1 transformation
      And no toast is shown

    @web @tutorial @cat-enrich
    Scenario: Add the industry for each company
      Given the TamedTable web app
      And load "companies.csv"
      When query "add the industry for each company"
      Then the spec has 1 transformation
      And no toast is shown

    @web @tutorial @cat-enrich
    Scenario: Extract the amount and date from the memo
      Given the TamedTable web app
      And load "memos.csv"
      When query "extract the amount and date from the memo"
      Then the spec has 2 transformations
      And no toast is shown
