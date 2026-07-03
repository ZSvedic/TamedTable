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
      And the expected output is "classify-tickets-expected.jsonl"
      When query "label each ticket as billing, bug, or feature"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    @web @tour @cat-classify
    Scenario: Score the sentiment of every review
      Given the TamedTable web app
      And load "reviews.csv"
      And the expected output is "classify-sentiment-expected.jsonl"
      When query "score the sentiment of every review"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    # Regression: the numeric seniority scores the {llm} key returns sorted as
    # text, putting the CTO 4th of 5.
    @web @tour @cat-classify @regression
    Scenario: Sort the titles by seniority
      Given the TamedTable web app
      And load "titles.csv"
      And the expected output is "classify-seniority-expected.jsonl"
      # The recorded edit adds a visible SeniorityRank column, then sorts on
      # it numerically descending — CTO first, intern last.
      When query "sort the titles by seniority"
      Then the spec has 2 transformations
      And no toast is shown
      And compare with the expected output

    @web @tour @cat-classify
    Scenario: Split customers into men, women, and unknown
      Given the TamedTable web app
      And load "customers-input.csv"
      And the expected output is "classify-gender-expected.jsonl"
      When query "split customers into men, women, and unknown"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output
