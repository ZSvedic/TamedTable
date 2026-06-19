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

A `TourScenario` also carries an optional `feature` field — the source file name
the scenario came from. `parseTours` does **not** set it (it sees only the
source string); the consumer that assembles tours stamps each scenario with its
filename, so a deep link can identify one tour by `(feature, name)` even when two
files share a scenario name. The web app's tutorial panel ships only a manifest
of scenario names + tags and calls `parseTours` lazily — once, when a tour is
opened — on the feature file it fetches same-origin, so the parser need not run
at page load.

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
| `play audio "X"` | `{ kind: "play-audio", filename: "X" }` |
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

`load-file`, `load-lookup`, `prefill-chat`, `show-golden`, and `play-audio`
steps are kept, in order.

## Tour driver

`parseTours` answers *what the steps are*; `TourDriver` runs *the flow* — the
cursor, executing each step, the done state, and the finish hook — without
knowing anything about a host. It holds no DOM id, no engine, no cassette: every
side effect goes through a host-supplied `TourAdapter` (below). It is what the
package's standalone demo runs; the app implements the same cursor contract
itself (see Tour UI) rather than building a `TourDriver`.

A driver is constructed with an adapter, then armed with a tour:

- **`play(tour)`** arms the tour and highlights step 1; an empty tour is ignored.
- **`next()`** executes the highlighted step through the adapter, then advances.
  The final `next` (on the last step) enters the **done** state — the cursor sits
  one past the last step, no step is highlighted, and the tour awaits `finish`.
- **`prev()`** steps the cursor back one stop; a no-op at the first step or once
  done.
- **`cancel()`** abandons the tour, running nothing further.
- **`finish()`** ends the tour and calls the adapter's `onFinish` hook (the app
  opens its Tutorial panel there; the demo shows a status line).

State queries: **`isActive()`** (a step is highlighted), **`isDone()`** (all
steps ran, awaiting finish), **`currentStep()`** (the highlighted `TourStep`, or
null when not active), **`currentStepElementId()`** (the adapter's element id for
the current step), **`currentStepNumber()`** (1-based, or null), and
**`stepCount()`**.

## Tour adapter

A host that uses `TourDriver` implements `TourAdapter` to bind the driver's typed
actions to concrete side effects and DOM ids — that is where the demo's trivial
page handlers live. (TamedTable's app keeps the equivalent logic — engine,
cassette replay, golden rows, navigation — in its tutorial controller, which
plays the driver's role itself.) The driver calls:

| Method | When | Argument |
|---|---|---|
| `loadFile(filename)` | a `load-file` step | the file to load |
| `loadLookup(filename)` | a `load-lookup` step | the lookup file |
| `prefillChat(text)` | a `prefill-chat` step | the query text |
| `showGolden(goldenFile)` | a `show-golden` step | the scenario's lifted `golden`, or undefined |
| `playAudio(filename)` | a `play-audio` step | the clip to play |
| `elementIdFor(action)` | resolving a spotlight target | the current step's action → DOM id, or null |
| `onFinish()` | `finish` | — |

The `load`/`prefill`/`show`/`play` methods are async — the driver awaits each
before advancing, so a step that issues a model call (in the app) or plays a
clip (in the demo) completes before the next step highlights.

## Tour UI (`./ui`)

`TourUi` (the `@tamedtable/gherkin-tour/ui` export) is the only entry point that
depends on `driver.js`; importing the package's root pulls neither `driver.js`
nor any styling. It drives a Driver.js spotlight + popover from a `TourCursor`:
`start()` attaches the keyboard and renders the first spotlight; `render()`
re-syncs after each transition; the spotlight target for each step comes from the
cursor's `currentStepElementId()`, and the completion popover anchors to the
host-named `doneElementId`.

A `TourCursor` is the read/navigate surface `TourUi` needs — `isActive`,
`isDone`, `currentStep`, `currentStepElementId`, `currentStepNumber`,
`stepCount`, `next`, `prev`, `finish`, `cancel`. `TourDriver` implements it, so
the package's `demo.html` wires a trivial page-only adapter through
`parseTours → TourDriver → ./ui` to tour itself. The TamedTable app does **not**
build a `TourDriver`: its tutorial controller already owns the cursor, the engine,
and cassette replay, so it implements `TourCursor` directly and hands itself to
`TourUi` — the same popover/footer/keyboard, driven by the app's own state.

### Theming

`TourUi` ships no colors of its own. By default the popover keeps Driver.js's
styling and the footer's borders and text inherit `currentColor`, so it reads on
any background. A host that wants the popover to match its own theme passes an
optional `theme` to `TourUi` — `background`, `text`, `border`, and `accent`
color strings, applied to the popover box, title, description, footer buttons,
and badges. The colors are supplied by the host (the app passes its ui-kit
tokens); the package source stays free of color literals.

### Step instruction text

The popover description is the step text rendered as an imperative — the Gherkin
keyword (`Given`/`When`/`Then`) is dropped and the first letter capitalized
(`load "x.csv"` → `Load "x.csv"`). One step is special: a **`query "…"`** step's
text is prefilled into the host's chat input when the step is highlighted, so its
popover shows just **"Run the query"** rather than repeating the query string.

### Terminal last step (`lastStepDescription`)

By default the final `next` enters the driver's **done** state — a separate
completion popover anchored to `doneElementId`. A host can instead make the final
step itself terminal by passing **`lastStepDescription`**: the last step keeps
its **"Step N of N"** title but shows that text in place of the step instruction,
**Next is disabled**, and **Finish** ends the tour from there — no separate done
screen. The app uses this for its `Voilà, "<tour>" is done.` celebration. Omit
the option to keep the default step → … → done flow (the package's demo does).

### Popover footer

`TourUi` replaces Driver.js's default button row with its own footer holding
three buttons:

- **Previous** and **Next** grouped on the left, **Finish** on the right.
- Each button shows a key-cap badge of its keyboard shortcut before the label:
  **← Previous**, **→ Next**, **↵ Finish**.
- **Previous** is disabled on the first step (and in the done state), but stays
  live on a terminal last step so the user can step back.
- **Next** is disabled in the done state and on a terminal last step.

Keyboard shortcuts mirror the buttons: **←** goes back, **→** or **Space**
advances (a no-op on a terminal last step), **Enter** finishes, **Esc** cancels.
The badges and labels carry no hard-coded colors — borders and text inherit the
popover's `currentColor`, so the footer reads correctly against the host's theme.
