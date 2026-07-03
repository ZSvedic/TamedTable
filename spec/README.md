# Spec

The human-authored contract for TamedTable: what the system does, the types it exposes, and the scenarios that prove it. Implementation lives in [`src/`](../src/); process docs and history in [`process/`](../process/).

| File | What it covers |
|---|---|
| [rationale.md](rationale.md) | What TamedTable is and why |
| [behavior.md](behavior.md) | What the user sees + what the system does (API-free) |
| [code-contract.md](code-contract.md) | Types, signatures, env vars, exit codes |
| [prompt-app-edit.md](prompt-app-edit.md) | The LLM prompts (imported by the runtime at init) |
| [writing-style.md](writing-style.md) | Writing style for all markdown in the repo |
| [test-tree.md](test-tree.md) | Hand-reviewed map of every feature + scenario (what each tests + cleanup ideas), across test-cases and packages |
| [packages/](packages/README.md) | Per-package specs — layout rules in its README |
| [test-cases/](test-cases/) | Gherkin features + fixtures, named as below |

The structural rule: library packages (self-contained, demo-able) get per-package specs under [packages/](packages/README.md); app surfaces (`cli`, `headless`, `web`) share [behavior.md](behavior.md) + [test-cases/](test-cases/) because one scenario must prove all three surfaces.

## Test-case fixtures and naming

App-behavior scenarios in [test-cases/](test-cases/) test the TamedTable app through its surfaces (CLI, headless, web). Files per use case:

- `<usecase>-input.<ext>` — source fixture (committed)
- `<usecase>-expected.<ext>` — golden output (committed)
- `<usecase>-output.<ext>` — runtime-generated (gitignored)
- `<usecase>.flow` — saved flow
- `<usecase>.feature` — Gherkin scenarios

App-behavior step defs live in `src/tests/` and share the app harness (`world.ts`); library-package step defs live in the package itself — see [packages/README.md](packages/README.md).

Edits by the AI to `*-expected.jsonl` golden files are spec changes — review them, don't treat them as routine fixture churn.

## Regression scenarios

A scenario written to lock a fixed bug is a behavior specification like any other, so it lives **with the behavior it describes** — in `test-cases/` (or a package spec), in the feature file for that capability, never in a separate `bug-cases/` tree. A `bug-cases/` split would duplicate the taxonomy, scatter one behavior's spec across two homes, and rot the moment "bug" and "feature" blur. Provenance is metadata, not structure: tag the scenario `@regression` (alongside its execution tags like `@headless`/`@web`) and reference the issue/PR in a comment above it. The tag is filterable (`--tags @regression`) as the count grows; the layout stays organized by capability. A bug that fits no existing feature gets its own capability feature — e.g. [test-cases/model-resilience.feature](test-cases/model-resilience.feature) collects the runner's tolerance of imperfect model output.
