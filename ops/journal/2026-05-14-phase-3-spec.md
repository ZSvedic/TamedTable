# Phase 3 — Spec documents

> Frozen planning record. The four per-surface docs produced by this phase
> (`core.md`, `runner.md`, `headless.md`, `cli.md`) and the wire-model doc
> (`data-model.md`) were consolidated in phase 5 into
> [spec/behavior.md](../../spec/behavior.md) and
> [spec/code-contract.md](../../spec/code-contract.md). Path references in
> this doc point to files that no longer exist; the planning narrative is
> preserved for the record.

Goal: write V1 specification documents under [spec/](../../spec/). No code in this phase — phase 4 implements against these specs. The symbols phase 2 surfaced (types, I/O, runner factories) get described as semantics, not as TypeScript signatures.

Prerequisites: Q1–Q15 in [phase-1-pre-spec.md](phase-1-pre-spec.md), the wire model in [data-model.md](../../spec/data-model.md), the step-def usage in [test-cases/step-defs/](../../src/tests/) as the API-surface inventory, and [writing-style.md](../writing-style.md) as the voice and structure guide. [spec.md](../../spec/spec.md) is the index that will link to the four sub-docs once written.

## Backlog

1. **`spec/core.md`** — types (`Spec`, `Row`, `Transformation`, `Expr` — V1 subset) and I/O (`loadCsv`, `readJsonl`, `writeJsonl`): semantics, validation rules (Zod, per Q9), edge cases, errors. Lifts from [data-model.md](../../spec/data-model.md) and narrows to V1.

2. **`spec/runner.md`** — the `Runner` contract: lifecycle (load → request → export), state model, error and cancellation semantics. Promotes the sketch in [world.ts](../../src/tests/world.ts) to authoritative form.

3. **`spec/headless.md`** — `createHeadlessRunner`: harness components per Q11, system-prompt structure per Q14, chunk/cancel semantics per Q10, error-recovery loop per Q9.

4. **`spec/cli.md`** — `createCliRunner` (REPL per Q1) and `runCli` (the `tamedtable execute <flow>` subcommand per Q7/Q15). Includes `.flow` file format and exit codes.

## Definition of done
- Every symbol referenced in [test-cases/step-defs/](../../src/tests/) has a defining section in one of the four sub-docs.
- Each doc follows [writing-style.md](../writing-style.md): declarative voice, two-sentence opener stating ownership and delegation, prose over bullets, one worked example per surface, 40–80 lines.
- Cross-references to [data-model.md](../../spec/data-model.md) and [phase-1-pre-spec.md](phase-1-pre-spec.md) Q-answers where applicable; no duplication, no contradictions.
- No changes to [packages/](../../src/packages/) or [test-cases/](../../spec/test-cases/) — those are phase 4.
