# #TutorialMode
# Tutorial panel — walk through @tutorial scenarios offline, key-free.
# All scenarios are @web; the WebController drives the tour, no browser needed.
Feature: Tutorial panel

  Rule: The Tutorial panel opens and lists available tours

    @web
    Scenario: Tutorial button opens the panel
      Given the TamedTable web app
      When user opens the tutorial panel
      Then the tutorial panel is shown

    @web
    Scenario: The clickable list shows only @tutorial scenario names
      Given the TamedTable web app
      When user opens the tutorial panel
      Then the tutorial list includes "Filter by Country"
      And the tutorial list includes "Normalize the phone numbers"
      And the tutorial list includes "Left join enriches each customer with ISO and Region"

    @web
    Scenario: The tutorial list is grouped by feature category
      Given the TamedTable web app
      When user opens the tutorial panel
      Then the tutorial group "Clean up" includes "Normalize the phone numbers"
      And the tutorial group "Validate" includes "Flag prices that seem wrong"
      And the tutorial group "Deterministic" includes "Filter by Country"
      And the tutorial group "Language" includes "Normalize DOB by voice"

    @web
    Scenario: The Dev dropdown lists @web non-@tutorial scenarios
      Given the TamedTable web app
      When user opens the tutorial panel
      Then the dev list includes "Aggregate produces one row per distinct by-tuple"
      And the dev list does not include "Filter by Country"

  Rule: Playing a tutorial walks through steps

    @web
    Scenario: Play starts the tutorial at step 1
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      When user plays the tutorial
      Then the tutorial is at step 1

    @web
    Scenario: Play closes the tutorial panel
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user opens the tutorial panel
      When user plays the tutorial
      Then the tutorial panel is not shown

    @web
    Scenario: Next executes the current step and advances
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      When user advances to the next tutorial step
      Then the tutorial is at step 2

    @web
    Scenario: Cancel exits the tutorial
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      When user cancels the tutorial
      Then the tutorial is not active

    @web
    Scenario: Play again after cancel restarts at step 1
      Given the TamedTable web app
      And the tutorial "Left join enriches each customer with ISO and Region" is selected
      And user plays the tutorial
      And user cancels the tutorial
      When user plays the tutorial
      Then the tutorial is at step 1

    @web
    Scenario: Finish after last step returns to the tutorial chooser
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      And user advances to the last tutorial step
      When user finishes the tutorial
      Then the tutorial panel is shown
      And the tutorial is not active

    @web
    Scenario: Finishing a deep-link tour opens the Tutorial chooser panel
      Given the TamedTable web app
      When user opens a deep link to feature "filter.feature" scenario "Filter by Country"
      And user advances to the last tutorial step
      And user finishes the tutorial
      Then the tutorial panel is shown
      And the tutorial is not active

  Rule: Query steps prefill the chat input

    @web
    Scenario: A query step prefills the chat input when highlighted
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      When user advances to the next tutorial step
      Then the chat input is prefilled with "Show only customers in the USA"

    @web
    Scenario: Running a query step clears the prefilled chat input
      Given the TamedTable web app
      And the API key has not been set
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      And user advances to the next tutorial step
      When user advances to the next tutorial step
      And the tutorial settles
      Then the chat input is not prefilled

  Rule: load-file steps auto-load fixtures

    @web
    Scenario: A load-file step loads the fixture on Next
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      When user advances to the next tutorial step
      Then the table is loaded

  Rule: show-golden steps expose the golden comparison

    @web
    Scenario: A show-golden step makes the golden rows available after execution
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      When user advances to the last tutorial step
      Then the golden rows are available

  Rule: A tutorial plays its LLM steps from a cassette with no API key

    @web
    Scenario: A prefill-chat step replays from the tour's cassette, key-free
      Given the TamedTable web app
      And the API key has not been set
      And the tutorial "Flag rows with empty Phone" is selected
      When user plays the whole tutorial
      Then the spec has 1 transformation
      And no toast is shown

    @web
    Scenario: A play-audio step replays the voice cassette against Gemini, key-free
      Given the TamedTable web app
      And the API key has not been set
      And the tutorial "Normalize DOB by voice" is selected
      When user plays the whole tutorial
      Then the spec has 1 transformation
      And no toast is shown

  Rule: A deep link opens, selects, and plays a named tour

    @web
    Scenario: A valid feature and scenario autoplays from step 1
      Given the TamedTable web app
      When user opens a deep link to feature "filter.feature" scenario "Filter by Country"
      Then the tutorial is at step 1
      And the tutorial panel is not shown

    @web
    Scenario: An unknown scenario leaves the panel closed
      Given the TamedTable web app
      When user opens a deep link to feature "filter.feature" scenario "No Such Scenario"
      Then the tutorial panel is not shown
      And the tutorial is not active

    @web
    Scenario: A missing scenario param leaves the panel closed
      Given the TamedTable web app
      When user opens a deep link to feature "filter.feature" scenario ""
      Then the tutorial panel is not shown
      And the tutorial is not active
