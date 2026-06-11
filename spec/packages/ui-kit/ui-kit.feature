# #UiKit
# The design system: brand tokens (theme objects, typography, spacing) plus
# the primitive React components — Button, Icon, SplitButton, Toasts, and the
# light/dark ThemeProvider.
Feature: UI kit package

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
      Then the demo renders all 18 icon names

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
    Scenario: A toast appears and can be dismissed
      Given the ui-kit demo page
      When the user adds an "error" toast
      Then an "error" toast is visible
      When the user dismisses the first toast
      Then no toast is visible
