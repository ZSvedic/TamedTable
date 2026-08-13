# Google vs Groq free tiers: which one a free user should actually pick

Puter gives a new user $0.25 of credit, and the OpenRouter `:free` models we
ship were measured slow back in July. So: do Google's and Groq's free tiers
give a free user better value? Both were researched on paper in the
[2026-07-17 free-provider research](2026-07-17-free-provider-research.md), and
neither was ever swept. This run sweeps both.

## Answer

**Google, and not by a small margin.** `gemini-2.5-flash-lite` at batch 20
scores 97%, the highest accuracy this benchmark has recorded from any model,
paid ones included, at $0.0043 per 120-row task. Groq's best is 93%, costs 44%
more per task, and its free tier cannot sustain the workload at all.

## Numbers

Groq, run against a genuine free-tier key at `TAMEDTABLE_RPM=5`
(run `free-groq` in `results/sweeps.csv`):

| Cell model | Batch | Accuracy | Cost | Time |
|---|---|---|---|---|
| `openai/gpt-oss-20b` | 10 | 90% | $0.0041 | 151s |
| `openai/gpt-oss-20b` | 20 | 90% | $0.0036 | 94s |
| `openai/gpt-oss-20b` | 40 | 61% | $0.0011 | 48s |
| `openai/gpt-oss-120b` | 10 | 93% | $0.0067 | 170s |
| `openai/gpt-oss-120b` | 20 | 93% | $0.0062 | 149s |
| `openai/gpt-oss-120b` | 40 | 90% | $0.0055 | 133s |

Google, at `TAMEDTABLE_RPM=10` to imitate free-tier throughput
(run `free-gemini` in `results/sweeps.csv`):

| Cell model | Batch | Accuracy | Cost | Time |
|---|---|---|---|---|
| `gemini-2.5-flash-lite` | 10 | 93% | $0.0090 | 70s |
| `gemini-2.5-flash-lite` | 20 | **97%** | $0.0043 | 51s |
| `gemini-2.5-flash-lite` | 40 | 94% | $0.0027 | 10s |
| `gemini-2.5-flash` | 10 | 93% | $0.0357 | 76s |
| `gemini-2.5-flash` | 20 | 93% | $0.0343 | 64s |
| `gemini-2.5-flash` | 40 | 94% | $0.0264 | 40s |

Both runs are throttled on purpose, so **read the times as a floor, not as
model speed**. What they do compare fairly is accuracy and cost.

## Why Groq's free tier does not work here

The binding limit is not the 1,000 requests a day. It is **8,000 tokens a
minute**, measured off the key's own `x-ratelimit-limit-tokens` header, and one
batch-10 cell call asks for around 6,700 of them. So roughly one call a minute
fits. `gpt-oss-120b` at batch 10 burned all seven of the engine's internal
retries and failed the config outright, twice, before a third attempt landed:

```
Rate limit reached … on tokens per minute (TPM): Limit 8000, Used 7383,
Requested 6726. Please try again in 45.8175s.
```

A free user meets this as errors, not as slowness. Per-model ceilings on the
same key, for the record: `gpt-oss-120b` and `gpt-oss-20b` 1,000 req/day and
8,000 tok/min; `llama-3.3-70b-versatile` 1,000 and 12,000;
`llama-3.1-8b-instant` 14,400 and 6,000.

The second Groq problem is `gpt-oss-20b` at batch 40: 61% accuracy off a single
call. It silently gave up on rows rather than failing.

## Corrections this run forces

1. **Groq is not "the fastest and cheapest here."** That claim, in the chooser
   copy and in the [2026-08-11 probe](2026-08-11-model-chooser-provider-probe.md),
   came from one ~1,000-token call priced against the catalogue as it then
   stood. Nobody had benchmarked `gemini-2.5-flash-lite`, which is cheaper per
   task ($0.0043 vs $0.0062) and more accurate. The speed half is neither
   confirmed nor refuted here, because every Groq timing in this run is
   throttle-bound.
2. **`gemini-3.1-flash-lite` is the wrong Gemini default.** It costs $0.0176
   per task against `gemini-2.5-flash-lite`'s $0.0043 for equal or better
   accuracy. On Puter's $0.25 that is the difference between ~14 tasks and ~58.
   Changing the catalogue defaults is left as its own change, so this run stays
   a measurement.
3. **Google's free-tier quotas are no longer documented per model.**
   `ai.google.dev/gemini-api/docs/rate-limits` now sends you to AI Studio for
   the numbers, so the per-model free limits cannot be cited from Google.
   Accuracy and cost above are tier-independent and were measured on a
   `standard`-tier key (`x-gemini-service-tier`), which is why the run imitates
   free throughput by throttling rather than by using a free key.

## Two repo bugs found on the way

- `process/proxy-fetch.ts` listed five provider hosts and neither
  `api.groq.com` nor `api.puter.com` — both providers postdate the shim. Every
  live Groq or Puter call from a proxied sandbox died with `ECONNRESET`, which
  reads like a network fault rather than a missing entry.
- `bench sweep` printed nothing and wrote nothing until the whole grid
  finished. On a free tier that is half an hour of silence, and one config
  failing at the end discarded every finished config with it. It now reports
  and persists per config.
- The Pareto frontier on the tradeoff chart was drawn upside down. SVG y grows
  downward, so the comparison that was meant to keep the best models kept the
  ones nothing else was worse than — the chart recommended the bottom envelope.
  Found while regenerating the charts for this run.

## Reproducing

```
TAMEDTABLE_RPM=5 bun --preload ../process/proxy-fetch.ts packages/bench/cli.ts \
  sweep --models=openai/gpt-oss-20b,openai/gpt-oss-120b --batches=10,20,40 \
  --retries=3 --primary=openai/gpt-oss-120b --out=free-groq

TAMEDTABLE_RPM=10 bun --preload ../process/proxy-fetch.ts packages/bench/cli.ts \
  sweep --models=gemini-2.5-flash-lite,gemini-2.5-flash --batches=10,20,40 \
  --retries=2 --primary=gemini-2.5-flash --out=free-gemini
```
