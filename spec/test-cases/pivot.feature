# #PivotData
# V2: pivot and unpivot transformations — wide ↔ long reshape.
Feature: Pivot and unpivot

  Rule: pivot reshapes long → wide

    Background:
      Given "pivot-long-input.csv" is loaded
      And the columns are "Region, Quarter, Revenue"

    @headless @cli @web
    Scenario: One column per distinct on-value, default agg first
      When user requests "Pivot Quarter into columns, with Revenue as the value"
      Then column "Q1" exists in the spec
      And column "Q2" exists in the spec
      And column "Q3" exists in the spec
      And column "Q4" exists in the spec
      And column "Region" exists in the spec
      And column "Quarter" is absent from the current rows
      And column "Revenue" is absent from the current rows

    @headless @cli
    Scenario: agg=sum collapses multiple values per index/on cell
      Given "pivot-long-input.csv" has two rows for Region "EU", Quarter "Q1"
      When user requests "Pivot Quarter into columns, sum Revenue"
      Then the EU row's Q1 value equals the sum of the two source rows

    @headless @cli
    Scenario: Missing combinations render as null
      Given "pivot-long-input.csv" has no row for Region "APAC", Quarter "Q3"
      When user requests "Pivot Quarter into columns, with Revenue as the value"
      Then the APAC row's Q3 value is null

    @headless @cli
    Scenario: One row per distinct index tuple
      When user requests "Pivot Quarter into columns, with Revenue as the value"
      Then the number of output rows equals the number of distinct Regions

  Rule: unpivot reshapes wide → long

    Background:
      Given "pivot-wide-input.csv" is loaded
      And the columns are "Region, Q1, Q2, Q3, Q4"

    @headless @cli @web
    Scenario: One row per measure per input row
      When user requests "Unpivot Q1, Q2, Q3, Q4 into name and value columns"
      Then column "name" exists in the spec
      And column "value" exists in the spec
      And column "Q1" is absent from the current rows
      And the number of output rows equals the input rows times 4

    @headless @cli
    Scenario: Custom names_to and values_to
      When user requests "Unpivot Q1, Q2, Q3, Q4 into Quarter and Revenue"
      Then column "Quarter" exists in the spec
      And column "Revenue" exists in the spec
