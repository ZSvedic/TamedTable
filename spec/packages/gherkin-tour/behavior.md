# Gherkin Tour

`@tamedtable/gherkin-tour` turns a Gherkin `.feature` string into guided tours.
Three layers, used à la carte:

- **`parseTours`** — zero-dependency parser: `.feature` string → `TourScenario[]`.
- **`TourDriver`** — runs a tour's flow (cursor, step execution, terminal stop)
  through a host-supplied `TourAdapter`. Zero-dependency.
- **`TourUi`** (the `./ui` export) — a Driver.js spotlight + popover driven by a
  `TourCursor`. The only entry point that pulls in `driver.js`.

## parseTours

Returns **every** scenario (filtering by tag — `@tour`, `@web` — is the
consumer's job), each with its tags and a tour-ready step list. Given:

```gherkin
Feature: Filter demo
  Background:
    Given load "filter-input.csv"
    And the expected output is "filter-expected.jsonl"

  @web @tour
  Scenario: Filter by Country
    When query "Show only customers in the USA"
    Then column "Country" exists in the spec
    Then compare with the expected output
```

the `Filter by Country` scenario parses to:

```js
{
  name: "Filter by Country",
  tags: ["@web", "@tour"],
  golden: "filter-expected.jsonl",
  steps: [
    { keyword: "Given", text: 'load "filter-input.csv"',
      action: { kind: "load-file", filename: "filter-input.csv" } },
    { keyword: "When",  text: 'query "Show only customers in the USA"',
      action: { kind: "prefill-chat", text: "Show only customers in the USA" } },
  ],
}
```

`Background` steps prepend to every scenario in scope (a `Background` under a
`Rule:` applies only to that rule's scenarios). A scenario also carries an
optional **`feature`** field — the source filename — which `parseTours` does
*not* set (it sees only the string); the consumer stamps it so a deep link can
match by `(feature, name)`.

### Step classification

| Step text | Action `kind` |
|---|---|
| `load "X"` | `load-file` (filename `X`) |
| `load the lookup table "X" with columns "…"` | `load-lookup` (filename `X`) |
| `query "Y"` | `prefill-chat` (text `Y`) |
| `the expected output is "X"` | `golden-source` (filename `X`) |
| `compare with the expected output` | `show-golden` |
| `speak "X"` | `play-audio` (filename `X`) |
| anything else | `display` |

Only the text matters — the keyword (`Given`/`When`/`Then`/`And`/`But`) does not.

### What survives into `steps`

A tour reads **load → query**, so only the executable stops are kept:
`load-file`, `load-lookup`, `prefill-chat`, `play-audio`. Dropped:

- **`display`** (verifications, narration) — test machinery, not a tour stop.
- **`golden-source`** — lifted onto the scenario's `golden` field (first wins).
- **`show-golden`** (`compare with the expected output`) — the trailing
  verification block; it collapses into the driver's terminal stop, which
  surfaces the lifted `golden` after the last real step has run.

Comments (`#`), `Rule:` lines, `Scenario Outline:` + `Examples:`, and `"""`
docstrings are all skipped.

## TourDriver / TourCursor

`TourDriver` runs the flow without knowing any host — no DOM id, no engine, no
cassette; every side effect goes through a `TourAdapter`. The TamedTable app
keeps that logic in its own controller and implements `TourCursor` directly
instead of building a `TourDriver`; the package's `demo.html` uses `TourDriver`.

- **`play(tour)`** arms the tour at step 1 (an empty tour is ignored).
- **`next()`** executes the highlighted step through the adapter, then advances.
  The final `next` runs the last step then lands on the **terminal stop**, where
  the scenario's `golden` (if any) is surfaced via `showGolden` — after the query
  has run, never before.
- **`finish()`** ends the tour and calls the adapter's `onFinish` hook.
- **`cancel()`** abandons it, running nothing further.

There is **no `prev`** — a tour only moves forward, so a step never re-runs (in
the app, stepping back would desync key-free cassette replay). State queries:
`isActive()`, `isDone()` (on the terminal stop), `currentStep()`,
`currentStepElementId()`, `currentStepNumber()` (null on the terminal stop), and
`stepCount()` — which **includes the terminal stop**, so progress reads "N of N"
there.

### TourAdapter

| Method | Called for |
|---|---|
| `loadFile(filename)` | a `load-file` step |
| `loadLookup(filename)` | a `load-lookup` step |
| `prefillChat(text)` | a `prefill-chat` step |
| `playAudio(filename)` | a `play-audio` step |
| `showGolden(goldenFile)` | reaching the terminal stop (the lifted `golden`, or undefined) |
| `elementIdFor(action)` | resolving a spotlight target → DOM id, or null |
| `onFinish()` | `finish` |

The side-effect methods are async — the driver awaits each before advancing, so a
step that issues a model call or plays a clip completes before the next stop.

## TourUi (`./ui`)

`TourUi` drives a Driver.js overlay from a `TourCursor` and **uses Driver.js's
own popover** — its footer button, its "X of Y" progress, its animation, and its
Esc-to-cancel. There is no hand-rolled button row or key-cap badges. What the
package customizes, and why it differs from a plain Driver.js tour:

- **Forward only.** No Previous button, no ← key. The footer holds one button:
  **Next →** on a step, **Done** on the terminal stop. **Space**/**→**/**Enter**
  advance; **Esc** cancels. An accidental overlay click does *not* cancel.
- **Progress, not a title.** The popover shows the step instruction plus Driver's
  progress line "X of Y" — no "Step N of N" heading.
- **Terminal stop.** After the last real step the popover anchors to the
  host-named `doneElementId` (the step's own target may be gone) and shows
  `doneDescription` — the app passes `Voilà, "<tour>" is done.` — numbered "N of
  N", with the Done button.
- **Viewport-sized spotlight.** A target can be larger than the screen — the
  app's table fills it. A cutout that big leaves the popover nowhere to sit,
  and Driver's scroll-into-view yanks the page. When the target's box is
  taller than ~55% of the viewport or wider than it, the spotlight clamps to
  a fixed box over the target's visible top region instead, so the cutout and
  the popover below it always fit on screen together.
- **Instruction text.** The Gherkin keyword is dropped and the first letter
  capitalized. Three steps name their UI action instead of echoing the verb: a
  `load "x.csv"` step reads **`Open sample "x.csv"`** (it drives the host's "Open
  sample…" action, naming the file); a `query "…"` step — whose text is typed
  into the host's chat input when highlighted — reads just **"Type and run the
  query"**; and a `speak "…"` step reads **"Speak and run the query"** (the clip
  plays for the learner).
- **Theming.** `TourUi` ships no color literals. Pass an optional `theme`
  (`background`, `text`, `border`, `accent`) to tint the popover box,
  description, progress, and Next button to the host's palette; omit it to keep
  Driver.js's defaults.
