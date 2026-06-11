# Web app package split — phase 1 plan

**Date:** 2026-06-11

This doc owns the plan for breaking the web app (~4,700 lines) into library packages, following the `model-config` / `gherkin-tour` pattern. It does not change any behavior — every step is a pure refactor plus new package specs.

## Why these seams

The components are already separate files; the coupling is that each one takes the whole `WebController` as a prop and reaches into it freely (ChatSidebar touches it 13 times, TutorialPanel 24). The real work is inverting that: each package becomes a generic component — props in, callbacks out — per [spec/packages/README.md](../../spec/packages/README.md). `controller.ts` (1,022 lines) shrinks as each extraction takes its state along. Python and `.flow` generation already live in `headless`/`cli`, so no new package is needed there.

## Package map

| Package | Takes from `src/packages/web/src/` | ~lines | Depends on |
|---|---|---|---|
| `ui-kit` | `components/Button, Icons, Toasts, SplitButton`, theme tokens from `lib/theme.ts` | 430 | react (peer) |
| `file-io` | `lib/browser-fs.ts`, `lib/ports.ts`, `controller-format.ts`, URL-load helpers from controller | 300 | core |
| `table-view` | `components/TableView, Pagination`, `lib/pagination.ts`, page state from controller | 600 | ui-kit |
| `chat-panel` | `components/ChatSidebar, MicButton`, `controller-messages.ts` | 600 | ui-kit |
| `voice-input` | `lib/voice.ts`, `lib/browser-voice.ts` (VoicePort, prompt building, MediaRecorder) | 100 | — |
| `toolbar` | `components/Toolbar, OpenUrlDialog, Brand` | 630 | ui-kit |
| `tutorial-panel` | `components/TutorialPanel`, tutorial state methods from controller | 600 | gherkin-tour, ui-kit |

`voice-input` is small; fold it into `chat-panel` if a separate demo feels like overhead.

What stays in `web` (the app shell, ~1,200 lines): `App.tsx`, `main.tsx`, hooks, shims, `SettingsPanel` (thin wiring around model-config's `ModelChooser`), and a slimmed controller that only wires the headless engine, owns the undo/redo journal, and translates gestures into spec patches.

Dependency direction is strictly downward — app shell → UI packages → ui-kit, and app shell → file-io → core. No package imports the app or another sibling.

## Extraction loop

One package per pass, app stays green throughout — no big-bang reassembly at the end:

1. Write `spec/packages/<name>/` — README, behavior.md, Gherkin feature.
2. Build `src/packages/<name>/` — code, step defs, `demo.html`.
3. User tests the demo by hand and approves.
4. Rewire the app to import the package; delete the moved code from `web`.
5. `cd src && bun run test` green, then PR.

## Order

Ordered easiest-first so the pattern is proven cheap before the big pieces move:

1. `file-io` — no React, pure logic behind ports; load/save bugs localize here immediately.
2. `ui-kit` — the primitives every later package needs.
3. `table-view` — biggest user-facing piece; pagination logic already has unit tests.
4. `chat-panel` + `voice-input`.
5. `toolbar`.
6. `tutorial-panel` — also moves ~150 lines of tutorial state out of the controller.
7. Controller slim-down — with consumers gone, split what remains; consider moving the undo/redo journal into `headless` since nothing in it touches the DOM.

## What this buys

A bug report names a visible thing (table, chat, toolbar); each visible thing now maps to one directory with its own spec, tests, and demo. Fixes touch one package, so agent sessions read less context. The caveat stands: bugs in controller-engine interaction still need cross-package context, which is why step 7 matters most.
