# Gherkin Tour parser

The `@tamedtable/gherkin-tour` package reads a Gherkin `.feature` string and
returns every scenario in it, each carrying its tags and a tour-ready list of
steps classified into typed actions a tutorial driver can execute. Filtering by
tag (`@tutorial` for the panel's list, `@web` for the dev dropdown) is left to
the consumer. The package has no dependencies and runs in any JavaScript
environment — browser, Node, Bun, or a headless test.

## Worked example

Given this `.feature` fragment:

```gherkin
Feature: Filter demo

  Background:
    Given load "filter-input.csv"
    And the expected output is "filter-expected.jsonl"

  Scenario: Untagged
    When query "something"

  @web @tutorial
  Scenario: Filter by Country
    When query "Show only customers in the USA"
    Then column "Country" exists in the spec
    Then compare with the expected output
```

`parseTours` returns two `TourScenario`s. The second one:

```js
{
  name: "Filter by Country",
  tags: ["@web", "@tutorial"],
  golden: "filter-expected.jsonl",
  steps: [
    { keyword: "Given", text: 'load "filter-input.csv"',
      action: { kind: "load-file", filename: "filter-input.csv" } },
    { keyword: "When",  text: 'query "Show only customers in the USA"',
      action: { kind: "prefill-chat", text: "Show only customers in the USA" } },
    { keyword: "Then",  text: "compare with the expected output",
      action: { kind: "show-golden" } },
  ]
}
```

Note what is *absent* from `steps`: the `the expected output is "X"` line (lifted
onto `golden`) and the `column "Country" exists in the spec` line (a verification
step, dropped). `Background` steps prepend to every scenario in scope.

## Parsing rules

The parser reads line by line; no third-party Gherkin library is used.

- Lines starting with `#` (after trimming) are comments and are skipped.
- Lines matching `Rule:` are ignored (they create no scope).
- A `@tags` line attaches to the next `Scenario:` that follows it. Each tag
  (including the leading `@`) is recorded on the scenario's `tags` array.
- `Scenario Outline:` blocks and their `Examples:` tables are skipped
  silently — no outline expansion.
- `"""` docstring blocks are skipped (opening and closing `"""`
  delimiters and everything between them).
- `Background:` marks the start of a background block. Its steps collect
  until the next non-step, non-comment line. A `Background:` inside a
  `Rule:` applies to scenarios under that rule only; a top-level
  `Background:` applies to all scenarios.
- `Scenario:` marks the start of a scenario block. Accumulated `@tags` from
  the preceding tag line attach here and are cleared.
- Steps are lines whose first word (after trimming) is `Given`, `When`,
  `Then`, `And`, or `But`.

`parseTours` returns **every** scenario (not just `@tutorial` ones), with its
Background steps prepended. The consumer filters by tag.

## Step classification

Each step is classified into a `TourAction` by matching the step text:

| Pattern | Action |
|---|---|
| `load "X"` | `{ kind: "load-file", filename: "X" }` |
| `load the lookup table "X" with columns "…"` | `{ kind: "load-lookup", filename: "X" }` |
| `query "Y"` | `{ kind: "prefill-chat", text: "Y" }` |
| `the expected output is "X"` | `{ kind: "golden-source", filename: "X" }` |
| `compare with the expected output` | `{ kind: "show-golden" }` |
| anything else | `{ kind: "display" }` |

The keyword (`Given`, `When`, `Then`, `And`, `But`) does not affect
classification — only the step text does.

## What ends up in `steps`

A tour is meant to read load → query → compare, so the parser keeps only the
driver-meaningful steps and discards the rest:

- **`display`** steps (anything unclassified — `Then column "X" exists in the
  spec`, narration, synthetic preconditions) are test machinery, not tour
  stops, and are **dropped** from `steps`.
- **`golden-source`** steps are **lifted** onto the scenario's optional
  `golden` field (the first one wins) and dropped from `steps`, so the driver
  resolves the golden file without scanning step text.

`load-file`, `load-lookup`, `prefill-chat`, and `show-golden` steps are kept,
in order.
