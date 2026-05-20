# TamedTable

A CLI ETL tool you drive with natural language. Load a CSV, type *"normalize phone numbers"* or *"drop duplicate emails,"* and the LLM rewrites a small JSON spec that the runtime replays against the data. The full motivation is in [spec/rationale.md](spec/rationale.md); the wire-protocol idea — keeping per-turn token cost constant regardless of table size — is in [spec/behavior.md](spec/behavior.md#data-model).

V1 ships a terminal CLI and a headless library. A web UI is V2.

## Project layout

Organized by **lifecycle**, not by file type:

```
TamedTable/                  root holds only README.md, LICENSE, .gitignore
├── ops/                     how the project is built; never deployed
│   ├── prompts/             reusable prompt templates
│   │   ├── prompt-woz.md       WoZ — interactive behavior simulator
│   │   ├── prompt-scribe.md    SCRIBE — spec editor (paired with WoZ)
│   │   └── prompt-*.md         frozen phase-3 / phase-4 templates
│   ├── phases/              per-phase backlogs + the Q1–Q15 decision record
│   ├── status-reports/      session-by-session audit trail
│   ├── repo-tracking/       commit-size script + chart generator
│   ├── conventions.md       stack, layout & dev-process conventions
│   └── research-links.md    name origin + library evaluations
├── spec/                    the contract — human-authored / human-blessed
│   ├── spec.md              one-line index of every doc below
│   ├── rationale.md         what TamedTable is and why
│   ├── behavior.md          what the user sees + what the system does (API-free)
│   ├── code-contract.md     types, signatures, libraries, env vars, exit codes
│   ├── prompt-app-edit.md   the three LLM prompts (imported by the runtime at init)
│   └── test-cases/          Gherkin features + -input/-expected/.flow fixtures
├── src/                     the implementation — self-contained, deployable unit
│   ├── package.json, …      build config; run every bun command from here
│   ├── node_modules/        gitignored
│   ├── packages/            core / headless / cli — regenerable from spec/
│   └── tests/               cucumber step definitions — regenerable from Gherkin
└── temp/                    scratch: test outputs, charts, logs — gitignored
```

`behavior.md` and `code-contract.md` are section-aligned twins: `behavior.md` describes what happens in plain English (no types, no library names); `code-contract.md` carries the matching types, signatures, env vars, and exit codes. Each section in one links to the same section in the other.

## Setup

You need [bun](https://bun.sh) and an Anthropic API key.

1. Install dependencies (from `src/`, where `package.json` lives):
   ```
   cd src && bun install
   ```
2. Put your API key in a `.env` file at the repo root (the loader walks up from `src/` to find it):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

Optional env vars and defaults if you omit them:

| Var | Default | What it does |
|---|---|---|
| `TAMEDTABLE_MODEL` | `claude-sonnet-4-6` | Model that writes the spec patch each turn. |
| `TAMEDTABLE_CELL_MODEL` | `claude-sonnet-4-5` | Model that fills in per-row LLM cells. Override with `claude-haiku-4-5` for cheaper/faster runs at some cost in per-cell fidelity. |
| `TAMEDTABLE_RPM` | `40` | Per-process request-per-minute cap. The Anthropic org-wide ceiling is 50. |
| `TAMEDTABLE_BATCH_SIZE` | `20` | Rows packed into a single LLM request. The model replies with a JSON array; on a parse failure the runner falls back to per-row calls for that batch. Set to `1` to disable batching. |
| `TAMEDTABLE_CHUNK_SIZE` | `5` | LLM requests that fire concurrently. Orthogonal to batch size — total parallel rows = batch × chunk. |
| `TAMEDTABLE_DEBUG` | `on` | On by default — the REPL prints a per-turn debug block after a failed request (indented, dimmed, capped at 20 lines). Set to `0`, `false`, or `off` to disable. |

## Run the CLI

Interactive REPL — load a CSV, then type natural-language requests. REPL commands use a `:` prefix (`/` is intercepted by Claude Code and other CLI agents): `:help` lists commands, `:undo` reverts the last patch, `:save <out.jsonl>` writes current rows to disk, `:save-flow <out.flow>` saves the current spec for later replay, `:exit` (or bare `exit`) leaves.

```
bun src/packages/cli/index.ts spec/test-cases/datanorm-input.csv
```

```
 Email                | Phone           | Country
 alice@example.com    | 555-123-4567    | usa
 ...
> normalize phone numbers
running … row 1: Phone "555-123-4567" → "+15551234567"
 Email                | Phone           | Country
 alice@example.com    | +15551234567    | usa
 ...
> exit
```

Ctrl-C cancels an in-progress request and rolls back the half-applied transformation.

Batch mode — replay a saved `.flow` against a CSV with no LLM call:

```
bun src/packages/cli/index.ts execute spec/test-cases/datanorm.flow \
    --input spec/test-cases/datanorm-input.csv \
    --output temp/out.jsonl
```

Exit codes are documented in [spec/code-contract.md](spec/code-contract.md#cli).

## Run the tests

All test commands run from `src/`.

```
cd src
bun run test          # both cucumber profiles (headless then cli) over the V1 features
bun run test:offline  # bun unit tests + the @offline cucumber subset (no LLM, no API key)
```

`bun run test` runs `--profile headless` then `--profile cli`; the final exit code is from the `cli` profile. The `@offline` subset (CLI flags + REPL commands) and the bun unit tests need no API key.

Narrower runs, layered on top of any of the above:

```
bun x cucumber-js --profile headless                          # @headless scenarios only
bun x cucumber-js --profile cli                               # @cli scenarios only
bun x cucumber-js --profile cli --name "Drop duplicates"      # match scenario name substring
bun x cucumber-js ../spec/test-cases/dedupe.feature           # one feature file
bun x tsc --noEmit && echo "passed"                           # fast type-only check
bun test                                                      # bun unit tests only
```

The `headless` profile binds `createHeadlessRunner` from `@tamedtable/headless`; the `cli` profile binds `createCliRunner` / `runCli` from `@tamedtable/cli`. Both cover [datanorm](spec/test-cases/datanorm.feature), [dedupe](spec/test-cases/dedupe.feature), [filter](spec/test-cases/filter.feature), and [cancelation](spec/test-cases/cancelation.feature); the `cli` profile also covers [cli-flags](spec/test-cases/cli-flags.feature) and [repl-commands](spec/test-cases/repl-commands.feature).

## Iterate on the spec with WoZ and SCRIBE

WoZ (Wizard-of-Oz) and SCRIBE let you iterate TamedTable's behavior interactively without running the implementation. WoZ simulates what TamedTable would do from `spec/behavior.md` + `spec/prompt-app-edit.md` only; when WoZ reveals a gap or surprise, SCRIBE updates the spec.

In a fresh Claude Code session at the repo root:

```
claude
> @ops/prompts/prompt-woz.md
```

That loads WoZ. Every message you type is independently classified by its first character — no persistent persona switching:

| Prefix | Persona | Use for |
|---|---|---|
| `> <note>` | SCRIBE | Spec edits: `> change the wording of :undo to …`, `> pin the page size at 20`. One-shot — the next message without a `>` prefix returns to WoZ automatically. |
| `:cmd ...` | WoZ — deterministic | Simulated TamedTable REPL commands: `:help`, `:load file.csv`, `:undo`, `:save out.jsonl`, `:save-flow out.flow`, `:exit`. (The REPL uses `:` instead of `/` because `/` is intercepted by Claude Code and other CLI agents.) |
| anything else | WoZ — default | NL transformation requests (`normalize phone numbers`, `drop duplicate emails`) emit the JSON Patch the spec-editor LLM would produce per `prompt-app-edit.md`. For `{llm:…}` columns, WoZ appends 3–5 synthesized sample cell values (plausible, not golden) — prefix `patch only:` to suppress. `execute <flow>` / `--flag` invocations reproduce CLI behavior byte-for-byte. |

Visual: WoZ output appears in fenced code blocks (terminal-shaped — that's the simulated TamedTable output). SCRIBE responses appear as markdown blockquotes (every line prefixed with `> `, mirroring your input prefix).

SCRIBE edits `spec/behavior.md` (almost always), `spec/code-contract.md` (only when the API surface changes), or `spec/prompt-app-edit.md` (prompt tuning). It never touches `src/`, `ops/phases/`, or `spec/test-cases/*.feature`.

For V2 web-UI questions WoZ produces a Claude artifact or writes a sketch to `temp/` rather than refusing.

## Known limitations

- **Per-org rate limit dominates wall-clock.** A full test run is 7–9 minutes; most of that is the 40 RPM throttle waiting out the 50 RPM org ceiling, not LLM latency. Two back-to-back runs risk hitting the cap on retries.
- **Golden-file fragility on LLM cells.** Some `datanorm` scenarios assert byte equality against a frozen JSONL golden. Sonnet and Haiku produce semantically-equivalent but not byte-identical outputs for ambiguous inputs (e.g. phone numbers without a country code), and the model's own minor revisions can shift the answer over time. Mismatches on LLM-driven cells aren't necessarily regressions — see the determinism note at the end of [spec/behavior.md → Headless](spec/behavior.md#headless).
- **CSV in, JSONL out.** Other formats are V2.
