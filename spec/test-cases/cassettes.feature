# #Cassettes
# Record/replay cassettes for model API calls. See
# spec/behavior.md § Headless and spec/code-contract.md § Headless.
Feature: Record and replay model API calls

  The test suite records each model API response to a cassette file the
  first time it runs, then replays it from disk afterward — so the suite
  finishes in seconds and needs no API key. The recorder is a
  fetch-shaped wrapper handed to the headless runner; it runs in record
  or replay mode. These scenarios pin the recorder's contract: faithful
  replay, a loud failure on any unrecorded request, and record-once
  reuse.

  Rule: The headless runner routes model calls through a supplied fetch

    @headless @offline
    Scenario: A request is sent through the caller-supplied fetch
      Given a headless runner built with a fetch stub that logs each call
      When a natural-language request runs
      Then the fetch stub logged the model API call

  Rule: Replay serves recorded responses from disk

    @headless @offline
    Scenario: A recorded request replays verbatim without a network call
      Given a cassette holding a recorded response for one request
      When the recorder replays that exact request
      Then the recorder returns the recorded status and body
      And the network is never touched

  Rule: Replay never silently hits the network or serves stale data

    @headless @offline
    Scenario: An unrecorded request fails loudly
      Given a cassette holding a recorded response for one request
      When the recorder replays a different, unrecorded request
      Then the recorder fails with "no recording for this request"
      And the network is never touched

    @headless @offline
    Scenario: A changed request body is a miss, not a stale hit
      Given a cassette holding a recorded response for one request
      When the recorder replays that request with its body changed
      Then the recorder fails with "no recording for this request"

  Rule: Record captures a response once and reuses it

    @headless @offline
    Scenario: Record mode saves a fresh response, then serves repeats from disk
      Given an empty cassette wrapping an upstream that answers one request
      When the recorder records that request twice
      Then the upstream is called exactly once
      And the cassette file holds one recording
