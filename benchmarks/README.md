# Benchmarks

Research data and outputs for choosing TamedTable's model hyperparameters:
which model each provider should use for the query (patch-turn) role and the
cell-update role, and what batch size trades speed, cost, and accuracy best.

This directory holds **data only** — pricing, ground truth, sweep results, and
generated charts. The runner is code, so it lives under `src/` where it can
import the engine: [`src/packages/bench/`](../src/packages/bench/) (`@tamedtable/bench`).
The runner reads the files here by plain path.

## Why a separate benchmark

The standalone [`bun run bench`](../README.md#performance-benchmark) measures one
config (time / tokens / cost). To pick "best value" and "good enough for cells"
you also need **accuracy** — otherwise bigger batches always win on cost and
speed, and the real tradeoff (accuracy degrading as more rows are packed per
call) never shows up. This benchmark adds that axis.

## Layout

| Path | What |
|---|---|
| `models.jsonl` | One row per model: pricing, context window, audio input, `runnable`. The benchmark's single source of cost — `@tamedtable/bench` loads it, and the `@perf` Cucumber flow prices through it too. The app's runtime catalogue (`src/packages/model-config/models.json`) is separate; a unit test asserts every shipped model has a row here. |
| `ground-truth/music-sample.csv` | A subset of the fixture the sweep runs over. |
| `ground-truth/music-labels.jsonl` | The gold `Music` verdict per `videoId`, scored against. |
| `results/*.jsonl` | Sweep outputs — one `SweepResult` per line. |
| `charts/*.svg` | Generated tradeoff charts. |

`models.jsonl` schema (per line):

```
{"id","name","provider","inUsdPerMtok","outUsdPerMtok","cacheWriteMult","cacheReadMult","contextWindow","maxOutput","audioInput","runnable","notes"}
```

`inUsdPerMtok` / `outUsdPerMtok` are USD per million tokens (Standard paid tier;
Cerebras rows are its free developer tier, so both are 0). `cacheWriteMult` /
`cacheReadMult` scale the input rate for cached tokens (1.25 / 0.1 on Anthropic;
providers with implicit caching use 1 / 0.1). A unit test asserts every shipped
catalogue model has a row here.

## The task

Group C's request — *"Add a boolean column Music that is true for music
videos"* — makes the cell model classify each row. Accuracy is the fraction of
labelled rows where the model's `Music` value matches the ground truth, compared
by `videoId`. The query (patch-turn) model just writes the "add column" edit; it
doesn't affect accuracy, so the sweep fixes it to the provider default and
varies the **cell model** and **batch size**.

## Running it

All commands run from `src/`. `sample`, `chart`, and `report` are offline;
`label` and `sweep` make live calls and need the matching provider key
(`ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` /
`OPENROUTER_API_KEY` / `CEREBRAS_API_KEY`).

```
bun run bench:sample 150     # draw ~150 rows from the fixture → ground-truth/music-sample.csv
bun run bench:label          # auto-label them with a strong model → music-labels.jsonl (spot-check!)
bun run bench:sweep          # run (models × batch sizes), score → results/sweep.jsonl
bun run bench:chart          # render charts/model-tradeoff.svg + charts/batch-<model>.svg
bun run bench:report         # print the results table
```

Defaults: cell models `claude-sonnet-4-5, claude-haiku-4-5, gemini-3.1-flash-lite,
gpt-5.4-mini`; batch sizes `1, 5, 10, 20, 40, 80`; labeller `claude-fable-5`.
Override with `--models=…`, `--batches=…`, `--out=name` on `sweep`.

## Free providers (Cerebras, OpenRouter)

Two free providers sit next to the paid three, both OpenAI-compatible, both $0
in `models.jsonl`. Cerebras is bench-only; OpenRouter graduated to the app's
fourth provider (its chooser card defaults to `cohere/north-mini-code:free`).

**Cerebras** ([cloud.cerebras.ai](https://cloud.cerebras.ai)) — `zai-glm-4.7`
(primary/patch role) and `gpt-oss-120b` (cell role). The highest free limits
(30 req/min, 14,400 req/day, ~1M tokens/day as of 2026-07): the only free tier
that fits both the full sweep (~170 calls per model) and real app use. Sign up
(no credit card), export `CEREBRAS_API_KEY`, then:

```
bun run bench:sweep --models=zai-glm-4.7,gpt-oss-120b --out=free-models
bun run bench:report free-models
```

**OpenRouter** ([openrouter.ai](https://openrouter.ai)) — one no-credit-card
signup unlocks ~25 `:free` models from many vendors; ids look like
`cohere/north-mini-code:free` (the pick for both roles — 96% cell accuracy at
batch 5 in the [2026-07-17 run](../process/journal/2026-07-17-free-model-benchmark-run.md),
and the app's OpenRouter default). The run overturned the on-paper picks:
`qwen/qwen3-coder:free` and `meta-llama/llama-3.3-70b-instruct:free` never
completed a call (single saturated host), and `tencent/hy3:free`, the best
performer, lost its free route on 2026-07-21. Three gotchas:

1. **Privacy toggle.** `:free` endpoints return 404 (`No endpoints found
   matching your data policy`) until the account's
   [privacy settings](https://openrouter.ai/settings/privacy) allow free model
   publication — free models may train on your prompts.
2. **20 req/min.** The engine's default is 40, so cap it with `TAMEDTABLE_RPM=20`.
3. **~50 req/day on a $0 account** (1,000/day after a one-time $10 credit
   purchase that never expires). The full grid won't fit in 50 — drop batch
   size 1 (alone 120 calls):

```
TAMEDTABLE_RPM=20 bun run bench:sweep \
  --models=cohere/north-mini-code:free \
  --batches=10,20,40,80 --out=free-openrouter
```

Caveat for both: free lineups rotate without notice (Cerebras went from ~12
free models to 2 in May 2026; OpenRouter `:free` models come and go weekly) —
if a model id 404s, check the provider's current list
([inference-docs.cerebras.ai](https://inference-docs.cerebras.ai),
[openrouter.ai/models](https://openrouter.ai/models)) and update
`models.jsonl` + the `providerFor` rules together.

## Ground truth

`bench label` uses a strong model (default `claude-fable-5`) as the labeller,
then **spot-check by hand** before trusting the labels. The committed
`music-sample.csv` / `music-labels.jsonl` is a 120-row set auto-labelled by
`gemini-2.5-pro` and hand spot-checked (47 music / 69 non-music), so the
pipeline runs offline out of the box; regenerate with `bench sample` +
`bench label`.

## Charts

Two views, both slices of the same `SweepResult[]`:

1. **`model-tradeoff.svg`** — accuracy (y) vs average cost per task (x), one
   point per cell model at a reference batch size. The Pareto view.
2. **`batch-<model>.svg`** — accuracy / cost / time vs batch size for one cell
   model. Small multiples; the knee is where accuracy starts to fall.

Colours are the Okabe-Ito colourblind-safe palette, keyed by provider.

## Results so far

Real runs committed in `results/phase2-all.jsonl` (the three paid providers,
six cell models × six batch sizes) and `results/free-openrouter.jsonl` (the
OpenRouter `:free` sweep — what the free batch charts render from). Findings +
per-config tables:
[`process/journal/2026-07-02-model-batch-sweep.md`](../process/journal/2026-07-02-model-batch-sweep.md)
and [`process/journal/2026-07-17-free-model-benchmark-run.md`](../process/journal/2026-07-17-free-model-benchmark-run.md).

- **Gemini** (3 cell models): accuracy flat 93–97% across every model and batch
  size, so `gemini-3.1-flash-lite` wins on value (~10× cheaper, same accuracy).
- **Anthropic**: `claude-sonnet-4-5` hits 95% but at ~3× flash-lite's cost;
  `claude-haiku-4-5` lands 88–94% at flash-lite prices.
- **OpenAI** (`gpt-5.4-mini`): 84–91% — cheapest overall but a few points behind
  Gemini (partly labeller affinity; the labels are from `gemini-2.5-pro`).
- **Batching ≥10** cuts cost/time sharply for free on every provider — the
  app's default batch of 20 is in the sweet spot.
