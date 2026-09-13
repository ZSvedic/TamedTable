# #TutorialMode #Analyze
# The "Understand first" showcase tour: four questions about one sales
# sheet, and the table never changes. A key-free @tour deep-linked from the
# homepage; replays from showcase-analyze.json. The same sheet the "Be
# exact" tour then dedupes, joins, and pivots: understand it first, then
# tame it. Atomic scenarios stay in analyze.feature.
Feature: Understand first showcase tour

  Rule: Four questions about one sales sheet, and the table never changes

    # showcase-exact-input.csv: 24 rows, 6 customers, Acme Robotics far ahead
    # on revenue, two rows that appear twice. Every assertion is a fact of
    # the file, never a wording golden.
    @web @tour @cat-analyze
    Scenario: Understand a sales sheet before touching it
      Given the TamedTable web app
      And load "showcase-exact-input.csv"
      When query "How many customers are there?"
      Then no toast is shown
      And the answer mentions "6"
      When query "Which customer brings in the most revenue?"
      Then no toast is shown
      And the answer mentions "Acme Robotics"
      And the answer's result table has a "Customer" column
      When query "What share of total revenue do the top 3 customers make?"
      Then no toast is shown
      And the answer mentions a percentage between 70 and 80
      When query "Are there any duplicate rows?"
      Then no toast is shown
      And the answer's result table has at least 1 row
      And the spec has 0 transformations
      And the current rows count is 24
