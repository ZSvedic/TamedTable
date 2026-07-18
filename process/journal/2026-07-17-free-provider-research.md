# Free-provider research + Cerebras wiring (sweep pending a key)

Research for a fourth, free provider next to Anthropic/Gemini/OpenAI: which
free models are worth using, through which free tier, and what to pick as the
free primary (patch-turn) and secondary (cell) model. This entry records the
findings and the decision; the sweep itself hasn't run yet — the sandbox that
did this work has no Cerebras key and its network policy blocks every
free-provider host, so the run is one command away (see
[benchmarks/README.md](../../benchmarks/README.md#free-provider-cerebras)).

## The field (July 2026)

Free access comes in two shapes — permanent developer tiers and promos:

| Channel | Best free models | Daily limit | Catch |
|---|---|---|---|
| **Cerebras** | `zai-glm-4.7`, `gpt-oss-120b` | 14,400 req, ~1M tokens | Lineup shrank ~12 → 2 models in May 2026 |
| OpenRouter `:free` | Kimi K2.6, Qwen3 Coder, DeepSeek, `grok-4-fast:free` | **50 req** (1,000 after a one-time $10 top-up) | Too few requests to sweep or run the app |
| Groq | Llama 4 Scout, Qwen3 32B, gpt-oss-120b/20b | 14,400 req, 30K tokens/min | Kimi K2 already rotated out |
| Z.ai | GLM-4.7-Flash (MIT, $0 API) | model-specific | One model, weaker than full GLM-4.7 |
| Google AI Studio | Gemini Flash free tier | 250 req | Same provider we already have |

Quality leaders among open-weight models are Kimi K2.6 and GLM-4.7 (agentic /
tool use) with gpt-oss-120b close behind at far higher speed. But rate limits
decide the channel: one sweep is ~170 calls per model, and real app use needs
thousands of cell calls a day. Only Cerebras and Groq clear that bar, and
Cerebras's two models map cleanly onto the two roles while running fastest
anywhere (~1,800–3,000 tok/s for gpt-oss-120b).

## Decision

- **Provider: Cerebras free tier** (OpenAI-compatible, no credit card).
- **Primary (patch turn): `zai-glm-4.7`** — GLM-4.7 is open-weight SOTA on
  tool calling (τ²-Bench ~79.5 on the Flash variant, higher on full), which is
  what the patch role needs.
- **Secondary (cell): `gpt-oss-120b`** — boolean cell fills need speed and
  bulk more than frontier reasoning; the fastest-served model wins.

"Free until when?" — none of the developer tiers has an announced end date;
they are permanent programs whose *limits and lineups* change without notice.
The only true promo found (xAI's `grok-4-fast:free` on OpenRouter, "limited
time" since 2025-09) was still live in July 2026 but can vanish any day. Treat
free access as revocable: the models.jsonl notes say verify before trusting.

## What changed in the repo

`providerFor` now routes `zai-*` / `gpt-oss-*` ids to a bench-only `cerebras`
provider (`EngineProvider`), the engine calls `https://api.cerebras.ai/v1`
with `CEREBRAS_API_KEY`, the bench CLI knows the key, and `models.jsonl`
carries both models at $0. The app's chooser, catalogue, and `resolveConfig`
are untouched — the three app providers stay as they were.

## Next

1. Sign up at cloud.cerebras.ai, export `CEREBRAS_API_KEY`.
2. `bun run bench:sweep --models=zai-glm-4.7,gpt-oss-120b --out=free-models`.
3. Read the accuracy knee vs batch size before trusting the $0 defaults;
   labels are Gemini-authored, so read cross-provider gaps as indicative.
