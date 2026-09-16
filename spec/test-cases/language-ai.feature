# #LanguageAI #TutorialMode
# Atomic "Language" scenarios (text): CI coverage, one per feature. Each
# loads its sample, runs the phrase, and replays from language-ai.json. The
# section's marketing tour is the single story in showcase-language.feature.
Feature: Language scenarios

  Rule: Each Language phrase runs key-free

    # Summary and Comment below hold generated prose: the wording changes
    # whenever the tape is recorded again, so the scenarios assert their shape
    # and compare the rest of the row exactly. The goldens keep the recorded
    # sentences as a readable sample that nothing asserts.
    @web
    Scenario: Summarize each review in one line
      Given the TamedTable web app
      And load "reviews.csv"
      And the expected output is "language-summarize-expected.jsonl"
      When query "summarize each review in one line"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output, ignoring "Summary"
      And every "Summary" is one line of 20 to 300 characters

    @web
    Scenario: Translate the comments to English
      Given the TamedTable web app
      And load "comments.csv"
      And the expected output is "language-translate-expected.jsonl"
      When query "translate the comments to English"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output, ignoring "Comment"
      And every "Comment" is one line of 5 to 200 characters
      And every "Comment" is plain ASCII

    @web
    Scenario: Tag the language of every comment
      Given the TamedTable web app
      And load "comments.csv"
      And the expected output is "language-tag-expected.jsonl"
      When query "tag the language of every comment"
      Then the spec has 1 transformation
      And no toast is shown
      And compare with the expected output
