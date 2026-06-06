# #GherkinTour
# Zero-dependency parser: reads a .feature string, returns every scenario with
# its tags and a tour-ready step list. All fixtures are inline docstrings.
Feature: Gherkin Tour parser

  Rule: Every scenario is returned, with its tags

    @headless
    Scenario: A scenario is returned regardless of tags
      Given a feature string:
        """
        Feature: Demo
          Scenario: Not tagged
            Given load "foo.csv"
        """
      When parseTours is called
      Then the result has 1 scenario
      And scenario 1 is named "Not tagged"

    @headless
    Scenario: Tags are captured on the scenario
      Given a feature string:
        """
        Feature: Demo
          @web @tutorial
          Scenario: My tour
            Given load "foo.csv"
        """
      When parseTours is called
      Then scenario 1 is tagged "@tutorial"
      And scenario 1 is tagged "@web"

    @headless
    Scenario: Multiple scenarios are all returned
      Given a feature string:
        """
        Feature: Demo
          @other
          Scenario: First
            Given load "foo.csv"

          @tutorial
          Scenario: Second
            Given load "bar.csv"
        """
      When parseTours is called
      Then the result has 2 scenarios
      And scenario 1 is named "First"
      And scenario 2 is named "Second"

  Rule: Background steps prepend to every scenario

    @headless
    Scenario: Top-level Background steps prepend
      Given a feature string:
        """
        Feature: Demo
          Background:
            Given load "base.csv"

          @tutorial
          Scenario: With background
            When query "Do something"
        """
      When parseTours is called
      Then scenario 1 has 2 steps
      And step 1 of scenario 1 has text 'load "base.csv"'

    @headless
    Scenario: Rule-scoped Background prepends only to scenarios under that Rule
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Outside rule
            When query "Top level"

          Rule: Scoped
            Background:
              Given load "scoped.csv"

            @tutorial
            Scenario: Inside rule
              When query "Do scoped"
        """
      When parseTours is called
      Then the result has 2 scenarios
      And scenario 1 has 1 step
      And scenario 2 has 2 steps
      And step 1 of scenario 2 has text 'load "scoped.csv"'

  Rule: Step classification

    @headless
    Scenario: load-file action from load "X"
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Load step
            Given load "my-data.csv"
        """
      When parseTours is called
      Then step 1 of scenario 1 has action kind "load-file"
      And step 1 of scenario 1 has action filename "my-data.csv"

    @headless
    Scenario: load-lookup action from load the lookup table "X"
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Lookup step
            Given load the lookup table "codes.csv" with columns "A, B"
        """
      When parseTours is called
      Then step 1 of scenario 1 has action kind "load-lookup"
      And step 1 of scenario 1 has action filename "codes.csv"

    @headless
    Scenario: prefill-chat action from query "Y"
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Chat step
            When query "Normalize phone numbers"
        """
      When parseTours is called
      Then step 1 of scenario 1 has action kind "prefill-chat"
      And step 1 of scenario 1 has action text "Normalize phone numbers"

    @headless
    Scenario: show-golden action from compare with the expected output
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: Golden step
            When query "Do it"
            Then compare with the expected output
        """
      When parseTours is called
      Then step 2 of scenario 1 has action kind "show-golden"

  Rule: Verification steps are dropped; the golden source is lifted

    @headless
    Scenario: Unrecognised (verification) steps are dropped from the tour
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: With assertions
            Given load "x.csv"
            When query "Do it"
            Then something else happens
            And column "Country" exists in the spec
        """
      When parseTours is called
      Then scenario 1 has 2 steps
      And step 1 of scenario 1 has action kind "load-file"
      And step 2 of scenario 1 has action kind "prefill-chat"

    @headless
    Scenario: the expected output step is lifted onto the scenario, not a step
      Given a feature string:
        """
        Feature: Demo
          @tutorial
          Scenario: With golden
            Given load "x.csv"
            And the expected output is "x-expected.jsonl"
            When query "Do it"
            Then compare with the expected output
        """
      When parseTours is called
      Then scenario 1 has 3 steps
      And scenario 1 has golden "x-expected.jsonl"

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
            Given load "x.csv"
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
            Given load "<file>"
            Examples:
              | file    |
              | a.csv   |

          @tutorial
          Scenario: Regular tour
            Given load "b.csv"
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
