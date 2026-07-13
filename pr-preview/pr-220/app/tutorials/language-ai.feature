# #TutorialMode
# Marketing "Language" tours (text). Key-free @tour tours deep-linked from the
# homepage; each loads its sample, runs the phrase, and replays from
# language-ai.json. @cat-language groups them with the voice and multilingual tours.
Feature: Language tours

  Rule: Each Language tour runs its phrase key-free

    @web @tour @cat-language
    Scenario: Summarize each review in one line
      Given the TamedTable web app
      And load "reviews.csv"
      And the expected output is "language-summarize-expected.jsonl"
      When query "summarize each review in one line"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    @web @tour @cat-language
    Scenario: Translate the comments to English
      Given the TamedTable web app
      And load "comments.csv"
      And the expected output is "language-translate-expected.jsonl"
      When query "translate the comments to English"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output

    @web @tour @cat-language
    Scenario: Tag the language of every comment
      Given the TamedTable web app
      And load "comments.csv"
      And the expected output is "language-tag-expected.jsonl"
      When query "tag the language of every comment"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output
