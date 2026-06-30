# #VoicePort
# Voice request recording: the VoicePort interface, the MediaRecorder→WAV
# browser implementation, and buildVoicePrompt — the instruction text that
# accompanies the audio on the patch turn.
Feature: Voice input package

  Rule: The voice prompt carries the table context

    @headless
    Scenario: The prompt names the file and columns
      Given a voice context for file "people.csv" with columns "name, phone"
      When buildVoicePrompt is called
      Then the prompt contains "- File: people.csv"
      And the prompt contains "- Columns: name, phone"
      And the prompt contains "spoken in the attached audio clip"

    @headless
    Scenario: A selected cell adds a 1-based, JSON-quoted context line
      Given a voice context for file "people.csv" with columns "name, phone"
      And the context selects cell "phone" row 2 value "555-0199"
      When buildVoicePrompt is called
      Then the prompt contains "- Selected cell: column \"phone\", row 3, value \"555-0199\""

    @headless
    Scenario: No selection means no selected-cell line
      Given a voice context for file "people.csv" with columns "name, phone"
      When buildVoicePrompt is called
      Then the prompt does not contain "Selected cell"

  Rule: The demo page records through a real (fake-device) microphone

    @web
    Scenario: The demo renders the sample prompt
      Given the voice-input demo page
      Then the demo prompt mentions "spoken in the attached audio clip"

    @web
    Scenario: Recording round-trips to a WAV blob
      Given the voice-input demo page
      When the user starts recording
      And the user stops recording
      Then the recording result shows "audio/wav"

    @web
    Scenario: Cancelling discards the recording
      Given the voice-input demo page
      When the user starts recording
      And the user cancels recording
      Then the voice state is "idle"
