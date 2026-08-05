# Free-model run: gemma-4-31b and nemotron-3-super

Live attempt to benchmark two `:free` OpenRouter models over the 120-row music
fixture — `google/gemma-4-31b-it:free` and
`nvidia/nemotron-3-super-120b-a12b:free`. Follow-up to the
[2026-07-17 run](2026-07-17-free-model-benchmark-run.md), which had left both
untested (daily cap). Neither produced a scored row this time either, for
different reasons — but the run fixed real bugs in the sweep and surfaced a
sandbox gotcha worth writing down.

## What happened

| Model | Outcome |
|---|---|
| `google/gemma-4-31b-it:free` | Tool calls are clean when spaced, but the `:free` route has one host — Google AI Studio — and its shared free pool stayed `429`-limited (`limit_source: upstream_provider_shared_pool`) even at `TAMEDTABLE_RPM=6`. Zero scored rows. |
| `nvidia/nemotron-3-super-120b-a12b:free` | Reasoning output breaks the engine's JSON cell protocol (`Invalid JSON response`), same as `nemotron-3-ultra` last time, and it is slow. No config completed. |

The OpenRouter endpoints API confirms gemma's `:free` slug is single-host, so
the earlier "many host providers, less saturation-prone" note in `models.jsonl`
was wrong — corrected in this change.

## Three things the run broke, and the fixes

1. **The sweep's OpenRouter patch default was a dead model.** `defaultPrimaryFor`
   returned `qwen/qwen3-coder:free`, which OpenRouter now `404`s ("unavailable
   for free — use `qwen/qwen3-coder`"). Every OpenRouter sweep failed on the
   patch turn before touching a cell. Repointed to `cohere/north-mini-code:free`,
   the app's OpenRouter default.
2. **One flaky patch turn killed the whole grid.** Free models sometimes return
   the `apply_spec_patch` call as plain text; `runSweep` had no catch, so the
   run threw. Added `--retries=N`: a config that throws is re-attempted (the
   patch turn runs before any cell call, so a retry is cheap).
3. **The patch model was not overridable.** Added `--primary=<id>`. It must share
   the cell model's provider — the runner resolves one provider from the primary
   model and uses it for both roles. For a self-contained free sweep, point
   `--primary` at the cell model itself (gemma patched its own turns fine).

## Sandbox gotcha: bun's fetch and the CONNECT proxy

Running from Claude Code on the web, every provider call failed with *"The socket
connection was closed unexpectedly"* after ~6 s. Bun's built-in `fetch` does not
tunnel TLS through the environment's CONNECT proxy: the proxy answers
`200 Connection Established`, then the socket dies. `curl` through the same proxy
works. The run used a preloaded `fetch` shim that routes the provider host
through `curl`:

```
bun --preload curlfetch.ts packages/bench/cli.ts sweep …
```

where `curlfetch.ts` overrides `globalThis.fetch` for `openrouter.ai`, spawns
`curl` (which honours `HTTPS_PROXY`), and rebuilds a `Response` from its output.
The shim is environment-scrap, not committed — the fix belongs to whoever runs
the sweep from a proxied box. A machine with direct egress needs none of this.

## Bottom line

Free *accuracy* was never the blocker; free *availability* is, again. Both new
rows stay in `models.jsonl` at `$0` with notes recording why they didn't score,
so a later run (different time of day, or after a `$10` credit lifts the daily
cap and widens routing) can retry. The picks from 2026-07-17 stand:
`cohere/north-mini-code:free` for cells, and it now doubles as the patch default.
