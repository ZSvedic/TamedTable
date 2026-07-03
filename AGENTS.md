# Agent guide

Entry point for AI coding agents (Claude Code, Codex, Copilot, Cursor, …). Start at [README.md](README.md) for project description, layout, and run commands. The rules below apply only to changes you make.

## Canonical docs by purpose

| Need | Go to |
|---|---|
| What the user sees, what the system does | [spec/behavior.md](spec/behavior.md) |
| Types, env vars, exit codes | [spec/code-contract.md](spec/code-contract.md) |
| LLM prompts (spec-editor, per-cell, voice, Python export) | [spec/prompt-app-edit.md](spec/prompt-app-edit.md) |
| How to run anything (CLI / web / tests) | [README.md](README.md) |
| Repo layout and tooling rationale | [README.md](README.md#project-layout) tree + [Layout, stack & process](#layout-stack--process) below |
| Spec index, test-fixture naming | [spec/README.md](spec/README.md) |
| Package specs: layout, step-def ownership, UI rules, demos | [spec/packages/README.md](spec/packages/README.md) |
| How to write any markdown you add | [spec/writing-style.md](spec/writing-style.md) |
| Past decisions and status reports | [process/journal/](process/journal/) — read, don't rewrite |
| Code and feature map | [MAP.md](MAP.md) |

## Explaining things in chat — KISS

When you answer the user in chat (status updates, failure reports, "why did X happen"), keep it simple:

- Lead with the one-sentence answer. Details only if they change what the user does next.
- Plain words, no developer jargon. If a mechanism needs explaining, use an everyday analogy ("the run got a guest badge, not the house key").
- For "what happened" questions, give a numbered timeline — one short line per event.
- Answer the question asked, then stop. No extra context, no side findings unless asked.

## Code navigation

`MAP.md` lists every user-facing feature and every major code area, each identified by a `#PascalCase` hashtag. Search `#TagName` in GitHub (or your editor) to jump straight to the relevant files. To add a new area: place the tag as a comment in the code, then add a row to `MAP.md`.

## Available prompts

Reusable session starters in `process/prompts/`:

| Prompt | Use for |
|---|---|
| [prompt-cleanup.md](process/prompts/prompt-cleanup.md) | Audit every tracked file for consistency and simplicity; write a status table. |
| [prompt-illustrate.md](process/prompts/prompt-illustrate.md) | Create on-brand SVG marketing illustrations for a list of features. |
| [prompt-implement.md](process/prompts/prompt-implement.md) | TDD implementation: read spec + Gherkin + step defs, implement until green. |
| [prompt-meeting.md](process/prompts/prompt-meeting.md) | Time-boxed agenda meeting; records decisions in the meeting doc. |
| [prompt-scribe.md](process/prompts/prompt-scribe.md) | SCRIBE — spec-only editor, never touches `src/`. Paired with WoZ. |
| [prompt-woz.md](process/prompts/prompt-woz.md) | WoZ — interactive behavior simulator driven by `spec/behavior.md`. |

## Layout, stack & process

The repo is organized by **lifecycle**, not by file type — see the tree in [README.md](README.md#project-layout). Why the boundaries fall where they do:

- **`src/` holds the JS config** because `package.json` is coupled to the code it builds, and Node module resolution walks *up* — so anything importing dependencies (app code *and* step defs) must live under the dir that holds `node_modules/`. That makes `src/` a single deployable unit you can copy and run.
- **`.feature` files live in `spec/`; app step defs in `src/tests/`, package step defs in the package** — the same spec/implementation split as `spec/behavior.md` + `spec/code-contract.md` ↔ `src/packages/`. Step defs read fixtures from `spec/test-cases/` by plain file path (data reads, unlike imports, cross directories freely).
- **`src/` root files are permanent** (`package.json`, `bun.lock`, `bunfig.toml`, `tsconfig.json`, `cucumber.js`) — not regenerable from `spec/`, not deletable. Only `src/`'s *subdirs* (`packages/`, `tests/`) are regenerable. `bun.lock` *is* the spec of the dependency tree — versions are never duplicated into `spec/`; when a specific pin is load-bearing, `spec/code-contract.md` records *that* it is pinned and why, not the number.
- **`cassettes/` (root) is recorded data, never code** — the LLM responses the test suite replays, one JSON per feature. Machine-recorded, so not `spec/`; not regenerable from spec (re-recording needs a live API key, costs money, and fresh outputs can stop matching committed goldens), so not `src/` either. Refresh deliberately with `bun run test:record`; never delete casually.
- **`benchmarks/` (root) is data + outputs, never importing code** — the model & batch-size benchmark's pricing table, ground truth, sweep results, and generated charts. Its runner is a workspace package (`src/packages/bench`, `@tamedtable/bench`) because it imports the engine and so must live under `src/` (the module-resolution rule above); the runner reads `benchmarks/` by plain path, the same way step defs read `spec/` fixtures. Keeping the data at the root — like `process/` and `marketing/` — keeps `src/` a clean deployable unit.

Stack:

- **TypeScript everywhere** (CLI, core, web).
- **Runtime + package manager: bun** — always. All `bun` commands run from `src/` (that's where `package.json` lives). Bun executes TypeScript natively (no separate compile step).
- **Monorepo** via bun workspaces; packages live under `src/packages/`.
- **Dependency stability**: `minimumReleaseAge = 604800` (7 days) in `src/bunfig.toml`.

Process: outside-in TDD — Gherkin → step definitions → API spec → implementation → unit tests as edges surface. Don't pre-write tests for hypothetical edges.

## Workflow rule — changing a component

When you change observable behavior of `cli`, `core`, `headless`, or `web`, update in this order — spec first, then tests, then implementation:

1. `spec/behavior.md` and `spec/code-contract.md` — write or update the matching section first.
2. `spec/test-cases/*.feature` — add or update the Gherkin scenario.
3. `src/tests/*.steps.ts` — write or update step definitions. Run the suite; the new behavior should be **red** (the implementation hasn't moved yet).
4. `src/packages/<name>/` — implement until the suite goes **green**.
5. `cd src && bun run test`. Confirm green before commit.
6. Open the PR.

Pure refactors that preserve behavior touch only steps 4 and 5 — no spec or Gherkin change.

## Issue-driven development — the `claude-implement` label

A GitHub issue labelled **`claude-implement`** is a task queued for an autonomous session. The human files the issue and labels it; an agent session picks it up and does the rest.

When you are a session started for such an issue:

1. Read the issue body — it is the task spec. If it is ambiguous enough that you'd guess at something hard to reverse, ask in an issue comment (or the PR) before doing large work.
2. Implement it through the [workflow rule](#workflow-rule--changing-a-component) above: spec → Gherkin → step defs → code, red before green. Pure-doc tasks skip straight to the edit.
3. Run `cd src && bun run test` — confirm green.
4. Open **one PR per issue** on its own branch. Put `Fixes #<n>` in the PR body so merging the PR closes the issue automatically. If the issue carries the `pr-preview` label, add that same label to the PR you open (the preview build keys off the **PR's** label, not the issue's) and put the preview URL — `https://zsvedic.github.io/TamedTable/pr-preview/pr-<n>/` — in your closing summary so it never has to be guessed.
5. Stop there. Review and merge are the human's job; respond to review comments on the PR.

The issue is the durable task record; the closed issue plus the matching PR are the log. No separate `todo/`/`done/` files needed.

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

A direct `git push` to `main` is blocked from the Claude-on-the-web sandbox, but the GitHub API is not — use the `create_or_update_file` MCP tool (it needs the file's current blob SHA) to land a docs-only commit on `main` without a branch or PR.

## Writing markdown

Any `.md` you add or edit follows [spec/writing-style.md](spec/writing-style.md). The same rules apply to this file.

## Don't

- Rewrite entries in `process/journal/` — they are historical.
- Add a top-level directory without reading [Layout, stack & process](#layout-stack--process).
- Restate what's in canonical docs. Link instead.
- Leave "future", "planned", or "deferred" language in docs after a feature ships — update those references in the same PR that implements the feature.
