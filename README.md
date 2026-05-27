# TamedTable

A CLI ETL tool you drive with natural language. Load a CSV, type *"normalize phone numbers"* or *"drop duplicate emails,"* and the LLM rewrites a small JSON spec that the runtime replays against the data. The full motivation is in [spec/rationale.md](spec/rationale.md); the wire-protocol idea — keeping per-turn token cost constant regardless of table size — is in [spec/behavior.md](spec/behavior.md#data-model).

V1 ships a terminal CLI and a headless library; V4 adds a browser UI.

## Project layout

Organized by **lifecycle**, not by file type:

```
TamedTable/                  root holds only README.md, LICENSE, .gitignore
├── ops/                     how the project is built; never deployed
│   ├── prompts/             reusable session starters — see AGENTS.md
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
│   ├── packages/            core / headless / cli / web — regenerable from spec/
│   └── tests/               cucumber step definitions — regenerable from Gherkin
└── temp/                    scratch: test outputs, charts, logs — gitignored
```

`behavior.md` and `code-contract.md` are section-aligned twins: `behavior.md` describes what happens in plain English (no types, no library names); `code-contract.md` carries the matching types, signatures, env vars, and exit codes. Each section in one links to the same section in the other.

## Setup

You need [bun](https://bun.sh) and an Anthropic API key.

1. Install the project's libraries — a one-time step you repeat only if the
   dependencies change:
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

Interactive REPL — load a CSV, then type natural-language requests. REPL commands use a `:` prefix (`/` is intercepted by Claude Code and other CLI agents): `:help` lists commands, `:undo` reverts the last patch, `:save <out.jsonl>` writes current rows to disk, `:save-flow <out.flow>` saves the current spec for later replay, `:save-py <out.py>` exports the flow as a standalone Python script, `:reorder <cols>` sets the column order for the table view and saved files, `:exit` (or bare `exit`) leaves.  

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

## Run the web UI

V4 adds a browser front-end — a chat sidebar for natural-language requests beside a live table view — on the same engine the CLI drives.

Day to day, you need just one command. From the web package's folder:

```
cd src/packages/web
bun run dev
```

`bun run dev` starts a local server with live reload and prints a URL (default `http://localhost:5173`); open it in your browser. Leave the command running while you use the app — Ctrl-C stops it.

Here is every `bun` command the web UI uses, and when you need each:

| Command | Run it from | When |
|---|---|---|
| `bun install` | `src/` | Once during [Setup](#setup); again only if dependencies change. |
| `bun run dev` | `src/packages/web/` | Every time you want to use the web UI. |
| `bun run build` | `src/packages/web/` | Only to deploy — compiles the UI into static files in `dist/` for hosting on any web server. Normal use never needs it. |

Why two directories? `bun install` installs libraries for the whole project at once, so it runs from the project root (`src/`); `bun run dev` and `bun run build` belong to the web package, so they run from that package's folder (`src/packages/web/`).

Once the page loads, click **Settings** and paste your Anthropic API key — the web UI reads the key from a per-tab settings panel, not from `.env`. The Settings panel also picks which Anthropic model drives requests. Then **Open file** to load a CSV or JSONL, type a request in the chat sidebar, and watch cells stream in. Click a cell to select it, double-click to edit it, drag a column header to reorder; **Undo**, **Save data**, and **Save flow** mirror the CLI's `:undo` / `:save` / `:save-flow`. The table shows 20 rows per page with a pager along the bottom, and a status footer reports the selected cell and whether the app is idle, running, or saved.

There is no server: the web UI calls Anthropic directly from the browser through the same SDK the CLI uses. File input/output uses the File System Access API where the browser supports it, with a download/upload fallback elsewhere.

## Run the tests

Everything runs from `src/` — `cd src` first. (`src/` is the self-contained
package: it holds `package.json` and `node_modules`, so `bun` runs there.)

| Command | Runs |
|---|---|
| `bun run test` | All tests — the bun unit tests plus all three Cucumber profiles. Offline, no API key. |
| `bun run test:unit` | The bun unit tests only. |
| `bun run test:headless` | The Cucumber `@headless` profile only. |
| `bun run test:cli` | The Cucumber `@cli` profile only. |
| `bun run test:web` | The Cucumber `@web` profile only. |
| `bun run test:record` | Re-records the cassettes (see below) against the live Anthropic API. |
| `bun run typecheck` | Type-check only — `tsc --noEmit` for the engine packages and the web package. |

Run one feature with `TAMEDTABLE_FEATURES`, e.g. `TAMEDTABLE_FEATURES=validate bun run test`.

### Cassettes — why the suite is fast and key-free

The Cucumber suite issues real natural-language requests. A live Anthropic call
per scenario takes 7–9 minutes (rate-limited) and needs an API key, so each model
response is recorded once to `src/tests/__cassettes__/<feature>.json` and
**replayed from disk** on every later run. The recordings are committed to git;
`bun run test` replays them by default — seconds, offline, no key.

Each request is fingerprinted over its full prompt, so changing a prompt never
matches an old recording: replay fails loudly with `no recording for this
request` instead of returning a stale answer. When that happens — or when you add
a scenario — refresh the cassettes and commit the updated files:

```
bun run test:record      # needs ANTHROPIC_API_KEY (see Setup above)
```

For a live run that ignores the cassettes, set `TAMEDTABLE_CASSETTE=off`.

## Iterate on the spec with WoZ and SCRIBE

WoZ (Wizard-of-Oz) and SCRIBE let you iterate TamedTable's behavior interactively without running the implementation. WoZ simulates what TamedTable would do from `spec/behavior.md` only; when WoZ reveals a gap or surprise, SCRIBE updates the spec.

In a fresh Claude Code session at the repo root:

```
claude
> @ops/prompts/prompt-woz.md
```

That loads WoZ. Every message you type is independently classified by its first character — no persistent persona switching:

| Prefix | Persona | Use for |
|---|---|---|
| `> <note>` | SCRIBE | Spec edits: `> change the wording of :undo to …`, `> pin the page size at 20`. One-shot — the next message without a `>` prefix returns to WoZ automatically. |
| anything else | WoZ | Simulate the app's response from `spec/behavior.md`. |

Visual: WoZ output appears in fenced code blocks (terminal-shaped — that's the simulated TamedTable output). SCRIBE responses appear as markdown blockquotes (every line prefixed with `> `, mirroring your input prefix).

SCRIBE edits `spec/behavior.md` (almost always), `spec/code-contract.md` (only when the API surface changes), or any LLM prompt files the spec references (prompt tuning). It never touches `src/`, `ops/journal/`, or `spec/test-cases/*.feature`.

## Known limitations

- **Re-recording cassettes is slow.** `bun run test` replays recorded responses in seconds, but `bun run test:record` makes a live API call per scenario — 7–9 minutes, mostly the 40 RPM throttle waiting out the 50 RPM org ceiling. Re-record only when a prompt changes.
- **Golden-file fragility on LLM cells.** Some `datanorm` scenarios assert byte equality against a frozen JSONL golden. Sonnet and Haiku produce semantically-equivalent but not byte-identical outputs for ambiguous inputs (e.g. phone numbers without a country code), and the model's own minor revisions can shift the answer over time. Mismatches on LLM-driven cells aren't necessarily regressions — see the determinism note at the end of [spec/behavior.md → Headless](spec/behavior.md#headless).
- **CSV and JSONL only.** Both load and save; other tabular formats (`.xlsx`, `.parquet`) are out of scope until their own scenarios are written.
- **No `{sql}` in the web UI.** DuckDB is a native module that cannot run in a browser, so `{sql}` transformations are unavailable in the web front-end; the CLI and headless library support them in full. "Save data" in the web UI writes JSONL only.
