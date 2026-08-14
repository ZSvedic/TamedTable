# Benchmarks

This directory holds the data behind TamedTable's model choices: which model
each provider should run in the patch-turn and cell roles, and what batch size
trades speed, cost and accuracy best. It holds **data only**: pricing, ground
truth, results and charts. The runner is code, so it lives under `src/` where it
can import the engine: [`src/packages/bench/`](../src/packages/bench/).

The plain `bun run bench` measures one config's time, tokens and cost. This one
adds **accuracy**. Without that axis bigger batches always win, and the real
tradeoff never shows up: accuracy falls as more rows are packed into a call.

## Running it

All commands run from `src/`. `sample`, `chart` and `report` are offline;
`label` and `sweep` make live calls and need that provider's key.

```
bun run bench:sample 150   # draw ~150 rows from the fixture → ground-truth/music-sample.csv
bun run bench:label        # label them with a strong model → music-labels.jsonl (spot-check!)
bun run bench:sweep        # run models × batch sizes, score → results/sweeps.csv
bun run bench:chart        # render charts/*.svg and charts/explorer.html
bun run bench:report       # print the table (add a run name to print just one)
```

Defaults: cell models `claude-sonnet-4-5, claude-haiku-4-5,
gemini-3.1-flash-lite, gpt-5.4-mini`; batches `1, 5, 10, 20, 40, 80`; labeller
`claude-fable-5`. `sweep` takes `--models=`, `--batches=`, `--out=` (the run
name), `--retries=`, `--chat=` and `--tier=free|paid`.

## The task

Group C's request, *"Add a boolean column Music that is true for music
videos"*, makes the cell model classify every row. Accuracy is the fraction of
labelled rows whose `Music` value matches the ground truth, matched by
`videoId`. The patch-turn model only writes the "add column" edit and cannot
affect accuracy, so the sweep pins it and varies the cell model and batch size.

## Layout

| Path | What |
|---|---|
| `models.jsonl` | One row per model: pricing, context window, audio input, `runnable`. The single source of cost: the bench loads it, and the `@perf` Cucumber flow prices through it. A unit test asserts every shipped catalogue model has a row. |
| `results/sweeps.csv` | Every config ever run, one row each. |
| `ground-truth/music-sample.csv` | The fixture subset the sweep runs over. |
| `ground-truth/music-labels.jsonl` | The gold `Music` verdict per `videoId`. |
| `charts/*.svg` | Generated charts. |
| `charts/explorer.html` | The same data with filters and sorting, in one file. |

`models.jsonl`, one JSON object per line:

```
{"id","name","provider","inUsdPerMtok","outUsdPerMtok","cacheWriteMult",
 "cacheReadMult","contextWindow","maxOutput","audioInput","runnable","notes"}
```

Rates are USD per million tokens at the paid tier; the cache multipliers scale
the input rate for cached tokens (1.25 / 0.1 on Anthropic, 1 / 0.1 where caching
is implicit). Cerebras rows are 0, because that tier is free outright.

## The results table

Every run appends to `results/sweeps.csv` under the name `--out` gave it;
re-running a name replaces its rows rather than doubling them. Open it in a
spreadsheet, or open `charts/explorer.html` and filter there.

Two columns exist to make filtering work, and they differ:

- **`tier`** is what this run cost: `free` on a free tier, `paid` otherwise.
- **`freeTier`** is whether a user with no money can reach that model at all.

The Gemini rows are `paid` and `freeTier: yes`, because they were billed on a
paid key but Google serves those same models free under a quota. Costs are
always priced at the paid rates, including for free runs, so the column stays
comparable across providers.

## Charts

Accuracy is plotted on a **log scale of the error rate**, identical on every
chart. Results cluster between 88% and 97%, where a linear axis stacks them on
one line and hides the thing that matters: 93% to 97% is more than halving the
mistakes. Every point also carries its own number, so nothing has to be read off
a pixel position. Colours are Okabe-Ito, keyed by provider.

- **`tradeoff-paid-cost.svg`**: paid models, accuracy vs cost.
- **`tradeoff-paid-time.svg`**: paid models, accuracy vs time.
- **`tradeoff-free-time.svg`**: free-tier models, accuracy vs time. Cost is
  zero for all of them, so time is the only axis left.
- **`batch-<model>.svg`**: accuracy, cost and time vs batch size for one model.
  The knee is where accuracy starts to fall.

The dashed line on the tradeoff charts is the Pareto frontier: the models
nothing else beats on both axes at once.

## Ground truth

`bench label` runs a strong model at batch size 1 and keeps its verdicts, so
**spot-check by hand before trusting them**. The committed set is 120 rows
labelled by `gemini-2.5-pro` and checked (47 music, 69 not), which is why the
pipeline runs offline out of the box.

## Free tiers

Four providers give something away, and they are not the same shape. Cerebras is
free-only and bench-only. OpenRouter's `:free` models are free-only but it is a
full app provider. Google and Groq bill by default and serve the same models
free under a quota.

**Pick Google.** The
[2026-08-12 run](../process/journal/2026-08-12-google-groq-free-tier-benchmark.md)
swept both: `gemini-2.5-flash-lite` at batch 20 scores 97%, the best accuracy in
this benchmark from any model at any price, for $0.0043 a task. Groq's best is
`openai/gpt-oss-120b` at 93% and $0.0062.

Gotchas, per provider:

- **Groq**: limited by *tokens per minute* (8,000), not requests per day, and
  one batch-10 cell call asks for ~6,700. The engine burns its seven internal
  retries and the config fails. Sweep at `TAMEDTABLE_RPM=5` and expect re-runs.
- **OpenRouter**: 20 req/min, ~50 req/day on a $0 account (1,000 after a
  one-time $10 top-up), so the full grid does not fit; drop batch size 1, which
  costs 120 calls by itself. `:free` endpoints 404 until
  [privacy settings](https://openrouter.ai/settings/privacy) allow free-model
  publication, which means letting them train on your prompts. Free models also
  return the patch-turn tool call as plain text now and then, so pass
  `--retries=5` and point `--chat` at the cell model itself.
- **Cerebras**: the highest free limits anywhere (30 req/min, 14,400 req/day,
  ~1M tokens/day), the only tier that fits a full sweep. Bench-only.
- **All of them**: free lineups rotate without notice. Cerebras went from ~12
  free models to 2 in May 2026; `tencent/hy3:free` was the best OpenRouter
  performer until it lost its free route four days after we measured it. When an
  id 404s, check the provider's current list and update `models.jsonl` and the
  `providerFor` rules together.

Times from a free-tier run are throttled on purpose to imitate free throughput,
so read them as a floor rather than as model speed. Accuracy and cost compare
fairly.

**From a proxied sandbox** (Claude Code on the web), bun's `fetch` cannot tunnel
TLS through the CONNECT proxy: every call dies with *"The socket connection was
closed unexpectedly"*. Prepend the
[`process/proxy-fetch.ts`](../process/proxy-fetch.ts) shim, which routes provider
calls through `curl`. A machine with direct egress needs none of it.

```
TAMEDTABLE_RPM=20 bun --preload ../process/proxy-fetch.ts \
  packages/bench/cli.ts sweep --models=… --batches=10,20,40 --retries=5 --out=name
```

## What the runs have shown

| Run | Date | Finding | Journal |
|---|---|---|---|
| `phase2-all` | 2026-07-02 | Gemini flat at 93–97% across models and batches; `claude-sonnet-4-5` 95% at ~3× the cost; `gpt-5.4-mini` 84–91%. Batching ≥10 cuts cost and time for free. | [entry](../process/journal/2026-07-02-model-batch-sweep.md) |
| `free-openrouter` | 2026-07-17 | `cohere/north-mini-code:free` 96% at batch 5, collapsing past 40. Two on-paper picks never completed a call. | [entry](../process/journal/2026-07-17-free-model-benchmark-run.md) |
| `gemini-new-flash` | 2026-07-22 | No accuracy gain from 3.6 Flash or 3.5 Flash-Lite over the lineup. | [entry](../process/journal/2026-07-22-gemini-new-flash-benchmark.md) |
| `free-groq`, `free-gemini` | 2026-08-12 | `gemini-2.5-flash-lite` wins outright: 97% at $0.0043, against `gemini-3.1-flash-lite`'s 96% at $0.0176. Groq is cheapest per token, not per task. | [entry](../process/journal/2026-08-12-google-groq-free-tier-benchmark.md) |

The standing recommendation is `gemini-2.5-flash-lite` at batch 20 for the cell
role. The app still defaults to `gemini-3.1-flash-lite`, which this data says is
4× dearer for no accuracy gain.
