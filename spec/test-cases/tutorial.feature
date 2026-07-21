# #TutorialMode
# Tutorial panel — walk through @tour scenarios offline, key-free.
# All scenarios are @web; the WebController drives the tour, no browser needed.
Feature: Tutorial panel

  Rule: The Tutorial panel opens and lists available tours

    @web
    Scenario: Tutorial button opens the panel
      Given the TamedTable web app
      When user opens the tutorial panel
      Then the tutorial panel is shown

    # The tour list holds one showcase story per homepage section; the atomic
    # per-feature scenarios stay out of it (they live in the Dev dropdown).
    @web
    Scenario: The clickable list shows only the showcase tours
      Given the TamedTable web app
      When user opens the tutorial panel
      Then the tutorial list includes "Clean up a messy customer list"
      And the tutorial list includes "Shape a quarterly sales report"
      And the tutorial list includes "Handle feedback in five languages"

    @web
    Scenario: The tutorial list is grouped by feature category
      Given the TamedTable web app
      When user opens the tutorial panel
      Then the tutorial group "Clean up" includes "Clean up a messy customer list"
      And the tutorial group "Validate" includes "Audit an order sheet"
      And the tutorial group "Be exact" includes "Shape a quarterly sales report"
      And the tutorial group "Process language" includes "Handle feedback in five languages"

    @web
    Scenario: The Dev dropdown lists @web non-@tour scenarios
      Given the TamedTable web app
      When user opens the tutorial panel
      Then the dev list includes "Aggregate produces one row per distinct by-tuple"
      And the dev list includes "Filter by Country"
      And the dev list does not include "Shape a quarterly sales report"

  # The step-mechanics scenarios below drive "Filter by Country" — an atomic
  # scenario that is no longer a marketing tour but stays in the manifest (Dev
  # dropdown), so it still plays; its 3 stops keep these tests short.
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
    Scenario: Starting a tour from a loaded file returns to the empty state
      # The first step spotlights the Open control, which on the phone exists only
      # in the empty state — so a tour started over a loaded file must clear it,
      # or the spotlight lands on nothing and the step shows a blank overlay.
      Given the TamedTable web app
      And load "filter-input.csv"
      And the tutorial "Filter by Country" is selected
      When user plays the tutorial
      Then no table is loaded
      And the tutorial is at step 1

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

    # A showcase tour chains several query steps; each Next waits for the
    # previous replayed request, so the whole story plays key-free end to end
    # and a fast clicker can never skip a query step.
    @web
    Scenario: A multi-step showcase tour plays whole, key-free
      Given the TamedTable web app
      And the API key has not been set
      And the tutorial "Clean up a messy customer list" is selected
      When user plays the whole tutorial
      Then the current rows count is 20
      And no toast is shown

    # Regression: the voice step plays its clip for seconds before the request
    # fires. A second Next inside that window must be ignored — re-executing
    # would fire a second, unrecorded voice request, and double-advancing would
    # skip the next query, desyncing every later step from the cassette.
    @web @regression
    Scenario: A double Next during the voice step executes it once
      Given the TamedTable web app
      And the API key has not been set
      And the tutorial "Handle feedback in five languages" is selected
      And user plays the tutorial
      And user advances to the next tutorial step
      When user advances to the next tutorial step twice rapidly
      And the tutorial settles
      Then the spec has 1 transformation
      And no toast is shown
      When user advances to the last tutorial step
      And the tutorial settles
      Then no toast is shown
      And every non-null "Phone" matches the pattern "^\+[0-9]{7,15}$"

  Rule: A lookup-table step is a silent prerequisite, not a tour step

    # `load the lookup table …` writes a file the join query reads; the user never
    # opens it, so the tour hides it. The tour reads Load → Run query: after one
    # Next the highlighted step is the query, not a phantom lookup step.
    @web
    Scenario: The join tour skips the lookup-table step
      Given the TamedTable web app
      And the tutorial "Left join enriches each customer with ISO and Region" is selected
      And user plays the tutorial
      When user advances to the next tutorial step
      Then the chat input is prefilled with "Join with join-country-codes.csv on Country to add ISO and Region"

  Rule: Finishing a tour marks it complete

    @web
    Scenario: Playing a tour to the end marks it complete
      Given the TamedTable web app
      And the API key has not been set
      And the tour "Flag rows with empty Phone" is not marked complete
      And the tutorial "Flag rows with empty Phone" is selected
      When user plays the whole tutorial
      Then the tour "Flag rows with empty Phone" is marked complete

  Rule: The terminal stop can stay in the finished tour

    # "Stay in tour" keeps the tour's result on screen in key-free replay mode:
    # undo/redo re-run earlier specs whose model calls replay from the cassette,
    # while new typed or spoken requests are refused with a toast — the cassette
    # cannot answer a request it never recorded.
    @web
    Scenario: Staying keeps the tour's result and replay mode
      Given the TamedTable web app
      And the API key has not been set
      And the tutorial "Flag rows with empty Phone" is selected
      And user plays the whole tutorial
      When user stays in the tour
      Then the spec has 1 transformation
      And the tutorial is not active
      And no toast is shown

    @web
    Scenario: Undo and redo replay key-free while staying
      Given the TamedTable web app
      And the API key has not been set
      And the tutorial "Flag rows with empty Phone" is selected
      And user plays the whole tutorial
      And user stays in the tour
      When user undoes the last change
      Then the spec has 0 transformations
      When user redoes the last change
      Then the spec has 1 transformation
      And no toast is shown

    @web
    Scenario: Playing another tour after staying starts cleanly
      Given the TamedTable web app
      And the API key has not been set
      And the tutorial "Flag rows with empty Phone" is selected
      And user plays the whole tutorial
      And user stays in the tour
      When user opens the tutorial panel
      # Selecting while stayed leaves the stayed tour first — back to the empty
      # state — so the view never reads rows from a freshly rebuilt engine.
      And the tutorial "Filter by Country" is selected
      Then the table has 0 rows
      When user plays the whole tutorial
      Then the spec has 1 transformation
      And table displays the header and at least the first 1 rows
      And no toast is shown

    @web
    Scenario: A new chat request is silently ignored while staying
      Given the TamedTable web app
      And the API key has not been set
      And the tutorial "Flag rows with empty Phone" is selected
      And user plays the whole tutorial
      And user stays in the tour
      When user sends the chat message "sort by Name"
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
