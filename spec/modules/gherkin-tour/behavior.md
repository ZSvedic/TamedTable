# Gherkin Tour parser

The `@tamedtable/gherkin-tour` package reads a Gherkin `.feature` string and
returns the scenarios tagged `@tutorial`, each with their steps classified
into typed actions a tutorial driver can execute. It has no dependencies and
runs in any JavaScript environment — browser, Node, Bun, or a headless test.

## Worked example

Given this `.feature` fragment:

```gherkin
Feature: Filter demo

  Background:
    Given "filter-input.csv" is loaded

  Scenario: Untagged — skipped
    When user requests "something"

  @tutorial
  Scenario: Filter by Country
    Given "filter-input.csv" is loaded
    When user requests "Show only customers in the USA"
    Then the table matches the golden output
```

`parseTours` returns one `TourScenario`:

```js
[{
  name: "Filter by Country",
  steps: [
    { keyword: "Given", text: '"filter-input.csv" is loaded',
      action: { kind: "load-file", filename: "filter-input.csv" } },
    { keyword: "When",  text: 'user requests "Show only customers in the USA"',
      action: { kind: "prefill-chat", text: "Show only customers in the USA" } },
    { keyword: "Then",  text: "the table matches the golden output",
      action: { kind: "show-golden" } },
  ]
}]
```

`Background` steps prepend to every scenario in scope — including `@tutorial`
ones.

## Parsing rules

The parser reads line by line; no third-party Gherkin library is used.

- Lines starting with `#` (after trimming) are comments and are skipped.
- Lines matching `Rule:` are ignored (they create no scope).
- A `@tags` line attaches to the next `Scenario:` that follows it.
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

`parseTours` returns only scenarios whose tag list includes `@tutorial`.
Background steps (in scope for that scenario) prepend to the scenario's own
steps.

## Step classification

Each step is classified into a `TourAction` by matching the step text:

| Pattern | Action |
|---|---|
| `Given "X" is loaded` | `{ kind: "load-file", filename: "X" }` |
| `When user requests "Y"` | `{ kind: "prefill-chat", text: "Y" }` |
| `Then the table matches the golden output` | `{ kind: "show-golden" }` |
| anything else | `{ kind: "display" }` |

The keyword (`Given`, `When`, `Then`, `And`, `But`) does not affect
classification — only the step text does.
