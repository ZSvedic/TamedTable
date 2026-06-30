# #ChatPanel
# The chat sidebar package: message list with expandable request detail, the
# input row with send/stop, and the hold-or-tap MicButton.
Feature: Chat panel package

  Rule: The demo page exercises the panel in a real browser

    @web
    Scenario: Sending renders a user bubble and an assistant reply
      Given the chat-panel demo page
      When the user sends the chat message "normalize phones"
      Then a chat user bubble shows "normalize phones"
      And an assistant reply shows "Did: normalize phones"
      And the chat input is empty

    @web
    Scenario: An Error-prefixed reply renders in error style
      Given the chat-panel demo page
      When the user adds an error reply
      Then an assistant error shows "Something broke"

    @web
    Scenario: Request detail expands and shows the turns
      Given the chat-panel demo page
      When the user adds a reply with request detail
      And the user expands the request detail
      Then the request detail shows "turn 1: committed"
      And the request detail shows "normalize the phone column"

    @web
    Scenario: Streaming swaps send for stop, and stop cancels
      Given the chat-panel demo page
      When the user toggles chat streaming
      Then the chat shows it is running
      When the user clicks the chat stop button
      Then the chat event log shows "cancel"

    @web
    Scenario: A prefill lands in the draft
      Given the chat-panel demo page
      When the user clicks the prefill button
      Then the chat input contains "Keep rows where age >= 18"

    @web
    Scenario: Holding the mic records, releasing sends
      Given the chat-panel demo page
      When the user presses and holds the mic button
      Then the chat event log shows "voice start"
      When the user releases the held mic button
      Then the chat event log shows "voice stop"

    @web
    Scenario: Tapping the mic latches recording with cancel and send controls
      Given the chat-panel demo page
      When the user taps the mic button
      Then the chat event log shows "voice latch"
      When the user clicks the recording send control
      Then the chat event log shows "voice stop"

    @web
    Scenario: Tapping the mic then cancelling discards the recording
      Given the chat-panel demo page
      When the user taps the mic button
      And the user clicks the recording cancel control
      Then the chat event log shows "voice cancel"
