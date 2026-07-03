# #PivotData
# pivot and unpivot transformations — wide ↔ long reshape.
Feature: Pivot and unpivot

  Rule: pivot reshapes long → wide

    Background:
      Given load "pivot-long-input.csv"
      And the columns are "Region, Quarter, Revenue"

    @headless @cli @web @tour @cat-deterministic
    Scenario: One column per distinct on-value, default agg first
      Given the expected output is "pivot-tour-expected.jsonl"
      When query "Pivot Quarter into columns, with Revenue as the value"
      Then compare with the expected output
      And columns exist in the spec: "Q1", "Q2", "Q3", "Q4", "Region"
      And columns are absent from the current rows: "Quarter", "Revenue"

    @headless @cli
    Scenario: agg=sum collapses multiple values per index/on cell
      Given "pivot-long-input.csv" has two rows for Region "EU", Quarter "Q1"
      When query "Pivot Quarter into columns, sum Revenue"
      Then the EU row's Q1 value equals the sum of the two source rows

    @headless @cli
    Scenario: Missing combinations render as null
      Given "pivot-long-input.csv" has no row for Region "APAC", Quarter "Q3"
      When query "Pivot Quarter into columns, with Revenue as the value"
      Then the APAC row's Q3 value is null

    @headless @cli
    Scenario: One row per distinct index tuple
      When query "Pivot Quarter into columns, with Revenue as the value"
      Then the number of output rows equals the number of distinct Regions

  Rule: unpivot reshapes wide → long

    Background:
      Given load "pivot-wide-input.csv"
      And the columns are "Region, Q1, Q2, Q3, Q4"

    @headless @cli @web
    Scenario: One row per measure per input row
      When query "Unpivot Q1, Q2, Q3, Q4 into name and value columns"
      Then columns exist in the spec: "name", "value"
      And column "Q1" is absent from the current rows
      And the number of output rows equals the input rows times 4

    @headless @cli
    Scenario: Custom names_to and values_to
      When query "Unpivot Q1, Q2, Q3, Q4 into Quarter and Revenue"
      Then columns exist in the spec: "Quarter", "Revenue"
