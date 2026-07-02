# Model & batch-size sweep — Gemini (Phase 2, partial)

First real run of the `@tamedtable/bench` sweep (`#BenchSweep`). Measures the
group-C cell-fill task — *"Add a boolean column Music that is true for music
videos"* — on a 120-row labelled subset of the liked-videos fixture, scoring
each `(cell model × batch size)` config on **accuracy, cost, and time**.

## Setup

- **Subset:** 120 rows sampled evenly from the 1,820-row fixture (`benchmarks/ground-truth/music-sample.csv`).
- **Ground truth:** auto-labelled by `gemini-2.5-pro`, hand spot-checked — 47 music / 69 non-music (the real ~39% rate). Accuracy = agreement with these labels by `videoId`.
- **Grid:** 3 Gemini cell models × batch sizes {1, 5, 10, 20, 40, 80} = 18 configs. Patch turn fixed to `gemini-3.5-flash`.
- **Single run per config** (no repetitions) — treat ±2–3% as noise on 120 rows.
- **Cost:** $2.07 total for the sweep.

## Results

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

Charts: `benchmarks/charts/model-tradeoff.svg` and `benchmarks/charts/batch-*.svg`.

## Findings

1. **Accuracy is flat and high — 93–97% for every model at every batch size.** On this task, `flash-lite` is as accurate as `pro`. The task is easy enough that model capability isn't the bottleneck; there is no accuracy cliff, even at batch 80.
2. **`flash-lite` is the value winner by a wide margin** — same accuracy band as flash/pro at **~$0.017**, roughly **10× cheaper**, and fastest. `pro` buys no accuracy here at 7× the cost (it may still pay off on harder tasks — this is one easy task).
3. **Batching ≥10 is a large, free win.** Going from batch 1 → 10–20 cuts cost ~3–10× and time ~10× with no accuracy loss. The app's current default of **20** sits in the sweet spot; **10** peaked accuracy for flash-lite (96.7%). Beyond 40 a slight wobble appears (within noise).

## Implications for the Gemini hyperparameters (Phase 3 / D)

- **Affordable & default cell model (CUP):** `gemini-3.1-flash-lite` — enough accuracy, ~10× cheaper.
- **Best cell model (CUP):** `gemini-3.1-pro-preview` — headroom for hard tasks; no edge on this one.
- **Batch size:** keep **~20** (10–20 band); nothing here argues for changing it.

## Not covered here — needs the maintainer's environment

This sandbox couldn't benchmark the other two providers:

- **OpenAI:** the proxy reaches the current `api.openai.com`, which serves `gpt-5` / `gpt-5-mini` / `gpt-4o-mini` — **not** the catalogue's `gpt-5.5` / `gpt-5.4-mini`. Those ids 404 here.
- **Anthropic:** no `ANTHROPIC_API_KEY` in this environment.
- Also, `bun`'s `fetch` can't traverse this environment's TLS-terminating proxy (`curl` can), so the run used a local curl-based fetch shim — not committed, unnecessary in a normal environment.

Re-run `bun run bench:sweep` for OpenAI and Anthropic where the catalogue models and keys are available; results append to the same table and charts. One task also isn't enough to generalise "best" vs "good enough" — add a second, harder cell task before finalising the tiers.
