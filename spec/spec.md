# TamedTable specs

- [Writing style](../ops/writing-style.md) — how the docs in this directory are written.
- [Rationale](rationale.md) — what TamedTable is and why.
- [Behavior](behavior.md) — what the user sees and what the system does. WoZ's sole behavior input alongside `prompt-app-edit.md`.
- [Code contract](code-contract.md) — types, signatures, library choices, env vars, exit codes. Section-aligned with `behavior.md`.
- [Prompt — app edit](prompt-app-edit.md) — the LLM prompts that drive the spec editor, per-row cell evaluator, and `:save-py` Python export. Imported by the runtime at module init.
- [test-cases/](test-cases/) — Gherkin features and input/expected/flow fixtures.
