# V2: {sql} expression shape — DuckDB-backed predicates, scalars, aggregates.
Feature: SQL expressions

  Rule: {sql} as a scalar in mutate

    Background:
      Given "datanorm-input.csv" is loaded

    @headless @cli
    Scenario: SQL scalar fills a new column
      When user requests "Add column AgeYears computed in SQL as date_diff('year', DOB::DATE, current_date)"
      Then column "AgeYears" exists in the spec
      And at least one row has a non-null "AgeYears"

    @headless @cli
    Scenario: SQL parse error flows through the recovery loop
      Given a request that introduces an invalid SQL fragment
      When the spec patch is applied
      Then the recovery loop receives the DuckDB error message
      And the final commit either succeeds within the recovery budget or throws

  Rule: {sql} as a predicate in filter

    @headless @cli
    Scenario: SQL predicate filters rows
      When user requests "Filter to rows where Country in ('USA', 'UK') using SQL"
      Then every remaining row has Country in ("USA", "UK")

  Rule: {sql} as an aggregate in group

    @headless @cli
    Scenario: SQL aggregate inside group
      When user requests "Group by Country and compute average phone length in SQL"
      Then column "Country" exists in the spec
      And column "avg_phone_length" exists in the spec

  Rule: DuckDB state lifecycle

    @headless @cli
    Scenario: SQL sees the latest committed rows after :undo
      When user enters the REPL with "datanorm-input.csv" and types:
        """
        Add column UpperCountry computed in SQL as upper(Country)
        :undo
        Add column LowerCountry computed in SQL as lower(Country)
        exit
        """
      Then REPL exit code is 0
      And column "LowerCountry" exists in the spec
      And column "UpperCountry" is absent from the current rows

    @headless @cli
    Scenario: Reloading input resets the DuckDB relation
      When user enters the REPL with "datanorm-input.csv" and types:
        """
        Add column UpperCountry computed in SQL as upper(Country)
        :load filter-input.csv
        Add column UpperCity computed in SQL as upper(City)
        exit
        """
      Then REPL exit code is 0
      And column "UpperCity" exists in the spec
      And column "UpperCountry" is absent from the current rows

  Rule: Cancellation interrupts a running SQL query

    @headless @cli @cancel
    Scenario: Ctrl-C interrupts a long-running SQL aggregate
      Given "datanorm-input.csv" is loaded
      When user requests "Compute a slow SQL aggregate over Country" via SQL
      And user cancels the operation while the SQL query is in flight
      Then processing stops within 2 seconds
      And the spec contains no transformation for that aggregate
      And the table shows pre-transformation values for every row

    @headless @cli @cancel
    Scenario: Cancellation leaves the DuckDB relation intact for the next request
      Given "datanorm-input.csv" is loaded
      When user requests "Compute a slow SQL aggregate over Country" via SQL
      And user cancels the operation while the SQL query is in flight
      And user requests "Add column UpperCountry computed in SQL as upper(Country)"
      Then the second request commits successfully
      And column "UpperCountry" exists in the spec

    @headless @cli @cancel
    Scenario: Cancellation does not affect previously-applied SQL transformations
      Given "datanorm-input.csv" is loaded
      And the column "UpperCountry" has been added via SQL
      When user requests "Compute a slow SQL aggregate over Country" via SQL
      And user cancels the operation while the SQL query is in flight
      Then column "UpperCountry" still shows uppercased values
      And the spec contains no transformation for the cancelled aggregate

    @headless @cli @cancel
    Scenario: A SQL query that ignores interrupt drains within the next request
      Given "datanorm-input.csv" is loaded
      And the SQL query is contrived to ignore conn.interrupt() for 5 seconds
      When user requests "Compute the slow SQL aggregate" via SQL
      And user cancels the operation while the SQL query is in flight
      Then the cancel signal returns within 2 seconds
      And a second request started immediately throws "request already running"
      And the second request succeeds after the lingering query drains
