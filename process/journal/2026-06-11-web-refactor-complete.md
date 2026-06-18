# Web app package split — complete

**Date:** 2026-06-11

The phase-1 plan in [2026-06-11-web-refactor-plan.md](2026-06-11-web-refactor-plan.md) is done. The ~4,700-line web app is now a thin shell over library packages, and the last monolith — `controller.ts` — is a composition shell over domain managers. Every change was a pure refactor plus new package specs; no behavior moved.

## What shipped

Six library packages came out of `src/packages/web/src/`, each with its own spec, Gherkin, step defs, and standalone demo:

| Package | Owns | PR |
|---|---|---|
| `file-io` | browser file dialogs, format detection, URL fetch, `.flow` serialization | merged |
| `ui-kit` | brand tokens + `Button`/`Icon`/`SplitButton`/`Toasts`/`ThemeProvider` | merged |
| `table-view` | paged grid (selection, inline edit, column drag) + pagination model | merged |
| `chat-panel` | chat sidebar, request detail, `MicButton` | merged |
| `voice-input` | `VoicePort`, MediaRecorder→WAV, `buildVoicePrompt` | merged |
| `toolbar` | top bar (brand, readout, actions) + Open-from-URL dialog | #98 |

`tutorial-panel` was *not* split into its own package: `TutorialPanel.tsx` stays an app component, but its controller state moved into a `controller-tutorial.ts` module in the slim-down below — cheaper than a package boundary for one app-only panel.

## Controller slim-down (#99)

`controller.ts` dropped from **1,022 → 328 lines**, keeping its public surface byte-for-byte (the Cucumber web profile drives it with no DOM). It now owns the observable fields plus the notification hub and delegates to managers that share a `ControllerHost` seam:

```
controller.ts (328)        composition shell — fields + hub + delegations
├── controller-engine.ts   (201)  headless wiring, request, streaming overlay
├── controller-tutorial.ts (177)  tour/step cursors + per-step effects
├── controller-voice.ts    (143)  press-and-hold mic state machine
├── controller-files.ts    (128)  open/save/URL handlers
├── controller-patch.ts    (117)  undo/redo + cell-edit/reorder patches
├── controller-config.ts   (94)   settings/config + engine rebuild
└── controller-context.ts  (68)   the ControllerHost interface
```

The undo/redo journal was surface-agnostic — whole-`Spec` snapshots, no DOM — so it moved into `@tamedtable/headless` as `SpecJournal`, with its own unit tests.

## What a bug report buys now

Every visible thing (table, chat, toolbar) maps to one package with its own spec, tests, and demo, and every controller responsibility maps to one ~100–200 line module. A fix touches one file; an agent session reads less. The standing caveat: a bug in how the controller drives the engine still spans `controller-engine.ts` and `headless`, which is why that seam got the most attention.
