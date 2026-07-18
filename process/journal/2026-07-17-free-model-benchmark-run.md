# Free-model benchmark run: the picks change

Live sweep of OpenRouter `:free` models over the 120-row music fixture
(`bench:sweep`, 20 req/min, results in `results/free-openrouter.jsonl`, charts
refreshed). Follow-up to [the provider pick](2026-07-17-openrouter-free-provider.md)
— and the run overturned it: neither of that entry's picks could even start.

## What actually ran

Eight models were attempted across two rounds; six fell over before producing
a single scored row. The failure mode matters more than the accuracy table:

| Model | Outcome |
|---|---|
| `tencent/hy3:free` | Full 6-batch sweep, 85–93% accuracy, reliable patch turns. |
| `cohere/north-mini-code:free` | Full 5-batch sweep, 96% at batch 5, patch turn flaky (1 of 2). |
| `qwen/qwen3-coder:free` | Zero calls succeeded — its only host (Venice) returned 429 "rate-limited upstream" for 3+ hours. |
| `meta-llama/llama-3.3-70b-instruct:free` | Same Venice saturation, zero calls. |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | Responds, but its reasoning output breaks the engine's JSON cell protocol every time. |
| `poolside/laguna-m.1:free` | Malformed spec patches (`ops` not an array); cell runs then hit the daily cap. |
| `nvidia/nemotron-3-super-120b-a12b:free` | Untested — daily cap exhausted before its turn. |
| `google/gemma-4-31b-it:free` | Untested — upstream-limited earlier, daily cap by retry time. |

The account's 1,000-requests/day `:free` cap ran out mid-afternoon: failed big
batches fall back to per-row calls, so one flaky batch-80 config can burn 100+
requests (cohere's did exactly that). Naive per-config call estimates
undercount by 2–3×.

## Results (scored rows: 120 of 120 in every config)

| Batch | hy3 | north-mini-code |
|---|---|---|
| 1 | 92% | — |
| 5 | 85% | 96% |
| 10 | 93% | 88% |
| 20 | 93% | 88% |
| 40 | 93% | 39% |
| 80 | 89% | 61% |

Against [phase 2's paid field](../../benchmarks/results/phase2-all.jsonl)
(88–96%, $0.01–0.13 per task at batch 20/40): hy3 at 93% matches
`claude-sonnet-4-5` and beats `gpt-5.4-mini` and `claude-haiku-4-5` — at $0.
Only `gemini-3.1-flash-lite` (96% at ~$0.018) clearly wins. Free accuracy is
not the problem; free *availability* is.

## The picks, revised

- **Free primary (patch): `tencent/hy3:free`** — the only free model that
  patched reliably. Caveat: its free route ends 2026-07-21; after that
  `cohere/north-mini-code:free` is the fallback despite the flaky patch turn
  (the engine's retry loop absorbs one failure).
- **Free cell: `cohere/north-mini-code:free` at batch ≤ 10** (96% at 5), or
  `tencent/hy3:free` at batch 40 for throughput (93%, 4 calls for 120 rows).
- Disqualified on the 45-second-per-call usability rule and the outages above:
  everything else tested today.

## Operational lessons

- A `:free` model is only as good as its host: single-host models (Venice for
  qwen and llama) go dark for hours with no recourse. Prefer models with
  many hosts or a first-party host (Nvidia, Cohere, Poolside answered
  instantly all day).
- The daily cap is account-wide across all `:free` models — sweeping several
  models in one day competes with itself. Space benchmark days, or budget
  ~250 requests per fully-swept model.
- Bun ≤ 1.3.11's fetch drops SNI when tunneling through an HTTP proxy;
  openrouter.ai (TLS passthrough + Cloudflare) resets those handshakes.
  Bun 1.3.14 fixes it. Only bites in proxied sandboxes; recorded here in case
  a future session hits ECONNRESET where curl works.
