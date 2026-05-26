Read all documents in the project dir, especially [conventions.md](../conventions.md) for conventions and [phase-1-pre-spec.md](../journal/2026-05-14-phase-1-pre-spec.md) for the Q1–Q15 decisions that constrain this phase.

Then execute the backlog in [phase-2-tests.md](../journal/2026-05-14-phase-2-tests.md) to bring V1 Gherkin scenarios to the TDD red phase.

Process:
- Execute backlog items in order (test runner → scaffolding → fixtures → step defs → red verification).
- After each item, briefly summarize what was done and ask before continuing to the next.
- Don't implement actual logic — phase 2 is about *failing tests* (red phase), not green.
- Let TypeScript surface missing exports as input for phase-3 spec — don't pre-design the API.
- For new dependencies, verify they exist and their footprint via `bun pm` or a clean test install.
- Honor `minimumReleaseAge`.

Out of scope for this session:
- `@web` step definitions (V2).
- Implementation that would make any test pass (that's phase-4).
- Writing or modifying decision docs (conventions.md, phase-1-pre-spec.md, data-model.md) unless explicitly asked.

If everything is clear, please confirm before executing.
