# model-config

Provider/key/model catalogue and config resolution (`ALL_MODELS`, `resolveConfig`).

| What | Where |
|---|---|
| Behavior spec | [behavior.md](behavior.md) |
| Gherkin scenarios | [model-config.feature](model-config.feature) |
| Implementation | [../../../src/packages/model-config/](../../../src/packages/model-config/) |
| Step definitions | [../../../src/tests/model-config.steps.ts](../../../src/tests/model-config.steps.ts) |
| Live demo | https://zsvedic.github.io/TamedTable/demos/model-config/demo.html |

The demo (`src/packages/model-config/demo.html`) exercises the public API by
hand — run it locally with `bun run demo` from the package dir, or use the
deployed link above. The Node-only `env.ts` entry point is intentionally
excluded from the browser demo.
