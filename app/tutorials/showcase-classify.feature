# #Classify #TutorialMode
# The "Classify" showcase tour — one support inbox is labelled, scored for
# sentiment, ranked by seniority, and split by gender in four asks. Key-free
# @tour deep-linked from the homepage; replays from showcase-classify.json.
# Atomic scenarios stay in classify.feature as CI coverage.
Feature: Classify showcase tour

  Rule: One support inbox is read four different ways

    @web @tour @cat-classify
    Scenario: Classify a support inbox
      Given the TamedTable web app
      And load "showcase-classify-input.csv"
      # The recorded edit names the new column "Category".
      When query "label each ticket as billing, bug, or feature"
      Then no toast is shown
      And the row where "Id" is "1" has "Category" equal to "billing"
      And the row where "Id" is "2" has "Category" equal to "bug"
      And the row where "Id" is "3" has "Category" equal to "feature"
      When query "classify the ticket sentiment into positive, negative and neutral"
      Then no toast is shown
      And the row where "Id" is "5" has "Sentiment" equal to "negative"
      And every row has a non-null "Sentiment"
      When query "sort the titles by seniority"
      Then no toast is shown
      And every row has a non-null "SeniorityRank"
      When query "split customers into men, women, and unknown"
      Then no toast is shown
      And the row where "Id" is "2" has "Gender" equal to "man"
      And the row where "Id" is "6" has "Gender" equal to "unknown"
