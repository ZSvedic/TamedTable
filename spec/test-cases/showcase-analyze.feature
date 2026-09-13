# #TutorialMode #Analyze
# The "Analyze" showcase tour: four questions about one sales sheet, and the
# table never changes. A key-free @tour deep-linked from the homepage;
# replays from showcase-analyze.json. The same sheet the "Be exact" tour
# then dedupes, joins, and pivots: analyze it first, then tame it. Atomic
# scenarios stay in analyze.feature.
Feature: Analyze showcase tour

  Rule: Four questions about one sales sheet, and the table never changes

    # showcase-exact-input.csv: 24 rows, 6 customers. The top 3 customers
    # (Acme Robotics, Thames Analytics, Alpen Kaffee) hold 74 to 77% of
    # revenue depending on how the two duplicated rows are counted; Alpen
    # Kaffee grows most from Q1 to Q4 (+51%); Maple Data has no Q3 or Q4
    # row; two rows appear twice. Every assertion is a fact of the file,
    # never a wording golden.
    @web @tour @cat-analyze
    Scenario: Analyze a sales sheet before touching it
      Given the TamedTable web app
      And load "showcase-exact-input.csv"
      When query "What share of total revenue do the top 3 customers make?"
      Then no toast is shown
      And the answer mentions a percentage between 70 and 80
      And the answer's result table has a "Customer" column
      When query "Which customer is growing fastest?"
      Then no toast is shown
      And the answer mentions "Alpen Kaffee"
      When query "Which customers might we be losing?"
      Then no toast is shown
      And the answer mentions "Maple Data"
      When query "Are there any duplicate rows?"
      Then no toast is shown
      And the answer's result table has at least 1 row
      And the spec has 0 transformations
      And the current rows count is 24
