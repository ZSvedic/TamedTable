TamedTable is an AI ETL tool you drive with natural language. Load a CSV, type *"normalize phone numbers"* or *"drop duplicate emails,"* and the LLM rewrites a small JSON spec that the runtime replays against the data. 

[TamedTable.com web](https://www.tamedtable.com) explains major features. 

[Run the live app](https://www.tamedtable.com/app/) directly in the browser, no install needed. 

https://github.com/user-attachments/assets/1bb6857c-32d9-4ff1-9eda-2857b06cd08f

*20-second demo — normalize phone numbers in plain language.*

## Project layout

Organized by *lifecycle*, not by file type:

```
TamedTable/                  root: README.md, MAP.md (feature + code navigation), LICENSE, .gitignore
├── benchmarks/              model & batch-size benchmark DATA + outputs (no code — runner is @tamedtable/bench)
│   ├── models.jsonl         single source of per-model pricing/specs (in/out $, context, audio)
│   ├── ground-truth/        labelled subset the sweep scores against (music-sample.csv + music-labels.jsonl)
│   ├── results/             sweep outputs (JSONL)
│   └── charts/              generated SVG tradeoff charts
├── cassettes/               recorded LLM responses the test suite replays — committed data, one JSON per feature
├── marketing/               everything the public sees + the shared design base — never part of src/
│   ├── tokens.json          design token master — colors, typography, spacing
│   ├── brand/               marks, favicons, lockups, brand.md
│   ├── icons/               UI icon glyphs, one 16×16 SVG per name — source of ui-kit's generated icons.ts
│   ├── claude-design-app/   in-browser design canvas (scratch JSX + generated tokens.jsx)
│   ├── illustrations/       SVG feature tiles + gallery
│   └── web/                 the landing page that ships to the site root
├── process/                 how the project is built; never deployed
│   ├── journal/             historic status reports
│   ├── prompts/             reusable session starters — see AGENTS.md
│   └── repo-tracking/       commit-size script + chart generator
├── spec/                    the contract — human-authored / human-blessed
│   ├── README.md            spec index + test-fixture naming
│   ├── rationale.md         what TamedTable is and why
│   ├── behavior.md          what the user sees + what the system does (API-free)
│   ├── code-contract.md     types, signatures, libraries, env vars, exit codes
│   ├── prompt-app-edit.md   the LLM prompts (imported by the runtime at init)
│   ├── writing-style.md     writing style for every markdown file in the repo
│   ├── packages/            per-package specs — mirrors src/packages/; rules in its README.md
│   └── test-cases/          Gherkin features + -input/-expected/.flow fixtures
├── src/                     the implementation — self-contained, deployable unit
│   ├── package.json, …      build config; run every bun command from here
│   ├── node_modules/        gitignored
│   ├── packages/            app (core/headless/cli/web) + library packages — regenerable from spec/
│   └── tests/               app step definitions — regenerable from Gherkin
└── temp/                    scratch: test outputs, charts, logs — gitignored
```

`behavior.md` and `code-contract.md` are section-aligned twins: `behavior.md` describes what happens in plain English (no types, no library names); `code-contract.md` carries the matching types, signatures, env vars, and exit codes. Each section in one links to the same section in the other.

## Setup

You need [bun](https://bun.sh) and an API key from any one supported provider — Anthropic, Google Gemini, or OpenAI.

1. Install the project's libraries — a one-time step you repeat only if the
   dependencies change:
   ```
   cd src && bun install
   ```
2. Put your provider's API key in a `.env` file at the repo root (the loader walks up from `src/` to find it). Use the variable that matches your provider:
   ```
   ANTHROPIC_API_KEY=sk-ant-...      # Anthropic
   GEMINI_API_KEY=...                # Google Gemini
   OPENAI_API_KEY=sk-...             # OpenAI
   ```
   The runtime picks the provider from the model id (`TAMEDTABLE_MODEL` below), so set the model to one from your provider unless you use the default Gemini model.

Optional env vars and defaults if you omit them:

| Var | Default | What it does |
|---|---|---|
| `TAMEDTABLE_MODEL` | `gemini-3.5-flash` | Model that writes the spec patch each turn. Its id also selects the provider — e.g. `claude-sonnet-4-6` (Anthropic) or `gpt-5.5` (OpenAI) — so it must match the key you set above. |
| `TAMEDTABLE_CELL_MODEL` | `gemini-3.1-flash-lite` | Secondary model that fills in per-row LLM cells. Must share the primary model's provider. |
| `TAMEDTABLE_RPM` | `40` | Per-process request-per-minute cap. The Anthropic org-wide ceiling is 50. |
| `TAMEDTABLE_BATCH_SIZE` | `20` | Rows packed into a single LLM request. The model replies with a JSON array; on a parse failure the runner falls back to per-row calls for that batch. Set to `1` to disable batching. |
| `TAMEDTABLE_CHUNK_SIZE` | `5` | LLM requests that fire concurrently. Orthogonal to batch size — total parallel rows = batch × chunk. |
| `TAMEDTABLE_DEBUG` | `on` | On by default — the REPL prints a per-turn debug block after a failed request (indented, dimmed, capped at 20 lines). Set to `0`, `false`, or `off` to disable. |

## Run the CLI

Interactive REPL — load a CSV, then type natural-language requests. REPL commands use a `:` prefix (`/` is intercepted by Claude Code and other CLI agents): `:help` lists commands, `:undo` reverts the last patch, `:save <out.jsonl>` writes current rows to disk, `:save-flow <out.flow>` saves the current spec for later replay, `:save-py <out.py>` exports the flow as a standalone Python script, `:reorder <cols>` sets the column order for the table view and saved files, `:exit` (or bare `exit`) leaves.  

```
bun src/packages/cli/index.ts spec/test-cases/customers-input.csv
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
bun src/packages/cli/index.ts execute spec/test-cases/cleanup.flow \
    --input spec/test-cases/customers-input.csv \
    --output temp/out.jsonl
```

Exit codes are documented in [spec/code-contract.md](spec/code-contract.md#cli).

## Run the web UI

A browser front-end runs on the same engine the CLI drives.

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

Once the page loads, click **Settings** and paste an API key from any supported provider (Anthropic, Google Gemini, or OpenAI) — the web UI reads the key from a per-tab settings panel, not from `.env`. The Settings panel also picks which model drives requests, and the chosen model selects the provider. Then click **Open sample…** to pick one of the bundled sample files, or use its dropdown for **Open local…** (a file from your computer) or **Open URL…** (a CSV, JSONL, Parquet, or Arrow file by address). Type a request in the chat sidebar and watch cells stream in. Click a cell to select it, double-click to edit it, drag a column header to reorder; **Undo**, **Save data**, and **Save flow** mirror the CLI's `:undo` / `:save` / `:save-flow`, and each save button's dropdown saves in a different format — including **Save as Python** (`:save-py`). The table shows 20 rows per page with a pager along the bottom, and a status footer reports the selected cell and whether the app is idle, running, or saved.

There is no server: the web UI calls your chosen provider directly from the browser through the same SDK the CLI uses. File input/output uses the File System Access API where the browser supports it, with a download/upload fallback elsewhere.

## Run the tests

Everything runs from `src/` — `cd src` first. (`src/` is the self-contained
package: it holds `package.json` and `node_modules`, so `bun` runs there.)

First time on a machine, run `bun run setup` once. It installs the libraries
*and* the headless Chromium that the `@web` profile and `test:smoke` drive — a
browser binary `bun install` alone does not fetch.

| Command | Runs |
|---|---|
| `bun run test` | All tests — the bun unit tests plus all three Cucumber profiles. Offline, no API key. |
| `bun run test:unit` | The bun unit tests only. |
| `bun run test:headless` | The Cucumber `@headless` profile only. |
| `bun run test:cli` | The Cucumber `@cli` profile only. |
| `bun run test:web` | The Cucumber `@web` profile only. Drives the demos in headless Chromium, so it needs the browser from `bun run setup` (or `bunx playwright install chromium`). |
| `bun run test:smoke` | The module-demo smoke test: builds each demo with the deploy workflow's flags and drives it in headless Chromium. Needs a Chromium binary (`bunx playwright install chromium`); not part of `bun run test`. |
| `bun run test:record` | Re-records the cassettes (see below) against the live Gemini API. |
| `bun run typecheck` | Type-check only — `tsc --noEmit` for the engine packages and the web package. |

Run one feature with `TAMEDTABLE_FEATURES`, e.g. `TAMEDTABLE_FEATURES=validate bun run test`.

A Playwright e2e layer (`src/packages/web/e2e/`) drives the web app in a real browser alongside the Cucumber `@web` profile: `bun run test:e2e` from `src/packages/web/` starts the Vite dev server and runs the `*.e2e.ts` specs headless; it is not part of `bun run test`.

### Cassettes — why the suite is fast and key-free

The Cucumber suite issues real natural-language requests. A live model call
per scenario takes minutes (rate-limited) and needs an API key, so each model
response is recorded once to `cassettes/<feature>.json` (repo root) and
**replayed from disk** on every later run. The recordings are committed to git;
`bun run test` replays them by default — seconds, offline, no key.

Each request is fingerprinted over its full prompt, so changing a prompt never
matches an old recording: replay fails loudly with `no recording for this
request` instead of returning a stale answer. When that happens — or when you add
a scenario — refresh the cassettes and commit the updated files:

```
bun run test:record      # needs GEMINI_API_KEY (see Setup above)
```

Every cassette records with the Gemini provider defaults —
`gemini-3.5-flash` for the spec-patch turn, `gemini-3.1-flash-lite` for
per-row cells — the same models the key-free replay (tests and homepage
tours) resolves. `test:record` covers the headless and CLI profiles; the
`@web`-only tour scenarios record through the web profile:
`TAMEDTABLE_CASSETTE=record bun run test:web`.

For a live run that ignores the cassettes, set `TAMEDTABLE_CASSETTE=off`.

## Performance benchmark

A standalone benchmark measures how the engine behaves on a large table — the
committed 1,820-row [`spec/test-cases/performance-liked-videos.csv`](spec/test-cases/performance-liked-videos.csv).
It is separate from `bun run test`: the scenarios in
[`spec/test-cases/performance.feature`](spec/test-cases/performance.feature) carry only the
`@perf` tag, so the regular profiles skip them. Each run prints a summary table
of **total time, tokens used, and estimated cost** per scenario, in three groups:

- **A — load** the file (pure I/O, no model call).
- **B — SQL operations** (sort, filter) over every row (engine execution, no model call).
- **C — natural-language cell fills** — e.g. *"Add a boolean column Music that is true for music videos"* — which the weaker cell model answers over `N / TAMEDTABLE_BATCH_SIZE` turns. This is where tokens and cost accrue.

### Offline vs online

| Command | Network | Needs a key | What it does |
|---|---|---|---|
| `bun run bench` | **Offline** | No | Runs all three groups; group C replays the committed cassette (Gemini flash-lite). |
| `bun run bench:record` | Online | Yes | Re-records group C against the live API and refreshes the committed cassette. |
| `bun run bench:live` | Online | Yes | Runs every group straight against the live API — no cassette read or written. |

Tokens and cost are real in every mode (the cassette stores the live token
usage). Only group C's *timing* differs: offline it is the cassette-replay time,
not API latency, so use `bun run bench:live` for true end-to-end timing. A and B
never call the model — their timing, and their zero token/cost, are the same
in every mode. All `bench` commands run from `src/` (like every other `bun`
command).

### Choosing the provider and models

The benchmark uses the same model env vars as the rest of the app
([Setup](#setup)): `TAMEDTABLE_MODEL` (the patch-turn model) and
`TAMEDTABLE_CELL_MODEL` (the per-row cell model). Run **online** to benchmark a
provider other than the committed Anthropic cassette, with that provider's key
in `.env` (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY` — the
runtime picks the provider from the model id):

```
# Gemini: stronger model for the patch turn, cheapest for the cells
TAMEDTABLE_MODEL=gemini-3.5-flash TAMEDTABLE_CELL_MODEL=gemini-3.1-flash-lite bun run bench:live

# OpenAI
TAMEDTABLE_MODEL=gpt-5.5 TAMEDTABLE_CELL_MODEL=gpt-5.4-mini bun run bench:live
```

`bun run bench` (offline) only covers the committed Anthropic cassette; any other
combination needs an online run. The token tally reads Anthropic, Google, and
OpenAI usage shapes, so per-model cost is attributed correctly for any provider.

### Cost accounting and results

Cost is each call's token usage priced at the published per-model rates in
[`benchmarks/models.jsonl`](benchmarks/models.jsonl) — the single source of
pricing/specs, loaded through `@tamedtable/bench`. Anthropic figures come from
the model reference, [Gemini](https://ai.google.dev/gemini-api/docs/pricing) and
[OpenAI](https://developers.openai.com/api/docs/pricing) from their pricing
pages. Prompt-cache writes are billed at 1.25× and reads at 0.1× of the input
rate (Anthropic figures), because most input tokens are cached and counting only
`input_tokens` would undercount badly.

Recorded results for specific model combinations live in
[`process/journal/`](process/journal/) (e.g. the dated
`*-performance-benchmark-results.md` report), not next to the test fixtures.

### Model & batch-size sweep

Beyond the single-config A/B/C run above, the `@tamedtable/bench` package sweeps
group C across a grid of **(cell model × batch size)** and scores each config on
speed, cost, **and accuracy** — the last measured against the committed
ground-truth labels in [`benchmarks/ground-truth/`](benchmarks/ground-truth/).
The sweep and its methodology live in [`benchmarks/README.md`](benchmarks/README.md);
the CLI (all from `src/`) is:

```
bun run bench:sample 150     # draw a labelling subset from the fixture
bun run bench:label          # auto-label it with a strong model (needs a key)
bun run bench:sweep          # run the grid, score vs labels → benchmarks/results/
bun run bench:chart          # render the tradeoff SVGs → benchmarks/charts/
bun run bench:report         # print the results table
```

`sample`, `chart`, and `report` run offline; `label` and `sweep` make live calls
and need the matching provider key.

## Iterate on the spec with WoZ and SCRIBE

WoZ (Wizard-of-Oz) and SCRIBE let you iterate TamedTable's behavior interactively without running the implementation. WoZ simulates what TamedTable would do from `spec/behavior.md` only; when WoZ reveals a gap or surprise, SCRIBE updates the spec.

In a fresh Claude Code session at the repo root:

```
claude
> @process/prompts/prompt-woz.md
```

That loads WoZ. Every message you type is independently classified by its first character — no persistent persona switching:

| Prefix | Persona | Use for |
|---|---|---|
| `> <note>` | SCRIBE | Spec edits: `> change the wording of :undo to …`, `> pin the page size at 20`. One-shot — the next message without a `>` prefix returns to WoZ automatically. |
| anything else | WoZ | Simulate the app's response from `spec/behavior.md`. |

Visual: WoZ output appears in fenced code blocks (terminal-shaped — that's the simulated TamedTable output). SCRIBE responses appear as markdown blockquotes (every line prefixed with `> `, mirroring your input prefix).

SCRIBE edits `spec/behavior.md` (almost always), `spec/code-contract.md` (only when the API surface changes), or any LLM prompt files the spec references (prompt tuning). It never touches `src/`, `process/journal/`, or `spec/test-cases/*.feature`.

## Known limitations

- **Re-recording cassettes is slow.** `bun run test` replays recorded responses in seconds, but `bun run test:record` makes a live API call per scenario — minutes, mostly the `TAMEDTABLE_RPM` throttle respecting the provider's rate ceiling. Re-record only when a prompt changes.
- **Golden-file fragility on LLM cells.** A few scenarios (e.g. `aggregate`) assert byte equality against a frozen JSONL golden. Models produce semantically-equivalent but not byte-identical outputs for ambiguous inputs (e.g. phone numbers without a country code), and a model's own minor revisions can shift the answer over time, so such tests are kept few and deliberate — tours assert robust properties instead. (The old byte-golden `datanorm.feature` was removed for exactly this brittleness; its behavior is covered by the clean-up / multilingual / loadsave tours.) Mismatches on LLM-driven cells aren't necessarily regressions — see the determinism note at the end of [spec/behavior.md → Headless](spec/behavior.md#headless).
- **Tabular formats: CSV, JSONL, Parquet, Arrow/Feather.** All load (local, URL, or sample) and all save — the web app saves in the format you opened, the CLI's `:save <name.ext>` writes (and converts to) any of them. Other DuckDB-readable formats and `.xlsx` are not yet wired into the open/save dispatch.
