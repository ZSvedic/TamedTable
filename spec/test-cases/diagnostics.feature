# #Diagnostics
# Web-only: the in-app diagnostics log and its one-click report. Every
# scenario is offline — a failed request is simulated (a 401 mock or a
# tutorial replay miss), so no model call leaves the browser.
Feature: In-app diagnostics log

  Rule: Failures are captured with the context that explains them

    @web @offline
    Scenario: A failed model request records its fingerprint and truncated body
      Given the TamedTable web app
      And load "customers-input.csv"
      And the provider "anthropic" has API key "sk-ant-example-key"
      And the LLM API returns a 401 unauthorized error
      When user sends the chat message "norm dob col"
      Then a diagnostics event records a request fingerprint
      And the latest request diagnostics event names the provider "anthropic"
      And the latest request diagnostics event carries a truncated request body

    @web @offline
    # The original bug: "no recording for this request: <hash>" on a tour, which
    # took a long browser session to root-cause. The fingerprint + the tour and
    # scenario name would have made it a two-minute diagnosis.
    Scenario: A tutorial replay miss is recorded with the tour scenario and fingerprint
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      When user plays the tutorial
      And user advances to the next tutorial step
      And user sends the chat message "this request was never recorded"
      Then a diagnostics event records a request fingerprint
      And a diagnostics event names the tutorial scenario "Filter by Country"

  Rule: Keys never reach the report

    @web @offline @regression
    # Regression: API keys must never appear in a diagnostics report, even when
    # the config holds them. See the #Diagnostics redaction contract.
    Scenario: The diagnostics report never contains an API key
      Given the TamedTable web app
      And load "customers-input.csv"
      And the provider "anthropic" has API key "sk-ant-secret-DEADBEEF1234"
      And the gemini key is set to "AIza-secret-DEADBEEF1234"
      And the LLM API returns a 401 unauthorized error
      When user sends the chat message "norm dob col"
      Then a toast shows "Invalid API key"
      And the diagnostics report contains no API key
      And the diagnostics report drops the provider key fields

    @web @offline @regression
    # The bug-report link prefills a GitHub issue with the report — it must stay
    # redacted, since the URL is shared publicly.
    Scenario: The bug-report link points to GitHub with a redacted report
      Given the TamedTable web app
      And load "customers-input.csv"
      And the provider "anthropic" has API key "sk-ant-secret-DEADBEEF1234"
      And the LLM API returns a 401 unauthorized error
      When user sends the chat message "norm dob col"
      Then the bug report link targets the TamedTable issue tracker
      And the bug report link contains no API key

  Rule: The report and log are one click away

    @web @offline
    Scenario: The diagnostics report is a self-contained markdown doc
      Given the TamedTable web app
      And load "customers-input.csv"
      And the provider "anthropic" has API key "sk-ant-example-key"
      And the LLM API returns a 401 unauthorized error
      When user sends the chat message "norm dob col"
      Then the diagnostics report mentions the app version
      And the diagnostics report lists the most recent event first

    @web @offline
    Scenario: Clearing diagnostics empties the log
      Given the TamedTable web app
      And load "customers-input.csv"
      And the API key has not been set
      When user sends the chat message "Normalize phone numbers"
      Then the diagnostics log is not empty
      When user clears diagnostics
      Then the diagnostics log is empty
