Feature: Red bug inventory — voice input (RED-VOICE)

  Each scenario documents one confirmed open defect in the voice-input path of
  the web controller and fails by design. The assertion message leads with the
  RED-VOICE id and the spec line the behavior violates. RED-VOICE-3, -4 and -5
  live in src/tests/red/red-voice.red.test.ts (bun run test:red:unit).

  @red @web
  Scenario: RED-VOICE-1: releasing the mic during the permission prompt leaves the recording live and auto-sends
    Given a red voice session whose microphone permission prompt is pending
    When the user releases the mic before the permission is granted
    Then granting the permission leaves the mic idle and the auto-stop sends nothing

  @red @web
  Scenario: RED-VOICE-2: closing the voice gate mid-session strands a live mic and still sends
    Given a red voice session with a latched mic recording
    And a second red voice session listening hands-free
    When the provider is switched mid-recording and the key is removed mid-listening
    Then both microphones are released and the keyless detected turn is not sent

  @red @web
  Scenario: RED-VOICE-6: a transcript on a declined patch relabels the previous undo entry
    Given a red voice session in always-run-all mode with a prior cell edit in history
    When a spoken request trips the run-all estimate and the user declines it
    Then the prior undo entry keeps its label and no success bubble is posted

  @red @web
  Scenario: RED-VOICE-7: the chat Stop button cannot cancel an in-flight mic voice turn
    Given a red voice session with a mic voice turn held mid-flight
    When the user clicks the chat Stop button and the model reply then lands
    Then the cancelled voice turn applies no transformation
