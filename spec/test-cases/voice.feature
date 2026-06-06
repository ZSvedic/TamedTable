# #VoiceInput
# Voice input — a web-only mic button that sends spoken audio + table context
# to Gemini in one round trip and feeds the returned request text into the
# ordinary chat pipeline. The firing scenario replays a cassette holding the
# Gemini response and the follow-up Anthropic patch call; the rest are offline.
Feature: Voice input

  Rule: The mic button appears only for Google with a Gemini key

    @web
    Scenario: The mic is hidden when the provider is not Google
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And "datanorm-input.csv" is loaded
      And the provider "gemini" has API key "AIza-example-key"
      When user selects the provider "anthropic"
      Then the mic button is hidden

    @web
    Scenario: The mic is hidden when Google has no Gemini key
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And "datanorm-input.csv" is loaded
      When user selects the provider "gemini"
      Then the mic button is hidden

    @web
    Scenario: The mic is shown when Google is selected with a Gemini key
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And "datanorm-input.csv" is loaded
      And the provider "gemini" has API key "AIza-example-key"
      Then the mic button is shown

  Rule: Press-and-hold records, release sends

    @web
    Scenario: Holding then releasing the mic produces a user bubble and an assistant reply
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And "datanorm-input.csv" is loaded
      And the provider "gemini" has API key "AIza-example-key"
      When user presses and holds the mic button
      And user releases the mic button
      Then a user bubble shows "validate dob is non-empty"
      And an assistant bubble is shown
      And the mic status is "idle"

    @web
    Scenario: Escape cancels a recording without sending anything
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And "datanorm-input.csv" is loaded
      And the provider "gemini" has API key "AIza-example-key"
      When user presses and holds the mic button
      And user presses Escape to cancel the recording
      Then the mic status is "idle"
      And no chat message is shown
      And the spec has 0 transformations

  Rule: A Gemini error surfaces a toast and changes nothing

    @web
    Scenario: A Gemini API error shows a toast
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And "datanorm-input.csv" is loaded
      And the provider "gemini" has API key "bad-key"
      And the Gemini voice endpoint returns an error
      When user presses and holds the mic button
      And user releases the mic button
      Then a toast shows "Voice input failed"
      And the spec has 0 transformations
