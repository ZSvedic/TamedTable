# #TutorialMode
# Marketing "Classify" tours — one per homepage item. Key-free @tour tours
# deep-linked from the homepage; each loads its sample, runs the phrase, and
# replays from classify.json. @cat-classify groups them in the panel.
Feature: Classify tours

  Rule: Each Classify tour runs its phrase key-free

    @web @tour @cat-classify
    Scenario: Label each ticket as billing, bug, or feature
      Given the TamedTable web app
      And load "tickets.csv"
      When query "label each ticket as billing, bug, or feature"
      Then the spec has 1 transformation
      And no toast is shown

    @web @tour @cat-classify
    Scenario: Score the sentiment of every review
      Given the TamedTable web app
      And load "reviews.csv"
      When query "score the sentiment of every review"
      Then the spec has 1 transformation
      And no toast is shown

    @web @tour @cat-classify
    Scenario: Sort the titles by seniority
      Given the TamedTable web app
      And load "titles.csv"
      When query "sort the titles by seniority"
      Then the spec has 1 transformation
      And no toast is shown

    @web @tour @cat-classify
    Scenario: Split customers into men, women, and unknown
      Given the TamedTable web app
      And load "datanorm-input.csv"
      When query "split customers into men, women, and unknown"
      Then the spec has 1 transformation
      And no toast is shown
