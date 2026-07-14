# #ColSplit
# split transformation — declarative 1 → N column splitting.
Feature: Column split

  Rule: Split by literal separator

    Background:
      Given load "colsplit-fullname-input.csv"

    @headless @cli @web
    Scenario: Split FullName into FirstName and LastName on space
      When query "Split FullName into FirstName and LastName on a single space"
      Then columns exist in the spec: "FirstName", "LastName"
      And every non-empty row has a non-null "FirstName"

    @headless @cli
    Scenario: Source column stays unless drop is set
      When query "Split FullName into FirstName and LastName on a single space"
      Then column "FullName" exists in the spec

    @headless @cli
    Scenario: Source column is removed when drop is set
      When query "Split FullName into FirstName and LastName on a single space and drop the original"
      Then column "FullName" is absent from the current rows

  Rule: Split by regex

    @headless @cli
    Scenario: Split Address into Street, City, Zip on comma-space
      Given load "colsplit-addresses-input.csv"
      When query "Split Address into Street, City, Zip on the regex \", \\s*\""
      Then columns exist in the spec: "Street", "City", "Zip"

  Rule: Arity mismatch behavior

    @headless @cli
    Scenario: Too few parts pad the tail with null
      Given "colsplit-fullname-input.csv" contains a row with FullName "Cher"
      When query "Split FullName into FirstName and LastName on a single space"
      Then the Cher row has FirstName "Cher"
      And the Cher row has LastName equal to null

    @headless @cli
    Scenario: Too many parts concatenate the extras onto the last column
      Given "colsplit-fullname-input.csv" contains a row with FullName "Mary Jane Watson"
      When query "Split FullName into FirstName and LastName on a single space"
      Then the row has FirstName "Mary"
      And the row has LastName "Jane Watson"

  Rule: Empty source cells

    @headless @cli
    Scenario: An empty input cell produces nulls in every output column
      Given "colsplit-fullname-input.csv" contains a row with FullName ""
      When query "Split FullName into FirstName and LastName on a single space"
      Then the row has FirstName equal to null
      And the row has LastName equal to null

  Rule: LLM-backed split expression

    @headless @cli
    Scenario: Split with an LLM expression returning an array of parts
      Given "colsplit-fullname-input.csv" contains messy international names
      When query "Split FullName into FirstName, MiddleName, LastName with an LLM"
      Then every non-empty row has a non-null "FirstName"
      # A mononym has no last name — same semantics as the literal-split
      # "too few parts pad the tail with null" rule above.
      And the Cher row has FirstName "Cher"
      And the Cher row has LastName equal to null
