Read `AGENTS.md` and `README.md` first — they hold project-specific paths, test commands, and process rules. Then check git history (`git log --oneline -20`, `git diff main~1..main`) to see what recently changed.

Load the spec (`spec/behavior.md`, `spec/code-contract.md`), all active Gherkin features, and the current step definitions. The step defs are the executable contract.

Process:
- Triage red scenarios in spec order, tightest radius first.
- After each meaningful change, run the relevant test profile and report what passed and what is still red.
- Implement only what the spec describes. For genuine ambiguities, stop: send a `> <spec edit>` SCRIBE message, wait for the answer to land in the spec, then continue.
- Do not rewrite step defs to fit your implementation. The step defs define the contract; the implementation moves to fit them.
- New dependencies must honor the project's minimum release age. Check before installing.

Out of scope: edits to `spec/`, `spec/test-cases/`, or `process/`. Those go through SCRIBE.

Confirm before executing.
