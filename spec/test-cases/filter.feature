# #FilterRows
Feature: Filter customer records

  Rule: Subset rows from a loaded CSV

    Background:
      Given load "filter-input.csv"
      And the expected output is "filter-expected.jsonl"

    @headless @cli @web @tour @cat-deterministic
    Scenario: Filter by Country
      When query "Show only customers in the USA"
      Then compare with the expected output

    @headless @cli @web
    Scenario: Export filtered data
      Given the table is filtered to USA customers
      When export as "filter-output.jsonl"
      Then "filter-output.jsonl" matches the expected output

  Rule: A committed request is stamped on the spec as provenance

    # The request text lands as `query` on the FIRST transformation the turn
    # added (written once, opening the group); EVERY added transformation gets
    # a short human `name` — its step label — so a saved flow reads top-down
    # as request → named steps without repeating the request per step.
    @headless
    Scenario: The request text becomes query metadata on the transformation it adds
      Given load "filter-input.csv"
      When query "Show only customers in the USA"
      Then the request text is stamped once as query metadata
      And every transformation the request added carries its step label as name metadata
      And a saved flow carries the same query metadata

    @headless
    Scenario: A multi-step request stamps its query only on the first added step
      Given load "customers-input.csv"
      When query "Keep only customers whose Country is exactly 'USA', then normalize their phone numbers"
      Then the request text is stamped once as query metadata
      And every transformation the request added carries its step label as name metadata

  Rule: A committed turn may not silently empty the table

    # @regression — user-reported 2026-07-17 (PR #237): a filter whose SQL
    # date parsing missed the data's real format matched nothing, and the
    # commit silently replaced the table with 0 rows. The replay result is
    # now checked before commit: 0 rows out of a non-empty source rejects
    # the turn into the recovery loop, so the model can loosen the
    # predicate — and a stubborn empty result fails the request instead of
    # emptying the table.
    @headless @scripted @regression
    Scenario: A patch that leaves the table empty is rejected into the recovery loop
      Given load "filter-input.csv"
      And a request whose first patch filters out every row
      When the spec patch is applied
      Then the recovery loop receives a zero-rows rejection
      And the corrected retry keeps 4 rows

  Rule: Deterministic filters are ordered before AI transformations

    # One request implying both a structural filter and a per-row AI step:
    # the filter must come first, so the per-row model calls run only on
    # the rows that survive it (spec/prompt-app-edit.md SYSTEM_PROMPT rule).
    @headless
    Scenario: A filter implied by the same request runs before the AI step
      Given load "customers-input.csv"
      When query "Keep only customers whose Country is exactly 'USA', then normalize their phone numbers"
      Then transformation 1 is a "filter"
      And transformation 2 is a "mutate"

  Rule: Surface-specific UX flows

    @cli
    Scenario: Execute saved flow from command line
      Given "filter.flow" exists
      And the expected output is "filter-expected.jsonl"
      When user runs "tamedtable execute filter.flow --input filter-input.csv --output filter-output.jsonl"
      Then "filter-output.jsonl" matches the expected output
