# Agent guide

Entry point for AI coding agents (Claude Code, Codex, Copilot, Cursor, …). Start at [README.md](README.md) for project description, layout, and run commands. The rules below apply only to changes you make.

## Canonical docs by purpose

| Need | Go to |
|---|---|
| Behavior, types, env vars, exit codes, prompts | [spec/spec.md](spec/spec.md) |
| How to run anything (CLI / web / tests) | [README.md](README.md) |
| Repo layout and tooling rationale | [ops/conventions.md](ops/conventions.md) |
| How to write any markdown you add | [ops/writing-style.md](ops/writing-style.md) |
| Past decisions and status reports | [ops/journal/](ops/journal/) — read, don't rewrite |

## Available prompts

Reusable session starters in `ops/prompts/`:

| Prompt | Use for |
|---|---|
| [prompt-cleanup.md](ops/prompts/prompt-cleanup.md) | Audit every tracked file for consistency and simplicity; write a status table. |
| [prompt-implement.md](ops/prompts/prompt-implement.md) | TDD implementation: read spec + Gherkin + step defs, implement until green. |
| [prompt-meeting.md](ops/prompts/prompt-meeting.md) | Time-boxed agenda meeting; records decisions in the meeting doc. |
| [prompt-scribe.md](ops/prompts/prompt-scribe.md) | SCRIBE — spec-only editor, never touches `src/`. Paired with WoZ. |
| [prompt-woz.md](ops/prompts/prompt-woz.md) | WoZ — interactive behavior simulator driven by `spec/behavior.md`. |

## Workflow rule — changing a component

When you change observable behavior of `cli`, `core`, `headless`, or `web`, update in this order — spec first, then tests, then implementation:

1. `spec/behavior.md` and `spec/code-contract.md` — write or update the matching section first.
2. `spec/test-cases/*.feature` — add or update the Gherkin scenario.
3. `src/tests/*.steps.ts` — write or update step definitions. Run the suite; the new behavior should be **red** (the implementation hasn't moved yet).
4. `src/packages/<name>/` — implement until the suite goes **green**.
5. `cd src && bun run test`. Confirm green before commit.
6. Open the PR.

Pure refactors that preserve behavior touch only steps 4 and 5 — no spec or Gherkin change.

## Direct commit vs PR

Open a PR when the change:

- Touches code in `src/` or files the test suite covers — let CI verify.
- Modifies `.github/` workflows, repo rulesets, or other CI/settings.
- Bundles multiple logical units that must land together.

Commit directly to `main` when the change is:

- Docs-only (no `src/`, no `spec/test-cases/`, no workflows).
- A single self-contained edit — typo, stale reference, broken link, prompt tweak.
- Verified locally if any verification is needed.

The test: "does this need CI to verify it?" If yes, PR. If no, commit.

## Writing markdown

Any `.md` you add or edit follows [ops/writing-style.md](ops/writing-style.md). The same rules apply to this file.

## Don't

- Rewrite entries in `ops/journal/` — they are historical.
- Add a top-level directory without reading [ops/conventions.md](ops/conventions.md).
- Restate what's in canonical docs. Link instead.
- Leave "future", "planned", or "deferred" language in docs after a feature ships — update those references in the same PR that implements the feature.
