# Prompt — Tutorial deep-link via URL parameters

Implement URL parameters that open the web app straight into a named tutorial and play it, so a link can point at one exact demonstration. This prompt owns the deep-link feature and the marketing-link update; it does not change any transformation behavior or add new tutorial content.

Read [CLAUDE.md](../../CLAUDE.md) first and follow its outside-in workflow (spec → Gherkin → step defs → implementation → green → PR). The relevant tag is `#TutorialMode`.

## What to build

On load, the web app reads two query parameters and, when both resolve to a real tour, opens the Tutorial panel, selects that tour, and plays it from step 1:

```
https://zsvedic.github.io/TamedTable/?feature=filter.feature&scenario=Filter+by+Country
```

- `feature` — the Gherkin file name the scenario lives in (e.g. `filter.feature`).
- `scenario` — the scenario name, URL-encoded.

Both together identify one tour. The file disambiguates when two files share a scenario name; matching on name alone is not enough.

Behavior rules:

- Both params present and matched → open panel, select, autoplay from step 1.
- Param missing, unknown file, or unknown scenario → app boots normally, panel closed, no error toast. A deep link must never crash or block a normal visit.
- The deep link only plays steps the tour engine already supports (`load-file`, `load-lookup`, `prefill-chat`, `show-golden`). Do not invent new step kinds.

## Where the pieces are

- `src/packages/web/src/main.tsx` — app boot. Tours are flattened here from `__TT_TUTORIAL__.features` (a `filename → source` map), which is where the source filename is currently **lost**. Capture it here.
- `src/packages/web/src/controller-tutorial.ts` — `TutorialManager`: `openTutorial()`, `selectTutorialScenario(name)`, `playTutorial()`. Selection is by name only today.
- `src/packages/gherkin-tour` — `parseTours(source)` returns `TourScenario[]`. It only sees the source string, so it cannot know the filename; add an optional `feature?: string` to `TourScenario` and populate it where tours are assembled (main.tsx for the browser, the test harness for tests). Update `spec/code-contract.md` and `spec/packages/gherkin-tour/` to match.
- The deployed base is `/TamedTable/` (`src/packages/web/vite.config.ts`), so production links are `https://zsvedic.github.io/TamedTable/?feature=…&scenario=…`.

## Suggested shape

Add one tutorial-controller method that does the whole deep-link in one call — open, select by `(feature, scenario)`, play — and returns whether it matched, e.g. `async openTutorialFromLink(feature, scenario): Promise<boolean>`. Call it from `main.tsx` after the controller is created, reading `new URLSearchParams(window.location.search)`. Keep the URL-reading in `main.tsx` (app build data lives there, same as `OpenUrlDialog.tsx`), not inside the controller.

## Tests

Follow the workflow order. Add a `Rule` to `spec/test-cases/tutorial.feature` for deep-linking, with scenarios covering: a valid `feature`+`scenario` autoplays from step 1; an unknown scenario leaves the panel closed; a missing param leaves the panel closed. Write the step defs, watch them go red, then implement until `cd src && bun run test` is green. Run `bun run typecheck` too.

## Update the marketing links (do this in the same PR)

`marketing/marketing.md` has a feature table whose **See it** column links to `.feature` files. Repoint each row to a live deep link **when that row's capability maps to a playable web scenario** — pick the single scenario that best demonstrates it (prefer a `@tutorial` scenario if the file has one). Use the production URL form above, with the scenario name URL-encoded.

Where a row's capability has no web-playable scenario (CLI-only behavior such as `:undo`/`:save` in `repl-commands.feature`, or `save-py.feature`), leave the existing `.feature` file link. Do not author new tutorial scenarios or fixtures — that is out of scope for this PR.

When green, open a PR. Do not merge it.
