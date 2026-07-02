# Model & batch-size sweep — Gemini + OpenAI + Anthropic (Phase 2, complete)

First real run of the `@tamedtable/bench` sweep (`#BenchSweep`). Measures the
group-C cell-fill task — *"Add a boolean column Music that is true for music
videos"* — on a 120-row labelled subset of the liked-videos fixture, scoring
each `(cell model × batch size)` config on **accuracy, cost, and time**. All
three providers are scored against the same labels. (`claude-opus-4-8` was
skipped — too expensive for a per-row cell model.)

## Setup

- **Subset:** 120 rows sampled evenly from the 1,820-row fixture (`benchmarks/ground-truth/music-sample.csv`).
- **Ground truth:** auto-labelled by `gemini-2.5-pro`, hand spot-checked — 47 music / 69 non-music (the real ~39% rate). Accuracy = agreement with these labels by `videoId`.
- **Grid:** 3 Gemini + 1 OpenAI + 2 Anthropic cell models × batch sizes {1, 5, 10, 20, 40, 80}. Patch turn fixed to each provider's default.
- **Single run per config** (no repetitions) — treat ±2–3% as noise on 120 rows.
- **Cost:** $2.07 (Gemini) + $0.18 (OpenAI) + $0.38 (Anthropic).

> ⚠️ **Cross-provider caveat.** The ground truth was labelled by `gemini-2.5-pro`. Scoring OpenAI and Anthropic models against a Gemini labeller can give Gemini a few points of unearned "affinity" on ambiguous rows. On this easy task most labels are unambiguous so the effect is small, but read the cross-provider accuracy gaps as *indicative, not decisive* until re-scored against a neutral or hand-verified gold set.

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
(rendered from `results/phase2-all.jsonl`, which unions all three provider files).

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

## Results — Anthropic

`claude-sonnet-4-5` and `claude-haiku-4-5` are the realistic cell candidates.
`claude-opus-4-8` was skipped — a premium model too costly for a per-row cell
role.

| Cell model | Batch | Accuracy | Cost | Time | Calls |
|---|---|---|---|---|---|
| claude-sonnet-4-5 | 1 | 91.7% | $0.0509 | 152.2s | 120 |
| claude-sonnet-4-5 | 5 | 93.3% | $0.0473 | 58.1s | 25 |
| claude-sonnet-4-5 | 10 | 95.0% | $0.0423 | 15.3s | 13 |
| claude-sonnet-4-5 | 20 | 95.0% | $0.0489 | 23.8s | 7 |
| claude-sonnet-4-5 | 40 | 94.2% | $0.0474 | 6.9s | 4 |
| claude-sonnet-4-5 | 80 | 95.0% | $0.0482 | 9.6s | 3 |
| claude-haiku-4-5 | 1 | 91.7% | $0.0152 | 175.2s | 120 |
| claude-haiku-4-5 | 5 | 89.2% | $0.0174 | 43.4s | 30 |
| claude-haiku-4-5 | 10 | 90.8% | $0.0155 | 26.8s | 13 |
| claude-haiku-4-5 | 20 | 87.5% | $0.0150 | 6.9s | 7 |
| claude-haiku-4-5 | 40 | 94.2% | $0.0151 | 5.2s | 4 |
| claude-haiku-4-5 | 80 | 93.3% | $0.0159 | 5.9s | 3 |

`claude-sonnet-4-5` sits in the Gemini band (~92–95%) at ~$0.045 — roughly 3×
`gemini-3.1-flash-lite` but a third of `gemini-3.5-flash`/`pro`. `claude-haiku-4-5`
is the cheapest Anthropic point (~$0.015, on par with flash-lite) and lands
~88–94%, wobblier across batch sizes but recovering at 40–80. Both scored
against the same Gemini-labelled gold set — see the cross-provider caveat.

## Findings

1. **Accuracy is flat and high — Gemini 93–97%, Anthropic 88–95%, OpenAI 88–91% — across every batch size.** On this task `flash-lite` is as accurate as `pro`; the task is easy enough that model capability isn't the bottleneck and there is no accuracy cliff, even at batch 80. All three providers land in a tight ~88–97% band.
2. **`gemini-3.1-flash-lite` is the value winner** — top-band accuracy (~95%) at **~$0.017**, roughly **10× cheaper** than flash/pro and fastest. `claude-haiku-4-5` (~$0.015) and `gpt-5.4-mini` (~$0.013 at batch 20) match it on cost but land a few points lower in accuracy (partly labeller affinity — see caveat). `claude-sonnet-4-5` reaches the Gemini band (~95%) at ~$0.045. `pro` buys no accuracy here at 7× flash-lite's cost (may still pay off on harder tasks).
3. **Batching ≥10 is a large, free win.** Going from batch 1 → 10–20 cuts cost ~3–10× and time ~10× with no accuracy loss. The app's current default of **20** sits in the sweet spot; **10** peaked accuracy for flash-lite (96.7%). Beyond 40 a slight wobble appears (within noise, all providers) — `claude-haiku-4-5` dips to 87.5% at batch 20 then recovers to 94% at 40.

## Implications for hyperparameters (Phase 3 / D)

- **Gemini — affordable & default cell (CUP):** `gemini-3.1-flash-lite` (enough accuracy, ~10× cheaper). **Best cell:** `gemini-3.1-pro-preview` (headroom for hard tasks; no edge on this one).
- **OpenAI — cell (CUP):** `gpt-5.4-mini` — cheapest overall but ~6 pts behind Gemini here (discount partly for labeller affinity). Its query-role (QM) partner is `gpt-5.5`.
- **Anthropic — cell (CUP):** `claude-haiku-4-5` — cheapest Anthropic option (~$0.015, flash-lite-class cost) at ~88–94%. **Best cell:** `claude-sonnet-4-5` — Gemini-band accuracy (~95%) at ~$0.045, when a stronger model is warranted. `claude-opus-4-8` skipped as too expensive for a cell role.
- **Batch size (all providers):** keep **~20** (10–20 band); nothing here argues for changing it.

## Not covered here — needs the maintainer's environment

- **Transport:** `bun`'s `fetch` can't traverse this environment's TLS-terminating proxy (`curl` can), so the live runs used a local curl-based fetch shim — **not committed**, unnecessary in a normal environment.
- **Rigour:** single run per config on one easy task, labelled by `gemini-2.5-pro`. Before finalising "best" vs "good enough" tiers, add a second harder cell task, a few repetitions for variance, and re-score against a neutral or hand-verified gold set.
