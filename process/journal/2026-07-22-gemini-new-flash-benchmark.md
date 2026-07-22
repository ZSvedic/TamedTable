# Gemini 3.6 Flash + 3.5 Flash-Lite benchmark

Google released `gemini-3.6-flash` and `gemini-3.5-flash-lite` this week. This
run puts both through the `#BenchSweep` cell-fill benchmark to decide whether
either should replace the app's Gemini defaults (`gemini-3.5-flash` primary,
`gemini-3.1-flash-lite` cell). Verdict up front: **keep the cell default, move
the primary to 3.6 Flash when convenient** — it matches 3.5 Flash's accuracy at
a 17% lower output price.

## Setup

Same harness as the [2026-07-02 sweep](2026-07-02-model-batch-sweep.md): the
120-row labelled music subset, batch sizes {1, 5, 10, 20, 40, 80}, accuracy
scored against the committed `gemini-2.5-pro` labels. Single run per config —
±2–3% is noise. Results in `benchmarks/results/gemini-new-flash.jsonl`;
run cost $0.86 plus a $0.11 smoke test.

Pricing (Standard paid tier, USD/Mtok, from the Gemini pricing page):

| Model | In | Out | vs incumbent |
|---|---|---|---|
| gemini-3.6-flash | 1.50 | 7.50 | same input as 3.5 Flash, output 7.50 vs 9.00 |
| gemini-3.5-flash-lite | 0.30 | 2.50 | pricier than 3.1 Flash-Lite's 0.25 / 1.50 |

## Results

| Cell model | Batch | Accuracy | Cost | Time | Calls |
|---|---|---|---|---|---|
| gemini-3.6-flash | 1 | 95.0% | $0.2386 | 150.8s | 120 |
| gemini-3.6-flash | 5 | 95.0% | $0.1176 | 61.8s | 25 |
| gemini-3.6-flash | 10 | 91.7% | $0.1355 | 32.1s | 13 |
| gemini-3.6-flash | 20 | 91.7% | $0.0896 | 21.5s | 7 |
| gemini-3.6-flash | 40 | 95.0% | $0.0702 | 13.7s | 4 |
| gemini-3.6-flash | 80 | 95.8% | $0.0875 | 26.3s | 3 |
| gemini-3.5-flash-lite | 1 | 90.8% | $0.0183 | 160.3s | 120 |
| gemini-3.5-flash-lite | 5 | 92.5% | $0.0201 | 29.2s | 25 |
| gemini-3.5-flash-lite | 10 | 93.3% | $0.0224 | 25.1s | 13 |
| gemini-3.5-flash-lite | 20 | 94.2% | $0.0227 | 33.2s | 7 |
| gemini-3.5-flash-lite | 40 | 94.2% | $0.0197 | 7.0s | 4 |
| gemini-3.5-flash-lite | 80 | 90.8% | $0.0199 | 6.8s | 3 |

Charts: `benchmarks/charts/model-tradeoff.svg` (all five Gemini models, this
run unioned with the 2026-07-02 rows) and `benchmarks/charts/batch-gemini-3.6-flash.svg`
/ `batch-gemini-3.5-flash-lite.svg`.

## Findings

1. **No accuracy improvement.** Both new models land in the same 91–96% band
   the whole Gemini lineup already occupies. The task saturates at flash-lite
   capability, so a newer model can't show a gain here.
2. **`gemini-3.5-flash-lite` loses to `gemini-3.1-flash-lite` on value** —
   91–94% vs 93–97%, at ~$0.021 per task vs ~$0.017 (about 20% more). Nothing
   argues for the swap.
3. **`gemini-3.6-flash` matches `gemini-3.5-flash` for less money** — 92–96%
   vs 94–95% (same band, within noise), ~$0.09 vs ~$0.13 per task at batch 20,
   driven by the cheaper $7.50 output rate.

## Recommendation

- **Cell (CUP) default: keep `gemini-3.1-flash-lite`.** The new Flash-Lite is
  slightly less accurate and costs more.
- **Primary (QM) default: `gemini-3.6-flash` is the better buy** — equal
  accuracy on this proxy task, 17% cheaper output, and Google bills it as the
  stronger agentic model. The sweep only measures the cell role, so swap the
  catalogue default after a quick patch-turn sanity check (a `bun run
  test:record` pass doubles as one, since re-recording cassettes against the
  new default is part of the swap anyway).
- **Batch size: no change** — same flat accuracy across batches as every
  earlier Gemini run.
