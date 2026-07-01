# Performance benchmark — first results

**Date:** 2026-06-29
**Harness:** `bun run bench` (`#BenchPerf`), see [README → Performance benchmark](../../README.md#performance-benchmark).
**Fixture:** `spec/test-cases/performance-liked-videos.csv` — 1,820 data rows.
**Config:** defaults — `TAMEDTABLE_BATCH_SIZE=20`, `TAMEDTABLE_CHUNK_SIZE=5`, `TAMEDTABLE_RPM=40`.

Groups: **A** load the file (no model call), **B** SQL sort/filter over every row
(no model call), **C** add a boolean `Music` column classifying each video (one
patch turn + per-row cell fills, `ceil(1820/20)=91` cell batches + retries).

A and B make no model call, so their numbers are provider-independent — only the
table below's group-C row changes with the model combination.

## Anthropic — Sonnet 4.6 (patch) + Sonnet 4.5 (cells)

This is the committed cassette; `bun run bench` reproduces the token/cost figures
offline. The time shown for C is the **live** run (`bun run bench:record`);
offline replay is near-instant and not a real latency.

| Group | Scenario | Rows | Time | Calls | In tok | Out tok | Cost |
|---|---|---|---|---|---|---|---|
| A load | Load 1,820-row CSV | 1,821 | 0.05s | 0 | 0 | 0 | — |
| B sql | Sort by channel | 1,821 | 0.01s | 0 | 0 | 0 | — |
| B sql | Filter to one channel | 3 | 0.13s | 0 | 0 | 0 | — |
| C nl | Add bool `Music` column | 1,821 | 145.55s | 93 | 189,965 | 8,839 | **$0.8447** |

Calls: `claude-sonnet-4-6×1`, `claude-sonnet-4-5×92`.

## Gemini — 3.5 Flash (patch) + 3.1 Flash-Lite (cells)

Live run (`bun run bench:live`); not cassetted (it would clobber the Anthropic tape).

| Group | Scenario | Rows | Time | Calls | In tok | Out tok | Cost |
|---|---|---|---|---|---|---|---|
| A load | Load 1,820-row CSV | 1,821 | 0.05s | 0 | 0 | 0 | — |
| B sql | Sort by channel | 1,821 | 0.01s | 0 | 0 | 0 | — |
| B sql | Filter to one channel | 3 | 0.13s | 0 | 0 | 0 | — |
| C nl | Add bool `Music` column | 1,821 | 129.61s | 93 | 172,267 | 6,441 | **$0.0647** |

Calls: `gemini-3.5-flash×1`, `gemini-3.1-flash-lite×92`. Priced at the Standard
paid tier (Flash $1.50/$9.00, Flash-Lite $0.25/$1.50 per 1M in/out).

## Takeaways

- **Loading (A) and SQL (B) are not the worry.** Loading 1,820 rows is ~50 ms;
  a full-table sort is ~10 ms and a filter ~130 ms. These are engine-only and
  scale with row count, not with the model.
- **The cost and latency live entirely in group C** — the natural-language cell
  fills, which fan out to `N / batch-size` model turns. That is the lever to
  watch as tables grow: it scales with row count, batch size, and chunk
  concurrency, and is bounded by `TAMEDTABLE_RPM`.
- **Model choice dominates C's cost.** Same work, same ~93 calls: Gemini
  Flash/Flash-Lite ran C for **$0.0647** vs Anthropic Sonnet's **$0.8447** —
  ~13× cheaper — at comparable wall-clock (~130 s vs ~146 s).
- Token counts are exact (from each call's reported usage); dollar figures apply
  the per-tier rates in `PRICING` (`src/tests/performance.steps.ts`).
