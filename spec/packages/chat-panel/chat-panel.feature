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

    # The thread follows the newest message (behavior.md § Web UI): a send
    # scrolls to the bubble just posted, however far up the user had read.
    @web
    Scenario: Sending scrolls the thread to the newest message
      Given the chat-panel demo page
      When the user fills the thread
      And the user scrolls the thread to the top
      And the user sends the chat message "normalize phones"
      Then the chat thread is scrolled to its newest message

    @web
    Scenario: Reading back is not yanked to the bottom by a new message
      Given the chat-panel demo page
      When the user fills the thread
      And the user scrolls the thread to the top
      And the user adds an error reply
      Then the chat thread stays where the user scrolled it

    @web
    Scenario: An Error-prefixed reply renders in error style
      Given the chat-panel demo page
      When the user adds an error reply
      Then an assistant error shows "Something broke"

    @web
    Scenario: An undone reply renders with a hollow marker
      Given the chat-panel demo page
      When the user adds an undone reply
      Then an undone assistant reply shows "Undone steps:"

    @web
    Scenario: Request detail expands and shows the turns
      Given the chat-panel demo page
      When the user adds a reply with request detail
      And the user expands the request detail
      Then the request detail shows "turn 1: committed"
      And the request detail shows "normalize the phone column"

    @web
    Scenario: A reportable reply with detail offers a Report bug action
      Given the chat-panel demo page
      When the user adds a reply with request detail
      And the user clicks the Report bug action
      Then the chat event log shows "report bug"

    @web
    Scenario: An app-error reply offers Report bug without a request detail
      Given the chat-panel demo page
      When the user adds an app-error reply
      Then an assistant error shows "Something unexpected broke"
      When the user clicks the Report bug action
      Then the chat event log shows "report bug"

    @web
    Scenario: A guidance error offers no Report bug action
      Given the chat-panel demo page
      When the user adds an error reply
      Then an assistant error shows "Something broke"
      And no Report bug action is shown

    @web
    Scenario: Streaming swaps send for stop, and stop cancels
      Given the chat-panel demo page
      When the user toggles chat streaming
      Then the chat shows it is running
      When the user clicks the chat stop button
      Then the chat event log shows "cancel"

    @web
    Scenario: Streaming shows live run progress with an expandable log
      Given the chat-panel demo page
      When the user toggles chat streaming
      Then the run progress line shows "Step 2 of 5: mutate Country (AI) · 300 / 424 rows"
      When the user expands the run progress detail
      Then the run progress log shows "Country · row 300"

    @web
    Scenario: A prefill lands in the draft
      Given the chat-panel demo page
      When the user clicks the prefill button
      Then the chat input contains "Keep rows where age >= 18"

    @web
    Scenario: A disabled hint greys out the input row
      Given the chat-panel demo page
      When the user clicks the replay-lock button
      Then the chat input is disabled with hint "Replay mode: undo/redo only"
      And the mic button is not shown

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
