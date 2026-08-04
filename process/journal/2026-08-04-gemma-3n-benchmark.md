# Gemma 3n E4B benchmark — on-device size-class proxy

We want to know whether Chrome's built-in Gemini Nano (2–4B, on-device) could
run TamedTable's schema-inference locally, so a user gets value before typing an
API key. Nano has no API, so this run benchmarks `google/gemma-3n-e4b-it` — the
closest public size-class proxy — on the `#BenchSweep` cell-fill task. Verdict up
front: **don't ship.** Gemma keeps every row intact but classifies at the
majority-class baseline, far below the 85%+ the paid and free models clear.

## Setup

Same harness as the [2026-07-02 sweep](2026-07-02-model-batch-sweep.md): the
120-row labelled music subset, batch sizes {1, 5, 10, 20, 40, 80}, accuracy
scored against the committed labels by `videoId`. Single run per config — ±3–5%
is noise, and it doesn't change the verdict here. Results in
`benchmarks/results/gemma-3n.jsonl`.

Gemma 3n has no `:free` OpenRouter route, so the cell model runs on the paid
route (0.06 / 0.12 per Mtok — still cents for the whole grid). Gemma can't tool-
call, so it can't write the add-column patch; the patch turn (which never touches
cell accuracy) runs on `qwen/qwen3-coder`. That is now the OpenRouter primary
default — the old `qwen/qwen3-coder:free` slug retired and 404s with "use
qwen/qwen3-coder".

This run also added a **row-integrity** metric, separate from accuracy: for each
config it checks that the output row count matches the input and that no
`videoId` is duplicated or dropped. Small models sometimes mangle a row id
(emit `1` for `11`), silently corrupting a later join; accuracy alone never
catches it. See [benchmarks/README.md](../../benchmarks/README.md#row-integrity--a-metric-separate-from-accuracy).

## Results

| Cell model | Batch | Accuracy | Row integrity | Cost | Time | Calls |
|---|---|---|---|---|---|---|
| google/gemma-3n-e4b-it | 1 | 54% | OK | $0.0026 | 313.6s | 120 |
| google/gemma-3n-e4b-it | 5 | 53% | OK | $0.0051 | 176.2s | 45 |
| google/gemma-3n-e4b-it | 10 | 74% | OK | $0.0027 | 9.7s | 13 |
| google/gemma-3n-e4b-it | 20 | 62% | OK | $0.0031 | 232.1s | 67 |
| google/gemma-3n-e4b-it | 40 | 53% | OK | $0.0034 | 378.9s | 124 |
| google/gemma-3n-e4b-it | 80 | 57% | OK | $0.0020 | 7.8s | 1 |

## Reading it

**Accuracy is at chance.** The labelled set is 69 non-music / 51 music, so always
guessing "not music" scores ~57%. Gemma's cleanest number is batch 1 (one row per
call, no batching to blame) at **54% — below that baseline.** The 74% at batch 10
is the high end of the noise, not a trend; the rest sit 52–62%. Spot-checking the
raw output confirms this is real judgment, not a parsing artifact: gemma returns
clean `yes`/`no`, and its misses are genuine — it calls a Metallica cover
non-music, an art-history film music.

**Row integrity is perfect.** Every config returned all 120 rows once, no
duplicates, no drops (`RowChk = OK`). The failure mode this metric was built to
catch never fired here — gemma is weak at the *judgment*, not at preserving rows.

**Batching is unstable.** The inflated call counts (batch 40 → 124 calls, batch 5
→ 45) are the engine falling back to per-cell after gemma's batched JSON failed to
parse. So the cheap, fast large-batch path the paid models enjoy doesn't hold for
gemma even setting accuracy aside.

## Verdict — per task

| Task (Group C: classify each row "Music") | Ship? |
|---|---|
| google/gemma-3n-e4b-it as the cell model | **Don't ship** — accuracy at/below the majority-class baseline. |

On-device Nano-class quality isn't enough for TamedTable's classification yet.
Keep requiring an API key for schema inference; the free-tier "value before a key"
story stays with the stronger free models (`cohere/north-mini-code:free`,
`tencent/hy3` when its route is up), not the Nano size class. Row integrity, the
one thing gemma got right, is now a standing column in the report for every future
model.

## Note on this run's transport

Bun's `fetch` can't traverse this sandbox's egress proxy (ECONNRESET after the
CONNECT tunnel opens), while `curl` and Node can. The committed runner is
unchanged; the grid ran by injecting a curl-backed `fetch` through the
`SweepContext.baseFetch` seam the runner already exposes. A normal environment
with direct outbound needs none of this — `bun run bench:sweep --models=google/gemma-3n-e4b-it`
works as written.
