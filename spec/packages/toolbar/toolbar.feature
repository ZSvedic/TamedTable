# #Toolbar
# The top-bar package: brand lockup, file readout, action buttons, and the
# "Open from URL" dialog with sample-file quick-picks.
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
      When the user clicks the toolbar button "Save data"
      Then the toolbar event log shows "save data"
      When the user clicks the toolbar button "Undo"
      Then the toolbar event log shows "undo"

    @web
    Scenario: The Save-as menu saves a copy in another format
      Given the toolbar demo page
      When the user opens the toolbar save menu
      And the user picks the toolbar menu item "Save as JSONL…"
      Then the toolbar event log shows "save as jsonl"

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
    Scenario: Picking a sample fills the URL field
      Given the toolbar demo page
      When the user opens the toolbar URL dialog
      And the user picks the first toolbar sample
      Then the toolbar URL field is not empty
