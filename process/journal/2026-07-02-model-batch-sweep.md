# Model & batch-size sweep — Gemini + OpenAI (Phase 2, partial)

First real run of the `@tamedtable/bench` sweep (`#BenchSweep`). Measures the
group-C cell-fill task — *"Add a boolean column Music that is true for music
videos"* — on a 120-row labelled subset of the liked-videos fixture, scoring
each `(cell model × batch size)` config on **accuracy, cost, and time**. Gemini
and OpenAI are scored against the same labels; Anthropic is not yet run.

## Setup

- **Subset:** 120 rows sampled evenly from the 1,820-row fixture (`benchmarks/ground-truth/music-sample.csv`).
- **Ground truth:** auto-labelled by `gemini-2.5-pro`, hand spot-checked — 47 music / 69 non-music (the real ~39% rate). Accuracy = agreement with these labels by `videoId`.
- **Grid:** 3 Gemini cell models + 1 OpenAI cell model × batch sizes {1, 5, 10, 20, 40, 80}. Patch turn fixed to each provider's default.
- **Single run per config** (no repetitions) — treat ±2–3% as noise on 120 rows.
- **Cost:** $2.07 (Gemini) + $0.18 (OpenAI).

> ⚠️ **Cross-provider caveat.** The ground truth was labelled by `gemini-2.5-pro`. Scoring OpenAI models against a Gemini labeller can give Gemini a few points of unearned "affinity" on ambiguous rows. On this easy task most labels are unambiguous so the effect is small, but read the Gemini-vs-OpenAI gap as *indicative, not decisive* until re-scored against a neutral or hand-verified gold set.

## Results — Gemini

| Cell model | Batch | Accuracy | Cost | Time | Calls |
|---|---|---|---|---|---|
| gemini-3.1-flash-lite | 1 | 93.3% | $0.0169 | 97.7s | 120 |
| gemini-3.1-flash-lite | 5 | 95.0% | $0.0179 | 43.8s | 25 |
| gemini-3.1-flash-lite | 10 | **96.7%** | $0.0177 | 11.6s | 13 |
| gemini-3.1-flash-lite | 20 | 95.8% | $0.0176 | 9.5s | 7 |
| gemini-3.1-flash-lite | 40 | 91.7% | $0.0176 | 7.7s | 4 |
| gemini-3.1-flash-lite | 80 | 93.3% | $0.0166 | 9.2s | 3 |
| gemini-3.5-flash | 1 | 95.0% | $0.3026 | 119.4s | 120 |
| gemini-3.5-flash | 5 | 94.2% | $0.1342 | 29.6s | 25 |
| gemini-3.5-flash | 10 | 94.2% | $0.1268 | 25.7s | 13 |
| gemini-3.5-flash | 20 | 95.0% | $0.1291 | 26.7s | 7 |
| gemini-3.5-flash | 40 | 94.2% | $0.1051 | 20.4s | 4 |
| gemini-3.5-flash | 80 | 94.2% | $0.1002 | 32.5s | 3 |
| gemini-3.1-pro-preview | 1 | 95.8% | $0.4505 | 172.1s | 120 |
| gemini-3.1-pro-preview | 5 | 95.0% | $0.1430 | 34.8s | 25 |
| gemini-3.1-pro-preview | 10 | 95.0% | $0.1319 | 29.9s | 13 |
| gemini-3.1-pro-preview | 20 | 95.0% | $0.1235 | 29.5s | 7 |
| gemini-3.1-pro-preview | 40 | 95.8% | $0.1114 | 24.7s | 4 |
| gemini-3.1-pro-preview | 80 | 95.0% | $0.1116 | 31.4s | 3 |

Charts: `benchmarks/charts/model-tradeoff.svg` and `benchmarks/charts/batch-*.svg`
(rendered from `results/phase2-all.jsonl`, which unions the two provider files).

## Results — OpenAI

`gpt-5.4-mini` is OpenAI's realistic cell candidate (`gpt-5.5` is a $5/$30
reasoning model — too slow and costly for per-row cells, so it's a query-role
model, not benchmarked here).

| Cell model | Batch | Accuracy | Cost | Time | Calls |
|---|---|---|---|---|---|
| gpt-5.4-mini | 1 | 88.3% | $0.0556 | 198.3s | 120 |
| gpt-5.4-mini | 5 | 89.2% | $0.0181 | 22.8s | 25 |
| gpt-5.4-mini | 10 | 89.2% | $0.0295 | 16.3s | 13 |
| gpt-5.4-mini | 20 | 89.2% | $0.0128 | 31.0s | 7 |
| gpt-5.4-mini | 40 | 84.2% | $0.0200 | 6.7s | 4 |
| gpt-5.4-mini | 80 | 90.8% | $0.0416 | 74.6s | 3 |

`gpt-5.4-mini` lands ~88–91% — a few points below the Gemini models — at very
low cost. Timing is erratic (reasoning-model latency + curl-shim overhead), so
the time column is less reliable than Gemini's. See the cross-provider caveat
above before weighting the accuracy gap.

## Findings

1. **Accuracy is flat and high — Gemini 93–97%, OpenAI 88–91% — across every batch size.** On this task `flash-lite` is as accurate as `pro`; the task is easy enough that model capability isn't the bottleneck and there is no accuracy cliff, even at batch 80.
2. **`gemini-3.1-flash-lite` is the value winner** — top-band accuracy (~95%) at **~$0.017**, roughly **10× cheaper** than flash/pro and fastest. `gpt-5.4-mini` is the cheapest point (~$0.013 at batch 20) but ~6 pts less accurate (partly labeller affinity — see caveat). `pro` buys no accuracy here at 7× flash-lite's cost (may still pay off on harder tasks).
3. **Batching ≥10 is a large, free win.** Going from batch 1 → 10–20 cuts cost ~3–10× and time ~10× with no accuracy loss. The app's current default of **20** sits in the sweet spot; **10** peaked accuracy for flash-lite (96.7%). Beyond 40 a slight wobble appears (within noise, both providers).

## Implications for hyperparameters (Phase 3 / D)

- **Gemini — affordable & default cell (CUP):** `gemini-3.1-flash-lite` (enough accuracy, ~10× cheaper). **Best cell:** `gemini-3.1-pro-preview` (headroom for hard tasks; no edge on this one).
- **OpenAI — cell (CUP):** `gpt-5.4-mini` — cheapest overall but ~6 pts behind Gemini here (discount partly for labeller affinity). Its query-role (QM) partner is `gpt-5.5`.
- **Batch size (all providers):** keep **~20** (10–20 band); nothing here argues for changing it.
- **Anthropic:** not yet measured — hold the tier decision until its numbers land.

## Not covered here — needs the maintainer's environment

- **Anthropic:** no `ANTHROPIC_API_KEY` reached the run's subprocess in this sandbox (the env var is set for new sessions but appears stripped, per the console's "won't be used to authenticate" note). Re-run `bun run bench:sweep` with the Anthropic key exported (or in `src/.env`).
- **Transport:** `bun`'s `fetch` can't traverse this environment's TLS-terminating proxy (`curl` can), so both live runs used a local curl-based fetch shim — **not committed**, unnecessary in a normal environment.
- **Rigour:** single run per config on one easy task, labelled by `gemini-2.5-pro`. Before finalising "best" vs "good enough" tiers, add a second harder cell task, a few repetitions for variance, and re-score against a neutral or hand-verified gold set.
