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

## Workflow rule — changing a component

When you change observable behavior of `cli`, `core`, `headless`, or `web`, update in this order:

1. `src/packages/<name>/` — the implementation.
2. `spec/behavior.md` and `spec/code-contract.md` — the matching section.
3. `spec/test-cases/*.feature` — if external behavior changed.
4. `cd src && bun run test`. Must be green before commit.

Pure refactors that preserve behavior touch only steps 1 and 4.

## Writing markdown

Any `.md` you add or edit follows [ops/writing-style.md](ops/writing-style.md). The same rules apply to this file.

## Don't

- Rewrite entries in `ops/journal/` — they are historical.
- Add a top-level directory without reading [ops/conventions.md](ops/conventions.md).
- Restate what's in canonical docs. Link instead.
