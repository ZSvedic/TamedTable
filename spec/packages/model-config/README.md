# model-config

Provider/key/model catalogue, config resolution (`ALL_MODELS`, `resolveConfig`), and the `ModelChooser` React component.

| What | Where |
|---|---|
| Behavior spec | [behavior.md](behavior.md) |
| Gherkin scenarios | [model-config.feature](model-config.feature) |
| Code, step defs, demo | [../../../src/packages/model-config/](../../../src/packages/model-config/) |
| Live demo | https://zsvedic.github.io/TamedTable/demos/model-config/demo.html |

The demo mounts the real `ModelChooser` over local React state, shows the
`resolveConfig` result live, persists config to the same localStorage blob as
the main app, and includes a test-call harness for issuing real model calls —
see [behavior.md § Demo page](behavior.md#demo-page). The Node-only `env.ts`
entry point is intentionally excluded from the browser demo.
