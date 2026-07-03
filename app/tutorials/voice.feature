# #VoiceInput
# Voice input — web-only, two buttons sharing one patch turn. Press-and-hold the
# mic to record once; toggle the waveform button for hands-free continuous voice,
# where a client-side VAD cuts each spoken turn with no button. Either way the
# audio rides along on the ordinary patch turn: one Gemini call carries the audio,
# the table context, and the spec-editing instructions, and returns the spec
# patch directly — no separate transcription step. The same call also returns a
# verbatim transcript, which replaces the placeholder user bubble. The stub
# microphone plays committed voice-*.m4a clips (real recordings); each firing
# scenario replays a cassette holding that one Gemini patch response — and a
# continuous turn reuses the very same clip, so it replays the same cassette. The
# rest are offline.
Feature: Voice input

  Rule: The mic button appears only for voice-capable models with a key

    @web
    Scenario: The mic is hidden when the selected model has no voice support
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      When user selects the provider "anthropic"
      Then the mic button is hidden

    @web
    Scenario: The mic is hidden when Google has no Gemini key
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And load "customers-input.csv"
      And the API key has not been set
      When user selects the provider "gemini"
      Then the mic button is hidden

    @web
    Scenario: The mic is shown when Google is selected with a Gemini key
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      Then the mic button is shown

    @web
    Scenario: The mic is hidden for an OpenAI model even with a key
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And load "customers-input.csv"
      And the provider "openai" has API key "sk-example-key"
      And the selected model is "gpt-5.5"
      Then the mic button is hidden

  Rule: Press-and-hold records, release sends

    @web
    Scenario: Holding then releasing the mic produces a user bubble and an assistant reply
      Given the TamedTable web app
      And a stub microphone that records "voice-validate-dob.m4a"
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      When user presses and holds the mic button
      And user releases the mic button
      # The bubble carries the model's verbatim transcript — current Gemini
      # normalizes casing and punctuation, so the expected text mirrors that.
      Then a user bubble shows "🎙 Validate DOB is not empty."
      And no user bubble shows "🎙 Voice request"
      And an assistant bubble is shown
      And the spec has 1 transformation
      And the mic status is "idle"

    @web
    Scenario: A spoken "normalize DOB column" request applies a transformation
      Given the TamedTable web app
      And a stub microphone that records "voice-normalize-dob.m4a"
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      When user presses and holds the mic button
      And user releases the mic button
      Then a user bubble shows "🎙 normalize DOB column"
      And an assistant bubble is shown
      And the spec has 1 transformation
      And the mic status is "idle"

    @web
    Scenario: Escape cancels a recording without sending anything
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      When user presses and holds the mic button
      And user presses Escape to cancel the recording
      Then the mic status is "idle"
      And no chat message is shown
      And the spec has 0 transformations

  Rule: A quick tap latches recording with explicit send and cancel controls

    @web
    Scenario: Tapping the mic latches recording, then send applies the request
      Given the TamedTable web app
      And a stub microphone that records "voice-normalize-dob.m4a"
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      When user taps the mic button
      Then the mic status is "latched"
      And no chat message is shown
      When user sends the latched recording
      Then a user bubble shows "🎙 normalize DOB column"
      And an assistant bubble is shown
      And the spec has 1 transformation
      And the mic status is "idle"

    @web
    Scenario: Tapping the mic then cancelling discards the recording
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      When user taps the mic button
      Then the mic status is "latched"
      When user presses Escape to cancel the recording
      Then the mic status is "idle"
      And no chat message is shown
      And the spec has 0 transformations

  Rule: The waveform button mirrors the mic for voice-capable models

    @web
    Scenario: The waveform button is shown when Google is selected with a Gemini key
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And a stub continuous mic
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      Then the waveform button is shown

    @web
    Scenario: The waveform button is hidden when no continuous port is wired
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      Then the waveform button is hidden

  Rule: Continuous voice applies each detected turn hands-free

    @web
    Scenario: A detected turn normalizes a column with no button
      Given the TamedTable web app
      And a stub continuous mic that emits "voice-normalize-dob.m4a"
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      When user turns continuous voice on
      Then the continuous status is "listening"
      When a voice turn is detected
      Then a user bubble shows "🎙 normalize DOB column"
      And an assistant bubble is shown
      And the spec has 1 transformation
      And the continuous status is "listening"
      When user turns continuous voice off
      Then the continuous status is "idle"

  # #TutorialMode
  # A runnable, key-free voice tour for the marketing "Speak instead of type"
  # deep link. Run as a plain @web scenario it records/replays voice.json via
  # the `speak` step (same request the mic release issues); played as a
  # @tour tour it replays that same cassette with no key (see
  # tutorial.feature). The clip is the committed English "normalize DOB column".
  Rule: A spoken tour normalizes a column key-free

    @web @tour @cat-language
    Scenario: Normalize DOB by voice
      Given the TamedTable web app
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      And speak "voice-normalize-dob.m4a"
      Then the spec has 1 transformation
      And an assistant bubble is shown

  Rule: A model error surfaces a toast and changes nothing

    @web
    Scenario: A model API error shows a toast
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And load "customers-input.csv"
      And the provider "gemini" has API key "bad-key"
      And the Gemini endpoint returns an error
      When user presses and holds the mic button
      And user releases the mic button
      Then a toast shows "Voice input failed"
      And an assistant bubble shows "Voice input failed"
      And the spec has 0 transformations
