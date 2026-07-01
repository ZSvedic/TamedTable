# #BenchPerf
# Standalone performance benchmark — NOT part of `bun run test`. It is driven by
# its own Cucumber profile (`bun run bench`) and prints a summary table of total
# time, tokens used, and estimated cost per scenario. The scenarios carry only
# the `@perf` tag (never `@headless`/`@cli`/`@web`), so the regular test profiles
# skip them and CI stays fast and offline.
#
# Three groups map to the three things a large table stresses:
#   A — loading the file               (pure I/O, no model call)
#   B — SQL operations (sort/filter)   (engine execution over every row, no model call)
#   C — natural-language cell fills    (a weaker model called over N/batch-size turns)
#
# A and B run offline with real numbers out of the box. C calls the model, so it
# is tagged @needs-recording: `bun run bench` skips it until a cassette exists;
# `bun run bench:record` (needs ANTHROPIC_API_KEY) records one, and
# `bun run bench:live` runs it straight against the API. See README → Performance
# benchmark.
@perf
Feature: Performance benchmark on large tables

  Rule: A — Loading a large file

    @perf @bench-load
    Scenario: Load the 1820-row liked-videos CSV
      Given a fresh benchmark runner
      When the benchmark loads "performance-liked-videos.csv"
      Then the benchmark records the result

  Rule: B — SQL operations on a large table

    @perf @bench-sql
    Scenario: Sort every row by channel
      Given a fresh benchmark runner
      And the benchmark has loaded "performance-liked-videos.csv"
      When the benchmark sorts rows by "channel"
      Then the benchmark records the result

    @perf @bench-sql
    Scenario: Filter every row to a single channel
      Given a fresh benchmark runner
      And the benchmark has loaded "performance-liked-videos.csv"
      When the benchmark filters rows where "channel" equals "Marques Brownlee"
      Then the benchmark records the result

  Rule: C — Natural-language cell operations (weaker model, N/batch-size turns)

    @perf @bench-nl
    Scenario: Add a boolean Music column classifying each video
      Given a fresh benchmark runner
      And the benchmark has loaded "performance-liked-videos.csv"
      When the benchmark runs the NL request "Add a boolean column Music that is true for music videos"
      Then the benchmark records the result
