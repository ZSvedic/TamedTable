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

    # Regression: the voice step of a key-free tour spotlights the mic; hiding
    # it for lack of a key left the Driver.js overlay with no target and the
    # tour stuck on its first stop.
    @web @regression
    Scenario: The mic is visible while a key-free tour plays
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And the API key has not been set
      And the tutorial "Handle feedback in five languages" is selected
      When user plays the tutorial
      Then the mic button is shown

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
      Then a user bubble shows "🎙 Normalize DOB column"
      And an assistant bubble is shown
      And the spec has 1 transformation
      And the mic status is "idle"

    @web
    Scenario: A recording that reaches thirty seconds stops and sends on its own
      Given the TamedTable web app
      And a stub microphone that records "voice-normalize-dob.m4a"
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      When user presses and holds the mic button
      Then the mic status is "recording"
      When 30 seconds pass without a release
      Then the mic status is "idle"
      And a user bubble shows "🎙 Normalize DOB column"
      And the spec has 1 transformation

    @web
    Scenario: Escape cancels a recording without sending anything
      Given the TamedTable web app
      And a stub microphone that returns recorded audio
      And load "customers-input.csv"
      And the provider "gemini" has API key "AIza-example-key"
      When user presses and holds the mic button
      And user presses Escape to cancel the recording
      Then the mic status is "idle"
      And no user message is shown
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
      And no user message is shown
      When user sends the latched recording
      Then a user bubble shows "🎙 Normalize DOB column"
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
      And no user message is shown
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
      Then a user bubble shows "🎙 Normalize DOB column"
      And an assistant bubble is shown
      And the spec has 1 transformation
      And the continuous status is "listening"
      When user turns continuous voice off
      Then the continuous status is "idle"

  # #TutorialMode
  # The runnable, key-free spoken scenario — CI coverage for the voice
  # pipeline. It records/replays voice.json via the `speak` step (same request
  # the mic release issues). The marketing voice story now opens the Process
  # language showcase tour (showcase-language.feature), whose first step
  # replays this same committed "Normalize DOB column" clip.
  Rule: A spoken request normalizes a column key-free

    @web
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

  # Regressions from the 2026-07-29 hunt-audit (red inventory, group 4/5).
  # Self-contained step defs in src/tests/voice-regressions.steps.ts: each
  # scenario builds its own WebController with stub voice ports, a captured
  # 30 s auto-stop, and an offline fetch. The RED-VOICE ids are the findings
  # in spec/test-cases/red/README.md.
  Rule: Lifecycle edges never strand the microphone or misreport a turn

    @web @regression
    Scenario: RED-VOICE-1: releasing the mic during the permission prompt ends the session
      Given a regression voice session whose microphone permission prompt is pending
      When the user releases the mic before the permission is granted
      Then granting the permission leaves the mic idle and the auto-stop sends nothing

    @web @regression
    Scenario: RED-VOICE-2: closing the voice gate mid-session tears the live sessions down
      Given a regression voice session with a latched mic recording
      And a second regression voice session listening hands-free
      When the provider is switched mid-recording and the key is removed mid-listening
      Then both microphones are released and the keyless detected turn is not sent

    @web @regression
    Scenario: RED-VOICE-6: a declined patch leaves history labels and the thread untouched
      Given a regression voice session in always-run-all mode with a prior cell edit in history
      When a spoken request trips the run-all estimate and the user declines it
      Then the prior undo entry keeps its label and no success bubble is posted

    @web @regression
    Scenario: RED-VOICE-7: the chat Stop button cancels an in-flight mic voice turn
      Given a regression voice session with a mic voice turn held mid-flight
      When the user clicks the chat Stop button and the model reply then lands
      Then the cancelled voice turn applies no transformation
