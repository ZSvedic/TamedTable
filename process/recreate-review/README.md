# Recreate review

Ten reports comparing each package in this repo (the original) with the same
package in [TT-recreate](https://github.com/ZSvedic/TT-recreate), where Claude
rebuilt `src/` from `spec/` alone. Each report is a standalone task for one
Claude Code session: read it, get the owner's answers to its questions, run its
plan in this repo.

The recreate passes its own test suite, but it also wrote that suite, so green
proves little. Every finding comes from reading both implementations side by
side. The pattern across all ten: the recreate is smaller but lost robustness
exactly where the spec is silent. Most plans therefore fix the spec, not just
pick code.

| Report | Verdict | One-line reason |
|---|---|---|
| DONE: [bench.md](bench.md) | keep original | recreate drops accurate costing and the perf profiles |
| DONE: [cassette.md](cassette.md) | keep original | recreate's fuzzy matcher breaks the strict-replay rule |
| DONE: [chat-panel.md](chat-panel.md) | keep original | recreate's DOM rewrite can't plug into the web app |
| [cli.md](cli.md) | keep original | recreate loses piped input lines and hangs |
| [core.md](core.md) | keep original | recreate moved the engine into core against the contract |
| [file-io.md](file-io.md) | keep original | recreate breaks on BOM, big numbers, and hides errors |
| [gherkin-tour.md](gherkin-tour.md) | keep original | recreate dropped the Tutorial panel |
| [headless.md](headless.md) | combine | keep original behavior, adopt the recreate's file split |
| [model-config.md](model-config.md) | combine | keep original code, adopt the recreate's test scenarios |
| [table-plan.md](table-plan.md) | keep original | recreate replaced the Zod schema with loose checks |

Every plan follows the [workflow rule](../../CLAUDE.md#workflow-rule--changing-a-component):
spec first, then Gherkin, then code. When a plan documents behavior the code
already has, the new scenario passes right away — that is expected; red-first
applies only to behavior changes.
