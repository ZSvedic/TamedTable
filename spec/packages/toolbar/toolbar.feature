# #Toolbar
# The top-bar package: brand lockup, file readout, action buttons, the
# sample picker, and the "Open from URL" dialog.
Feature: Toolbar package

  Rule: Sample-file labels come from the filename extension

    @headless
    Scenario: A .csv sample is labelled CSV, everything else JSONL
      Then a toolbar sample named "customers-input.csv" is labelled "CSV"
      And a toolbar sample named "videos.jsonl" is labelled "JSONL"

  Rule: The demo page exercises the toolbar in a real browser

    @web
    Scenario: Action buttons fire their callbacks
      Given the toolbar demo page
      When the user clicks the toolbar button "Undo"
      Then the toolbar event log shows "undo"

    @web
    Scenario: The Save menu groups data formats and recipe exports
      Given the toolbar demo page
      When the user opens the toolbar save menu
      Then the toolbar menu shows the group header "Data"
      And the toolbar menu shows the group header "Recipe"
      When the user picks the toolbar menu item "Save JSONL…"
      Then the toolbar event log shows "save as jsonl"

    @web
    Scenario: The Save menu exports the recipe to Python
      Given the toolbar demo page
      When the user opens the toolbar save menu
      And the user picks the toolbar menu item "Save recipe as Python…"
      Then the toolbar event log shows "save as python"

    @web
    Scenario: The Open menu runs a saved flow
      Given the toolbar demo page
      When the user opens the toolbar open menu
      And the user picks the toolbar menu item "Open & run .flow…"
      Then the toolbar event log shows "open flow"

    @web
    Scenario: The Open menu lists recent files behind a Recent submenu
      Given the toolbar demo page
      When the user opens the toolbar open menu
      And the user picks the toolbar menu item "Recent"
      And the user picks the toolbar menu item "people.csv"
      Then the toolbar event log shows "recent people.csv"

    @web
    Scenario: The theme toggle flips the wrapper
      Given the toolbar demo page
      When the user clicks the toolbar theme toggle
      Then the toolbar event log shows "toggle theme"

    @web
    Scenario: Opening the URL dialog, typing, and loading
      Given the toolbar demo page
      When the user opens the toolbar URL dialog
      And the user types "https://example.com/data.csv" into the toolbar URL field
      And the user submits the toolbar URL dialog
      Then the toolbar event log shows "open url https://example.com/data.csv"
      And the toolbar URL dialog is closed

    @web
    Scenario: Picking a sample loads it straight away
      Given the toolbar demo page
      When the user opens the toolbar sample picker
      And the user picks the first toolbar sample
      Then the toolbar event log shows "open sample https://example.com/customers-input.csv"
      And the toolbar sample picker is closed
