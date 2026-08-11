TamedTable is an AI ETL tool driven by natural language. Load a CSV, type *"normalize phone numbers"* or say *"drop duplicate emails,"* and the LLM writes a JSON spec that changes the data. Think of TamedTable as an [LLM harness](https://martinfowler.com/articles/harness-engineering.html) for data [ETL](https://en.wikipedia.org/wiki/Extract,_transform,_load). 

## Links
- Website: [www.TamedTable.com](https://www.TamedTable.com), shows major features. 
- Live app: [Run directly in the browser](https://www.tamedtable.com/app/), no install needed. 
- Video: 20-second demo below shows how to normalize phone numbers in plain language.

https://github.com/user-attachments/assets/1bb6857c-32d9-4ff1-9eda-2857b06cd08f

## Spec/Behavior/Test-Driven Development

This project is an example of SDD/BDD/TDD AI development:

- [SDD](https://en.wikipedia.org/wiki/Specification-driven_development): The spec is the source of truth; the code follows it. Files in `spec/` are
human-blessed: [behavior.md](spec/behavior.md) says what the
system does in plain English; its twin [code-contract.md](spec/code-contract.md)
carries the matching types and signatures. The implementation in `src/` is
downstream. Its `packages/` and `tests/` subdirs are regenerable from the
spec; the spec is not regenerable from anything.

- [BDD](https://en.wikipedia.org/wiki/Behaviour-driven_development): The Gherkin scenarios in
[spec/test-cases/](spec/test-cases/) prove one behavior against all three app
surfaces (CLI, headless, web) at once. How the Gherkin suite is organized and kept
small is in [spec/test-conventions.md](spec/test-conventions.md).

- [TDD](https://en.wikipedia.org/wiki/Test-driven_development): The suite goes red before the implementation moves and green before commit (steps 3–4 below). The AI generates the step definitions from the Gherkin. The loop stays fast because every model response is recorded once and replayed offline from `cassettes/`.

A behavior change moves outside-in, spec first:

1. Update [spec/behavior.md](spec/behavior.md) and
   [spec/code-contract.md](spec/code-contract.md).
2. Add or update the Gherkin scenario in [spec/test-cases/](spec/test-cases/).
3. Write the step definitions in `src/tests/` and run the suite — the new
   behavior is *red*.
4. Implement in `src/packages/` until the suite is *green*.

## Project layout

This repository is organized by *lifecycle*:

```
TamedTable/                  Root: README.md, MAP.md (feature+code navigation), LICENSE, .gitignore, etc.
├── benchmarks/              Model & batch-size benchmark data + outputs (no code, runner is @tamedtable/bench).
│   ├── models.jsonl         The benchmark's model pricing/specs (the app's catalogue is model-config's models.json).
│   ├── ground-truth/        Labelled subset the sweep scores against (music-sample.csv + music-labels.jsonl).
│   ├── results/             Sweep outputs (JSONL).
│   └── charts/              Generated SVG tradeoff charts.
├── cassettes/               Recorded LLM responses the test suite replays — committed data, one JSON per feature.
├── marketing/               Everything the public sees + the shared design base.
│   ├── tokens.json          Design token master: colors, typography, spacing.
│   ├── brand/               Marks, favicons, lockups, brand.md.
│   ├── icons/               UI icon glyphs, one 16×16 SVG per name. Source of ui-kit's generated icons.ts.
│   ├── claude-design-app/   Claude Design canvas (scratch JSX + generated tokens.jsx).
│   ├── illustrations/       SVG feature tiles + gallery.
│   └── web/                 The landing page that ships to the site root.
├── process/                 How the project is built; never deployed.
│   ├── journal/             Historic status reports.
│   ├── prompts/             Reusable session starters — see AGENTS.md.
│   └── repo-tracking/       Commit-size script + chart generator.
├── spec/                    The contract: human-authored / human-blessed.
│   ├── README.md            Spec index + test-fixture naming.
│   ├── rationale.md         What and why of TamedTable.
│   ├── behavior.md          What the user sees + what the system does (API-free).
│   ├── code-contract.md     API: types, signatures, libraries, env vars, exit codes, etc.
│   ├── prompt-app-edit.md   The LLM prompts (imported by the runtime at init).
│   ├── writing-style.md     Writing style for every markdown file in the repo.
│   ├── test-conventions.md  How the Gherkin suite is organized and kept small.
│   ├── packages/            Per-package specs — mirrors src/packages/; rules in its README.md.
│   └── test-cases/          Gherkin features and `*-input`/`*-expected`/`*.flow` fixtures.
├── src/                     The implementation. Self-contained, deployable unit.
│   ├── package.json, …      Build config; run every bun command from here.
│   ├── node_modules/        Git-ignored.
│   ├── packages/            App (core/headless/cli/web) + library packages. Regenerable from spec/.
│   └── tests/               App step definitions. Regenerable from Gherkin.
└── temp/                    Scratch: test outputs, charts, logs. Gitignored.
```

## Setup

You need [bun](https://bun.sh) and an API key from any provider — Google, Anthropic, OpenAI, Groq, OpenRouter, or a Puter.js token.

1. Install the project's libraries — a one-time step you repeat only if the
   dependencies change:
   ```
   cd src && bun install
   ```
2. Put your provider's API key in a `.env` file at the repo root (the loader walks up from `src/` to find it). Use the variable that matches your provider:
   ```
   GEMINI_API_KEY=...                # Google Gemini
   ANTHROPIC_API_KEY=sk-ant-...      # Anthropic
   OPENAI_API_KEY=sk-...             # OpenAI
   GROQ_API_KEY=gsk_...              # Groq
   OPENROUTER_API_KEY=sk-or-...      # OpenRouter
   PUTER_TOKEN=eyJ...                # Puter.js (localStorage "puter.auth.token.v2")
   ```
   The runtime picks the provider from the model id (`TAMEDTABLE_MODEL` below), so set the model to one from your provider unless you use the default Gemini model.

Optional env vars and defaults if you omit them:

| Var | Default | What it does |
|---|---|---|
| `TAMEDTABLE_MODEL` | `gemini-3.6-flash` | Model that writes the spec patch each turn. Its id also selects the provider — e.g. `claude-sonnet-4-6` (Anthropic) or `gpt-5.5` (OpenAI) — so it must match the key you set above. |
| `TAMEDTABLE_CELL_MODEL` | `gemini-3.1-flash-lite` | Secondary model that fills in per-row LLM cells. Must share the primary model's provider. |
| `TAMEDTABLE_RPM` | `40` | Per-process request-per-minute cap. Keep it under your provider account's rate limit. |
| `TAMEDTABLE_BATCH_SIZE` | `20` | Rows packed into a single LLM request. The model replies with a JSON array; on a parse failure the runner falls back to per-row calls for that batch. Set to `1` to disable batching. |
| `TAMEDTABLE_CHUNK_SIZE` | `5` | LLM requests that fire concurrently. Orthogonal to batch size — total parallel rows = batch × chunk. |
| `TAMEDTABLE_DEBUG` | `on` | On by default — the REPL prints a per-turn debug block after every request: executed expressions on success, per-turn detail on failure (indented, dimmed, capped at 20 lines). Set to `0`, `false`, or `off` to disable. |

### Running behind an HTTPS proxy (sandboxes)

Bun's built-in `fetch` can't tunnel TLS through a CONNECT proxy — the kind
Claude Code on the web puts in front of outbound traffic. Every LLM call then
fails with *"The socket connection was closed unexpectedly."* Prepend the
[`process/proxy-fetch.ts`](process/proxy-fetch.ts) shim, which routes provider
calls through `curl` (it honours the proxy) and is a no-op when no proxy is set:

```
cd src
bun --preload ../process/proxy-fetch.ts packages/cli/index.ts …   # the CLI
bun --preload ../process/proxy-fetch.ts packages/bench/cli.ts sweep …  # the benchmark
```

It covers the CLI and the benchmark — both make live calls through bun. The web
app runs in a browser and needs nothing. A machine with direct internet needs
nothing either.

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
bun src/packages/cli/index.ts execute spec/test-cases/cleanup.flow --input spec/test-cases/customers-input.csv --output temp/out.jsonl
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

Once the page loads, click **Settings** and paste an API key from any supported provider. The web UI reads the key from a per-tab settings panel, not from `.env`. The Settings panel also picks which model drives requests, and the chosen model selects the provider. The table shows one page at a time. A page is sized to one AI-cell concurrency wave (100 rows by default), with a pager along the bottom. While a request runs, cells stream in wave by wave and progress reports inline in the chat.

There is no server: the web UI calls your chosen provider directly from the browser through the same SDK the CLI uses. File input/output uses the File System Access API where the browser supports it, with a download/upload fallback elsewhere.

## Run the tests

Everything runs from `src/` — `cd src` first. First time on a machine, run `bun run setup` once. It installs the libraries *and* the headless Chromium that the `@web` profile and `test:smoke` drive. One tool comes from outside bun: the `@cli` profile runs the exported Python script through [uv](https://docs.astral.sh/uv/getting-started/installation/), so uv must be on PATH (CI installs it with `astral-sh/setup-uv`). On Windows, the browser-driven tests (`test:web`'s demo scenarios and `test:smoke`) cannot run under bun ([bun#27977](https://github.com/oven-sh/bun/issues/27977)); the Playwright e2e layer runs under Node and is unaffected.

| Command | Runs |
|---|---|
| `bun run test` | All tests — the bun unit tests plus all three Cucumber profiles. Offline, no API key. |
| `bun run test:unit` / `test:headless` / `test:cli` / `test:web` | One slice of the above: the bun unit tests, or one Cucumber profile. `test:web` drives the demos in headless Chromium (installed by `bun run setup`). |
| `bun run test:smoke` | The module-demo smoke test: builds each demo with the deploy workflow's flags and drives it in headless Chromium. Not part of `bun run test`. |
| `bun run test:record` | Re-records all cassettes (see below) against the live Gemini API — headless, CLI, and web profiles. |
| `bun run rerecord <feature>` | Deletes `cassettes/<feature>.json`, then records that one feature across all profiles — the recovery from a flaky recording. |
| `bun run typecheck` | Type-check only — `tsc --noEmit` for the engine packages and the web package. |

Run one feature with `TAMEDTABLE_FEATURES`, e.g. `TAMEDTABLE_FEATURES=validate bun run test`. Run a single unit test with bun's path and name filters, e.g. `bun test packages/cli -t handleColonCommand`.

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

Every cassette records with the Gemini provider defaults: `gemini-3.6-flash` for the spec-patch turn, `gemini-3.1-flash-lite` for per-row cells. `test:record` covers every model-calling profile — headless, CLI, and web.

If one feature's recording comes out flaky (an invalid patch, an unfiltered result), don't just rerun it: record mode returns cached entries, so a bad response is frozen once written. Run `bun run rerecord <feature>` — it deletes that feature's cassette first, then records it fresh across all profiles. And when a fresh recording disagrees with a committed golden, verify the correct value against independent truth before fixing either side — see [spec/code-contract.md](spec/code-contract.md) § Recording model calls for tests.

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
provider other than the committed Gemini cassette, with that provider's key
in `.env` (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, or
`OPENROUTER_API_KEY`):

```
# Gemini: stronger model for the patch turn, cheapest for the cells
TAMEDTABLE_MODEL=gemini-3.6-flash TAMEDTABLE_CELL_MODEL=gemini-3.1-flash-lite bun run bench:live

# OpenAI
TAMEDTABLE_MODEL=gpt-5.5 TAMEDTABLE_CELL_MODEL=gpt-5.4-mini bun run bench:live
```

`bun run bench` (offline) only covers the committed Gemini cassette; any other
combination needs an online run. 

### Cost accounting and results

Cost is each call's token usage priced at the published per-model rates in
[`benchmarks/models.jsonl`](benchmarks/models.jsonl) — the benchmark's single
source of pricing/specs, loaded through `@tamedtable/bench`. (The app ships a
separate runtime catalogue, `src/packages/model-config/models.json`, which
lists only the shipped models; a unit test keeps the two in sync.) Anthropic figures come from
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

## Known limitations

- **Re-recording cassettes is slow.** `bun run test` replays recorded responses in seconds, but `bun run test:record` makes a live API call per scenario — minutes, mostly the `TAMEDTABLE_RPM` throttle respecting the provider's rate ceiling. Re-record only when a prompt changes.
- **Golden-file fragility on LLM cells.** A few scenarios (e.g. `aggregate`) assert byte equality against a frozen JSONL golden. Models produce semantically-equivalent but not byte-identical outputs for ambiguous inputs (e.g. phone numbers without a country code), and a model's own minor revisions can shift the answer over time, so such tests are kept few and deliberate — tours assert robust properties instead.  Mismatches on LLM-driven cells aren't necessarily regressions, see the determinism note at the end of [spec/behavior.md → Headless](spec/behavior.md#headless).
- **Tabular formats: CSV, JSONL, Parquet, Arrow/Feather.** All load (local, URL, or sample) and all save — the web app saves in the format you opened, the CLI's `:save <name.ext>` writes (and converts to) any of them. Other DuckDB-readable formats and `.xlsx` are not yet wired into the open/save dispatch.

## License

[Business Source License 1.1](LICENSE) (BUSL) — the source is public and free
to use, modify, self-host, and redistribute; selling TamedTable itself as a
product or hosted service needs a commercial license from the author. Each
release converts to MIT four years after it ships. The
[FAQ](https://www.tamedtable.com/FAQ#busl) explains the choice.
