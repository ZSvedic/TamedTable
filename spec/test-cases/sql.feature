# #SqlExpr
# {sql} expression shape — DuckDB-backed predicates, scalars, aggregates.
Feature: SQL expressions

  Rule: {sql} as a scalar in mutate

    Background:
      Given load "customers-input.csv"

    # @web too: the web build routes {sql} through duckdb-wasm. The web
    # cucumber surface runs the controller in Node (real @duckdb/node-api) and
    # replays the same sql.json cassette — the request body is byte-identical —
    # so this proves the controller re-enables SQL. The browser wasm path itself
    # is exercised by web/e2e/sql.e2e.ts.
    @headless @cli @web
    Scenario: SQL scalar fills a new column
      When query "Add column AgeYears computed in SQL as date_diff('year', DOB::DATE, current_date)"
      Then column "AgeYears" exists in the spec
      And at least one row has a non-null "AgeYears"

    @headless @cli @scripted
    Scenario: SQL parse error flows through the recovery loop
      Given a request that introduces an invalid SQL fragment
      When the spec patch is applied
      Then the recovery loop receives the DuckDB error message
      And the final commit either succeeds within the recovery budget or throws

  Rule: {sql} as a predicate in filter

    @headless @cli
    Scenario: SQL predicate filters rows
      When query "Filter to rows where Country in ('USA', 'UK') using SQL"
      Then every remaining row has Country in ("USA", "UK")

  Rule: {sql} as an aggregate in group

    @headless @cli
    Scenario: SQL aggregate inside group
      When query "Group by Country and compute average phone length in SQL"
      Then columns exist in the spec: "Country", "avg_phone_length"

  Rule: DuckDB state lifecycle

    @headless @cli
    Scenario: SQL sees the latest committed rows after :undo
      When user enters the REPL with "customers-input.csv" and types:
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
      When user enters the REPL with "customers-input.csv" and types:
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

    These scenarios run against the 1 821-row performance fixture so the
    aggregate is reliably still executing when the cancel lands. The
    `via SQL` request path is scripted — the patch turn is answered locally
    with a canned aggregate over the fixture — so the SQL that reaches
    DuckDB is deterministic where a live model would not be.

    @headless @cli @cancel @scripted
    Scenario: Ctrl-C interrupts a long-running SQL aggregate
      Given load "performance-liked-videos.csv"
      When query "Compute a slow SQL aggregate over channel" via SQL
      And user cancels the operation while the SQL query is in flight
      Then processing stops within 2 seconds
      And the spec contains no transformation for that aggregate
      And the table shows pre-transformation values for every row

    @headless @cli @cancel @scripted
    Scenario: Cancellation leaves the DuckDB relation intact for the next request
      Given load "performance-liked-videos.csv"
      When query "Compute a slow SQL aggregate over channel" via SQL
      And user cancels the operation while the SQL query is in flight
      And query "Add column UpperChannel computed in SQL as upper(channel)"
      Then the second request commits successfully
      And column "UpperChannel" exists in the spec

    @headless @cli @cancel @scripted
    Scenario: Cancellation does not affect previously-applied SQL transformations
      Given load "performance-liked-videos.csv"
      And the column "UpperChannel" has been added via SQL
      When query "Compute a slow SQL aggregate over channel" via SQL
      And user cancels the operation while the SQL query is in flight
      Then column "UpperChannel" still shows uppercased values
      And the spec contains no transformation for the cancelled aggregate

    @headless @cli @cancel @scripted
    Scenario: A SQL query that ignores interrupt drains within the next request
      Given load "performance-liked-videos.csv"
      And the SQL query is contrived to ignore conn.interrupt()
      When query "Compute the slow SQL aggregate" via SQL
      And user cancels the operation while the SQL query is in flight
      Then the cancel signal returns within 2 seconds
      And a second request started immediately throws "a request is already in progress"
      And the second request succeeds after the lingering query drains
