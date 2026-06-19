# gherkin-tour

Parses Gherkin feature files into guided tour scenarios (`parseTours`), runs the
tour flow host-agnostically (`TourDriver` + `TourAdapter`), and renders a
Driver.js spotlight UI (`./ui` — the only `driver.js`-dependent export). The
demo page tours itself through this pipeline.

| What | Where |
|---|---|
| Behavior spec | [behavior.md](behavior.md) |
| Gherkin scenarios | [gherkin-tour.feature](gherkin-tour.feature) |
| Code, step defs, demo | [../../../src/packages/gherkin-tour/](../../../src/packages/gherkin-tour/) |
| Live demo | https://zsvedic.github.io/TamedTable/demos/gherkin-tour/demo.html |
