# #LanguageAI #TutorialMode
# Atomic "Language" scenarios (text) — CI coverage, one per feature. Each
# loads its sample, runs the phrase, and replays from language-ai.json. The
# section's marketing tour is the single story in showcase-language.feature.
Feature: Language scenarios

  Rule: Each Language phrase runs key-free

    @web
    Scenario: Summarize each review in one line
      Given the TamedTable web app
      And load "reviews.csv"
      And the expected output is "language-summarize-expected.jsonl"
      When query "summarize each review in one line"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    @web
    Scenario: Translate the comments to English
      Given the TamedTable web app
      And load "comments.csv"
      And the expected output is "language-translate-expected.jsonl"
      When query "translate the comments to English"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    @web
    Scenario: Tag the language of every comment
      Given the TamedTable web app
      And load "comments.csv"
      And the expected output is "language-tag-expected.jsonl"
      When query "tag the language of every comment"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output
