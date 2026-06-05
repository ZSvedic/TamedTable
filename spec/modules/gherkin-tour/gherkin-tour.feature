# #GherkinTour
# Zero-dependency parser: reads a .feature string, returns @tutorial scenarios.
# All fixtures are inline docstrings — no file I/O.
Feature: Gherkin Tour parser

  Rule: Only @tutorial-tagged scenarios are returned

    @headless
    Scenario: Untagged scenario is dropped
      Given a feature string:
        """
        Feature: Demo
          Scenario: Not tagged
            Given "foo.csv" is loaded
        """
      When parseTours is called
      Then the result is empty

    @headless
    Scenario: @tutorial scenario is returned
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: My tour
            Given "foo.csv" is loaded
        """
      When parseTours is called
      Then the result has 1 scenario
      And scenario 1 is named "My tour"

    @headless
    Scenario: Mixed tags — only @tutorial ones returned
      Given a feature string:
        """
        Feature: Demo
          @other
          Scenario: Not mine
            Given "foo.csv" is loaded

          @tutorial
          Scenario: Mine
            Given "bar.csv" is loaded
        """
      When parseTours is called
      Then the result has 1 scenario
      And scenario 1 is named "Mine"

  Rule: Background steps prepend to every @tutorial scenario

    @headless
    Scenario: Top-level Background steps prepend
      Given a feature string:
        """
        Feature: Demo
          Background:
            Given "base.csv" is loaded

          @tutorial
          Scenario: With background
            When user requests "Do something"
        """
      When parseTours is called
      Then scenario 1 has 2 steps
      And step 1 of scenario 1 has text '"base.csv" is loaded'

    @headless
    Scenario: Rule-scoped Background prepends only to scenarios under that Rule
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Outside rule
            When user requests "Top level"

          Rule: Scoped
            Background:
              Given "scoped.csv" is loaded

            @tutorial
            Scenario: Inside rule
              When user requests "Do scoped"
        """
      When parseTours is called
      Then the result has 2 scenarios
      And scenario 1 has 1 step
      And scenario 2 has 2 steps
      And step 1 of scenario 2 has text '"scoped.csv" is loaded'

  Rule: Step classification

    @headless
    Scenario: load-file action from Given "X" is loaded
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Load step
            Given "my-data.csv" is loaded
        """
      When parseTours is called
      Then step 1 of scenario 1 has action kind "load-file"
      And step 1 of scenario 1 has action filename "my-data.csv"

    @headless
    Scenario: prefill-chat action from When user requests "Y"
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Chat step
            When user requests "Normalize phone numbers"
        """
      When parseTours is called
      Then step 1 of scenario 1 has action kind "prefill-chat"
      And step 1 of scenario 1 has action text "Normalize phone numbers"

    @headless
    Scenario: show-golden action from Then the table matches the golden output
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Golden step
            Then the table matches the golden output
        """
      When parseTours is called
      Then step 1 of scenario 1 has action kind "show-golden"

    @headless
    Scenario: display fallback for unrecognised steps
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Unknown step
            Then something else happens
        """
      When parseTours is called
      Then step 1 of scenario 1 has action kind "display"

  Rule: Comments and Scenario Outlines are ignored

    @headless
    Scenario: Comment lines are skipped
      Given a feature string:
        """
        Feature: Demo
          # This is a comment
          @tutorial
          Scenario: Commented
            # Another comment
            Given "x.csv" is loaded
        """
      When parseTours is called
      Then the result has 1 scenario
      And scenario 1 has 1 step

    @headless
    Scenario: Scenario Outline is skipped silently
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario Outline: Outline tour
            Given "<file>" is loaded
            Examples:
              | file    |
              | a.csv   |

          @tutorial
          Scenario: Regular tour
            Given "b.csv" is loaded
        """
      When parseTours is called
      Then the result has 1 scenario
      And scenario 1 is named "Regular tour"

    @headless
    Scenario: Empty input returns empty result
      Given a feature string:
        """
        """
      When parseTours is called
      Then the result is empty
