# V2: split transformation — declarative 1 → N column splitting.
Feature: Column split

  Rule: Split by literal separator

    Background:
      Given "colsplit-fullname-input.csv" is loaded

    @headless @cli @web
    Scenario: Split FullName into FirstName and LastName on space
      When user requests "Split FullName into FirstName and LastName on a single space"
      Then column "FirstName" exists in the spec
      And column "LastName" exists in the spec
      And every non-empty row has a non-null "FirstName"

    @headless @cli
    Scenario: Source column stays unless drop is set
      When user requests "Split FullName into FirstName and LastName on a single space"
      Then column "FullName" exists in the spec

    @headless @cli
    Scenario: Source column is removed when drop is set
      When user requests "Split FullName into FirstName and LastName on a single space and drop the original"
      Then column "FullName" is absent from the current rows

  Rule: Split by regex

    @headless @cli
    Scenario: Split Address into Street, City, Zip on comma-space
      Given "colsplit-addresses-input.csv" is loaded
      When user requests "Split Address into Street, City, Zip on the regex \", \\s*\""
      Then column "Street" exists in the spec
      And column "City" exists in the spec
      And column "Zip" exists in the spec

  Rule: Arity mismatch behavior

    @headless @cli
    Scenario: Too few parts pad the tail with null
      Given "colsplit-fullname-input.csv" contains a row with FullName "Cher"
      When user requests "Split FullName into FirstName and LastName on a single space"
      Then the Cher row has FirstName "Cher"
      And the Cher row has LastName equal to null

    @headless @cli
    Scenario: Too many parts concatenate the extras onto the last column
      Given "colsplit-fullname-input.csv" contains a row with FullName "Mary Jane Watson"
      When user requests "Split FullName into FirstName and LastName on a single space"
      Then the row has FirstName "Mary"
      And the row has LastName "Jane Watson"

  Rule: Empty source cells

    @headless @cli
    Scenario: An empty input cell produces nulls in every output column
      Given "colsplit-fullname-input.csv" contains a row with FullName ""
      When user requests "Split FullName into FirstName and LastName on a single space"
      Then the row has FirstName equal to null
      And the row has LastName equal to null

  Rule: LLM-backed split expression

    @headless @cli
    Scenario: Split with an LLM expression returning an array of parts
      Given "colsplit-fullname-input.csv" contains messy international names
      When user requests "Split FullName into FirstName, MiddleName, LastName with an LLM"
      Then every row has a non-null "FirstName"
      And every row has a non-null "LastName"
