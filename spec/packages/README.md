# Package specs

Each subdirectory here specs one library package — a self-contained, browser-safe package with its own public API — and mirrors its implementation in [`src/packages/<name>/`](../../src/packages/). App-level behavior lives in [behavior.md](../behavior.md) and [test-cases/](../test-cases/), not here. The structural rule: only library packages get per-package specs; app surfaces (`cli`, `headless`, `web`) share the app-level spec because one scenario must prove all three surfaces.

## What each package directory holds

- `README.md` — link table: spec, scenarios, code, live demo
- `behavior.md` — what the package does and its worked example
- `<name>.feature` — Gherkin scenarios (`@headless` for pure-API scenarios, `@web` for scenarios driven through the demo page in a browser)
- `<name>-input.*` / `<name>-expected.*` — fixtures if needed

`cucumber.js` routes feature names in `PACKAGE_FEATURES` to `spec/packages/<name>/<name>.feature`; all others to `spec/test-cases/`.

There is no per-package `code-contract.md`: a library's public API *is* its observable behavior, so signatures and behavior live together in `behavior.md` — the behavior/contract split is app-level only, where the two serve different readers.

## Step defs follow ownership

Library-package step defs live in the package itself (`src/packages/<name>/*.steps.ts`) and never import the app harness — only `@cucumber/cucumber` plus, for `@web` scenarios that drive the package demo page, `playwright`. The `packages/**/*.steps.ts` import glob in `cucumber.js` picks them up, so each package's code, steps, and demo sit in one directory. Each package's `README.md` here links across to that directory; GitHub renders the relative paths as clickable navigation. (App-behavior step defs live in `src/tests/` instead — see [../README.md](../README.md).)

## Package UI components

When a library package ships a UI piece, it is a generic React component: props in, callbacks out, no app state, no storage, no imports from the app. `react` is a peer dependency on a separate entry point so the package's main entry stays React-free. Styling comes only from namespaced CSS custom properties (`--mc-*` in model-config) — every variable has a default that looks presentable standalone, and the host app injects its theme by setting the variables on a wrapping element. Theme tokens and app components never leak into the package. The one exception is `ui-kit`: it *is* the token source — its components read its own exported theme objects through `useTheme()`, and the host sets other packages' CSS variables from those tokens.

## Demos

Each library package ships a `demo.html` — a standalone page that exercises the public API by hand, no app shell required. Run it locally with `bun run demo` from the package dir. The deploy workflow bundles each demo into the Pages artifact under `demos/<name>/`, so each package README also links the live URL (`https://zsvedic.github.io/TamedTable/demos/<name>/demo.html`).
