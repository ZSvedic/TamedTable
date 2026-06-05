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
    Scenario: Dropdown lists only @tutorial scenario names
      Given the TamedTable web app
      When user opens the tutorial panel
      Then the tutorial list includes "Filter by Country"
      And the tutorial list includes "Count customers per country"
      And the tutorial list includes "Left join enriches each customer with ISO and Region"
      And the tutorial list includes "Split FullName into FirstName and LastName on a single space"
      And the tutorial list includes "Drop duplicates by Email"
      And the tutorial list includes "Pivot long to wide"
      And the tutorial list includes "Validate required fields"

  Rule: Playing a tutorial walks through steps

    @web
    Scenario: Play starts the tutorial at step 1
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      When user plays the tutorial
      Then the tutorial is at step 1

    @web
    Scenario: Next advances to the next step
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      When user advances to the next tutorial step
      Then the tutorial is at step 2

    @web
    Scenario: Prev goes back one step
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      And user advances to the next tutorial step
      When user goes to the previous tutorial step
      Then the tutorial is at step 1

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

  Rule: load-file steps auto-load fixtures

    @web
    Scenario: A load-file step loads the fixture automatically
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      When user plays the tutorial
      Then the table is loaded

  Rule: show-golden steps expose the golden comparison

    @web
    Scenario: A show-golden step makes the golden rows available
      Given the TamedTable web app
      And the tutorial "Filter by Country" is selected
      And user plays the tutorial
      When user advances to the last tutorial step
      Then the golden rows are available
