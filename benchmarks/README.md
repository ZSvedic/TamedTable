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
| `models.jsonl` | One row per model: pricing, context window, audio input, `runnable`. The single source of cost — `@tamedtable/bench` loads it, and the `@perf` Cucumber flow prices through it too. |
| `ground-truth/music-sample.csv` | A subset of the fixture the sweep runs over. |
| `ground-truth/music-labels.jsonl` | The gold `Music` verdict per `videoId`, scored against. |
| `results/*.jsonl` | Sweep outputs — one `SweepResult` per line. |
| `charts/*.svg` | Generated tradeoff charts. |

`models.jsonl` schema (per line):

```
{"id","name","provider","inUsdPerMtok","outUsdPerMtok","cacheWriteMult","cacheReadMult","contextWindow","maxOutput","audioInput","runnable","notes"}
```

`inUsdPerMtok` / `outUsdPerMtok` are USD per million tokens (Standard paid tier).
`cacheWriteMult` / `cacheReadMult` scale the input rate for cached tokens (1.25 /
0.1 on Anthropic; providers with implicit caching use 1 / 0.1). A unit test
asserts every shipped catalogue model has a row here.

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
(`ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY`).

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

## Ground truth

`bench label` uses a strong model (Fable 5) as the labeller, then **spot-check by
hand** before trusting the labels. The committed `music-sample.csv` /
`music-labels.jsonl` is a small (24-row, balanced) hand-verified set so the
pipeline runs offline out of the box; regenerate a larger auto-labelled set with
`bench sample` + `bench label`.

## Charts

Two views, both slices of the same `SweepResult[]`:

1. **`model-tradeoff.svg`** — accuracy (y) vs average cost per task (x), one
   point per cell model at a reference batch size. The Pareto view.
2. **`batch-<model>.svg`** — accuracy / cost / time vs batch size for one cell
   model. Small multiples; the knee is where accuracy starts to fall.

Colours are the Okabe-Ito colourblind-safe palette, keyed by provider.

## Results so far

Real runs committed: `results/phase2-gemini.jsonl`, `results/phase2-openai.jsonl`,
their union `results/phase2-all.jsonl` (what the charts render from), and the
charts. Findings + per-config tables:
[`process/journal/2026-07-02-model-batch-sweep.md`](../process/journal/2026-07-02-model-batch-sweep.md).

- **Gemini** (3 cell models): accuracy flat 93–97% across every model and batch
  size, so `gemini-3.1-flash-lite` wins on value (~10× cheaper, same accuracy).
- **OpenAI** (`gpt-5.4-mini`): 88–91% — cheapest overall but a few points behind
  Gemini (partly labeller affinity; the labels are from `gemini-2.5-pro`).
- **Batching ≥10** cuts cost/time sharply for free on both — the app's default
  batch of 20 is in the sweet spot.
- **Anthropic** — not yet run (no key reached the run's subprocess in the build
  sandbox). Re-run `bun run bench:sweep` with `ANTHROPIC_API_KEY` exported;
  results append to the same tables and charts.
