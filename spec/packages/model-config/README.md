# model-config

Provider detection from a pasted key, the key/model catalogue, config resolution (`ALL_MODELS`, `resolveConfig`), the live key probe (`probe.ts`), and the `ModelChooser` React component.

| What | Where |
|---|---|
| Behavior spec | [behavior.md](behavior.md) |
| Gherkin scenarios | [model-config.feature](model-config.feature) |
| Code, step defs, demo | [../../../src/packages/model-config/](../../../src/packages/model-config/) |
| Live demo | https://www.tamedtable.com/demos/model-config/demo.html |

The demo mounts the real `ModelChooser` over local React state, shows the
`resolveConfig` result live, persists config to the same localStorage blob as
the main app, and includes a test-call harness for issuing real model calls —
see [behavior.md § Demo page](behavior.md#demo-page). Its chooser connects
against a **stub** provider, so any key with a recognised prefix works and no
real account is billed; the test-call box below is the live one. The Node-only
`env.ts` entry point is intentionally excluded from the browser demo.
