Read [writing-style.md](../writing-style.md) first (in case any spec needs follow-up clarification), then [conventions.md](../conventions.md), the spec ([spec/behavior.md](../../spec/behavior.md) + [spec/code-contract.md](../../spec/code-contract.md) + [spec/prompt-app-edit.md](../../spec/prompt-app-edit.md)), every active feature file under [spec/test-cases/](../../spec/test-cases/), and the current step definitions at [src/tests/](../../src/tests/). The step defs are the executable target — every symbol they import must resolve to a working implementation.

Version scope (what's V1, V2, etc.) lives inside the spec — not here. This prompt is version-agnostic: implement everything the loaded spec describes for the scenarios the active cucumber profile actually runs.

The backlog is the diff between the spec (Gherkin scenarios + behavior/code-contract docs) and the current `src/`. Triage red scenarios in the order sections appear in [behavior.md](../../spec/behavior.md), tightest-radius first; inside a section, smallest dependency footprint first.

Process:
- After each meaningful change, run the relevant cucumber profile (or narrow with `--name "..."`) and briefly summarize what passed and what's still red.
- Implement only what the spec describes. If you find a genuine ambiguity, do NOT decide and code — escalate to the HUMAN as a `> <spec edit>` SCRIBE proposal, wait for the answer to land in `behavior.md` / `code-contract.md` / `prompt-app-edit.md`, then continue.
- Don't modify step defs to fit your implementation. The step defs are the contract; the implementation moves to fit them. Adding new steps to support new behavior is fine; rewriting existing assertions is not.
- New dependencies must honor [bunfig.toml](../../src/bunfig.toml)'s `minimumReleaseAge = 604800` (7 days). Verify with `bun pm` before installing.
- The LLM API key is read from `ANTHROPIC_API_KEY`. If missing, the harness exits with a clear message rather than a stack trace.
- Feature-file selection comes from [cucumber.js](../../src/cucumber.js) (the `TAMEDTABLE_FEATURES` env var), not from this prompt. A feature outside that list is out of scope for the current session; a feature inside it is in scope, regardless of which version the spec marks it as.

Out of scope:
- Direct edits to any file under `spec/`, `spec/test-cases/`, or `ops/`. Those go through SCRIBE (a `> <spec edit>` message), never directly. `conventions.md` and `writing-style.md` are read-only too.

If everything is clear, please confirm before executing.

---

History: phase 4 implemented V1 from per-surface spec docs (`core.md`, `runner.md`, `headless.md`, `cli.md`); phase 5 consolidated those into the single `behavior.md` + `code-contract.md` pair this prompt targets. The original prompt also pinned V1 scope and excluded V2 features inline; that exclusion moved to the spec itself in phase 6 so the prompt could stay version-neutral as V2 and later versions land.
