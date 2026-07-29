# #Classify #TutorialMode
# Atomic "Classify" scenarios — CI coverage, one per feature. Each loads its
# sample, runs the phrase, and replays from classify.json. The section's
# marketing tour is the single story in showcase-classify.feature.
Feature: Classify scenarios

  Rule: Each Classify phrase runs key-free

    @web
    Scenario: Label each ticket as billing, bug, or feature
      Given the TamedTable web app
      And load "tickets.csv"
      And the expected output is "classify-tickets-expected.jsonl"
      When query "label each ticket as billing, bug, or feature"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    # Categories, not a 1–5 score: inside the app tour a bare number never
    # says which end of the scale is good, so the phrase names its labels.
    @web
    Scenario: Classify sentiment into positive, negative and neutral
      Given the TamedTable web app
      And load "reviews.csv"
      And the expected output is "classify-sentiment-expected.jsonl"
      When query "classify sentiment into positive, negative and neutral"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    # Regression: the numeric seniority scores the {llm} key returns sorted as
    # text, putting the CTO 4th of 5.
    @web @regression
    Scenario: Sort the titles by seniority
      Given the TamedTable web app
      And load "titles.csv"
      And the expected output is "classify-seniority-expected.jsonl"
      # The recorded edit adds a visible SeniorityRank column, then sorts on
      # it numerically descending — CTO first, intern last.
      When query "sort the titles by seniority"
      Then the spec has 2 transformations
      And column "SeniorityRank" exists in the spec
      And no toast is shown
      And compare with the expected output

    @web
    Scenario: Split customers into men, women, and unknown
      Given the TamedTable web app
      And load "customers-input.csv"
      And the expected output is "classify-gender-expected.jsonl"
      When query "split customers into men, women, and unknown"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output
