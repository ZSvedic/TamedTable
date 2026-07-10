# #UiKit
# The design system: brand tokens (theme objects, typography, spacing) plus
# the primitive React components — Button, Icon, SplitButton, Toasts, and the
# light/dark ThemeProvider.
Feature: UI kit package

  Rule: A toast auto-fades, scaled to how long its message takes to read

    @headless
    Scenario: A short message stays for the floor duration
      Then a toast reading "Saved out.csv." stays on screen for 3000 ms

    @headless
    Scenario: A longer message stays on screen longer
      Then a toast reading a 100-character message stays on screen for 8000 ms

    @headless
    Scenario: A very long message is capped at the ceiling
      Then a toast reading a 300-character message stays on screen for 12000 ms

  Rule: The two themes are one shape with different values

    @headless
    Scenario: Light and dark themes expose the same token keys
      When the light and dark themes are compared
      Then both themes have identical key sets
      And the themes differ in their values

    @headless
    Scenario: Brand constants carry the published hex values
      Then brand ink is "#281C60"
      And brand accent is "#96BED7"
      And brand line is "#DCDCDC"

    @headless
    Scenario: Every on-color is readable on its surface in both themes
      # inkOnInk on ink (primary button), inkOnAcc on accent — a mistuned token
      # (e.g. an on-color left equal to its surface in dark mode) reads as
      # white-on-white.
      Then every on-color clearly contrasts with its surface in both themes

  Rule: The demo page exercises every component in a real browser

    @web
    Scenario: All four button variants render
      Given the ui-kit demo page
      Then the demo shows a "ghost" button
      And the demo shows a "chrome" button
      And the demo shows a "primary" button
      And the demo shows a "danger" button

    @web
    Scenario: Clicking a button reports the click
      Given the ui-kit demo page
      When the user clicks the "primary" button
      Then the demo log shows "primary clicked"

    @web
    Scenario: The full icon set renders
      Given the ui-kit demo page
      Then the demo renders every icon name

    @web
    Scenario: The theme toggle flips to dark mode and back
      Given the ui-kit demo page
      When the user clicks the theme toggle
      Then the demo is in "dark" mode
      When the user clicks the theme toggle
      Then the demo is in "light" mode

    @web
    Scenario: The split button menu opens, picks, and closes
      Given the ui-kit demo page
      When the user clicks the split button caret
      And the user picks the menu item "Save as flow"
      Then the demo log shows "Save as flow clicked"
      And the split button menu is closed

    @web
    Scenario: A toast can carry an inline action
      Given the ui-kit demo page
      When the user adds a toast with a "Copy report" action
      Then the newest toast shows an action labelled "Copy report"
      When the user clicks the newest toast's action
      Then the demo log records the toast action

    @web
    Scenario: A toast appears and can be dismissed
      Given the ui-kit demo page
      When the user adds an "error" toast
      Then an "error" toast is visible
      When the user dismisses the first toast
      Then no toast is visible

    @web
    Scenario: A toast fades on its own without a click
      Given the ui-kit demo page
      When the user adds an "info" toast
      Then an "info" toast is visible
      Then the toast fades on its own
