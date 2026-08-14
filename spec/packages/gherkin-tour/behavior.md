# Gherkin Tour

`@tamedtable/gherkin-tour` turns a Gherkin `.feature` string into guided tours.
Three layers, used à la carte:

- **`parseTours`**: zero-dependency parser: `.feature` string → `TourScenario[]`.
- **`TourDriver`**: runs a tour's flow (cursor, step execution, terminal stop)
  through a host-supplied `TourAdapter`. Zero-dependency.
- **`TourUi`** (the `./ui` export): a Driver.js spotlight + popover driven by a
  `TourCursor`. The only entry point that pulls in `driver.js`.

## parseTours

Returns **every** scenario (filtering by tag (`@tour`, `@web`) is the
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
optional **`feature`** field, the source filename, which `parseTours` does
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
| `load the shuffled sample` | `load-shuffled` |
| `open the run-on-all estimate dialog` | `open-estimate` |
| `decline the estimate with "Not yet"` | `decline-estimate` |
| anything else | `display` |

The three lazy-execution stops (#LazyExec) drive the Lazy AI execution tour:
`load-shuffled` resolves the host's large-file dialog with the shuffled
sample, `open-estimate` opens the run-on-all estimate dialog (shown, not
executed), and `decline-estimate` closes it with the "Not yet" choice:
nothing runs, no model call. All three classify in both voices: the tours'
imperative `load …` / `open …` / `decline …` and the functional tests'
narrative `user loads …` / `user opens …` / `user declines …`. The three
adapter methods are optional: a host without the lazy UI treats the stops
as narration.

Only the text matters: the keyword (`Given`/`When`/`Then`/`And`/`But`) does not.

### What survives into `steps`

A tour reads **load → query**, so only the executable stops are kept:
`load-file`, `load-lookup`, `prefill-chat`, `play-audio`, `load-shuffled`,
`open-estimate`, `decline-estimate`. Dropped:

- **`display`** (verifications, narration), test machinery, not a tour stop.
- **`golden-source`**: lifted onto the scenario's `golden` field (first wins).
- **`show-golden`** (`compare with the expected output`), the trailing
  verification block; it collapses into the driver's terminal stop, which
  surfaces the lifted `golden` after the last real step has run.

Comments (`#`), `Rule:` lines, `Scenario Outline:` + `Examples:`, and `"""`
docstrings are all skipped.

## TourDriver / TourCursor

`TourDriver` runs the flow without knowing any host, no DOM id, no engine, no
cassette; every side effect goes through a `TourAdapter`. The TamedTable app
keeps that logic in its own controller and implements `TourCursor` directly
instead of building a `TourDriver`; the package's `demo.html` uses `TourDriver`.

- **`play(tour)`** arms the tour at step 1 (an empty tour is ignored).
- **`next()`** executes the highlighted step through the adapter, then advances.
  The final `next` runs the last step then lands on the **terminal stop**, where
  the scenario's `golden` (if any) is surfaced via `showGolden`, after the query
  has run, never before.
- **`finish()`** ends the tour and calls the adapter's `onFinish` hook.
- **`stay()`** ends the tour and calls the adapter's optional `onStay` hook:
  the "keep what the tour built on screen" exit, distinct from `onFinish`'s
  "return to the chooser".
- **`cancel()`** abandons it, running nothing further.

There is **no `prev`**: a tour only moves forward, so a step never re-runs (in
the app, stepping back would desync key-free cassette replay). State queries:
`isActive()`, `isDone()` (on the terminal stop), `currentStep()`,
`currentStepElementId()`, `currentStepNumber()` (null on the terminal stop), and
`stepCount()`, which **includes the terminal stop**, so progress reads "N of N"
there.

### TourAdapter

| Method | Called for |
|---|---|
| `loadFile(filename)` | a `load-file` step |
| `loadLookup(filename)` | a `load-lookup` step |
| `prefillChat(text)` | a `prefill-chat` step |
| `playAudio(filename)` | a `play-audio` step |
| `loadShuffled?()` | a `load-shuffled` step (optional: narration when absent) |
| `openEstimate?()` | an `open-estimate` step (optional: narration when absent) |
| `declineEstimate?()` | a `decline-estimate` step (optional: narration when absent) |
| `showGolden(goldenFile)` | reaching the terminal stop (the lifted `golden`, or undefined) |
| `elementIdFor(action)` | resolving a spotlight target → DOM id, or null |
| `onFinish()` | `finish` |
| `onStay?()` | `stay` (optional: for hosts that offer a "stay" exit at the terminal stop) |

The side-effect methods are async: the driver awaits each before advancing, so a
step that issues a model call or plays a clip completes before the next stop.

## TourUi (`./ui`)

`TourUi` drives a Driver.js overlay from a `TourCursor` and **uses Driver.js's
own popover**: its footer button, its "X of Y" progress, its animation, and its
Esc-to-cancel. There is no hand-rolled button row or key-cap badges. What the
package customizes, and why it differs from a plain Driver.js tour:

- **Forward only.** No Previous button, no ← key. On a step the footer holds
  one button: **Next →**. **Space**/**→**/**Enter** advance; **Esc** cancels.
  An accidental overlay click does *not* cancel.
- **Watch-only.** The spotlighted element is not clickable
  (`disableActiveInteraction: true` in the Driver.js config): the tour is a
  guided replay the visitor watches, and Next/Esc are the only controls. The
  narration reads as "watch this happen", so no extra "don't interact" hint is
  added anywhere.
- **Scrollable anyway.** Watch-only blocks clicks, not scrolling: while the
  overlay is up, `TourUi` forwards wheel and touch scrolls to the innermost
  scrollable element under the pointer: spotlighted or dimmed (Driver.js's
  `pointer-events: none` would otherwise swallow both), so the visitor can
  pan a wide table mid-tour. Scrolls over the popover are left to the
  popover; forwarding never advances or cancels the tour.
- **Progress, not a title.** The popover shows the step instruction plus Driver's
  progress line "X of Y", no "Step N of N" heading.
- **Terminal stop.** After the last real step the popover anchors to the
  host-named `doneElementId` (the step's own target may be gone) and shows
  `doneDescription` (the app passes `Voilà, the tour "<tour>" is done.`) numbered "N of
  N". The primary button reads `doneBtnText` (default **Done**) and calls
  `finish`. When the cursor implements the optional `stay()`, a secondary
  button reading `stayBtnText` (default **Stay here**) appears in Driver's
  previous-button slot and calls `stay`; **Esc** on the terminal stop then
  stays instead of cancelling. Without `stay()` the terminal stop keeps the
  single button and Esc-cancels, as before.
- **Viewport-sized spotlight.** A target can be larger than the screen: the
  app's table fills it. A cutout that big leaves the popover nowhere to sit,
  and Driver's scroll-into-view yanks the page. When the target's box is
  taller than ~55% of the viewport or wider than it, the spotlight clamps to
  a fixed box over the target's visible top region instead, so the cutout and
  the popover below it always fit on screen together.
- **Instruction text.** The Gherkin keyword is dropped and the popover
  narrates progressively: the tour is watch-only, so each stop reads as
  "watch this happen", not as an instruction to act:

  | Step | Popover text |
  |---|---|
  | `load "X"` | `Opening the sample "X"…` |
  | `query "…"` | `Typing and running the query…` |
  | `speak "…"` | `Speaking and running the voice query…` |
  | `load the shuffled sample` | `Loading the shuffled sample…` |
  | `open the run-on-all estimate dialog` | `Opening the run-on-all estimate…` |
  | `decline the estimate with "Not yet"` | `The "Run on all rows?" dialog estimates the time and cost of cleaning the remaining 24,900 rows. Choosing "Not yet" because it would take some time.` |
  | anything else | echoed with the first letter capitalized, `…` appended |

  A `query "…"` step's text is typed into the host's chat input when the step
  is highlighted, so the popover doesn't repeat it; a `speak "…"` step's clip
  plays for the learner. The decline stop's row count is the lazy showcase's
  fixture math (`showcase-lazy-input.csv`: 25,000 rows − the 100-row evaluated
  page = 24,900 remaining).
- **Theming.** `TourUi` ships no color literals. Pass an optional `theme`
  (`background`, `text`, `border`, `accent`) to tint the popover box,
  description, progress, and Next button to the host's palette; omit it to keep
  Driver.js's defaults.
