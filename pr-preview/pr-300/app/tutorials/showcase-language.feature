# #LanguageAI #TutorialMode
# The "Process language" showcase tour: one multilingual feedback sheet, five
# asks: a spoken command, language tagging, translation, one-line summaries,
# and a request made in Spanish. The language tag lands before the translation
# so it reads the original comments, not the English ones. Key-free @tour
# deep-linked from the homepage; replays from showcase-language.json. Atomic
# scenarios stay in voice.feature, language-ai.feature, and multilingual.feature.
Feature: Process language showcase tour

  Rule: One feedback sheet is worked by voice, in five languages

    # The spoken clip is the committed English "Normalize DOB column": the
    # same recording the atomic voice scenario replays. The Gemini key Given is
    # test plumbing (voice is Gemini-only); the tour player replays key-free.
    @web @tour @cat-language
    Scenario: Handle feedback in five languages
      Given the TamedTable web app
      And load "showcase-language-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      And speak "voice-normalize-dob.m4a"
      Then no toast is shown
      And every row has a non-null "DOB"
      When query "tag the language of every comment"
      Then no toast is shown
      And the row where "Id" is "1" has "Language" equal to "French"
      And the row where "Id" is "6" has "Language" equal to "Croatian"
      When query "translate the comments to English"
      Then no toast is shown
      When query "add a one-line Summary for each comment"
      Then no toast is shown
      And every row has a non-null "Summary"
      When query "normaliza los números de teléfono"
      Then no toast is shown
      And every non-null "Phone" matches the pattern "^\+[0-9]{7,15}$"
