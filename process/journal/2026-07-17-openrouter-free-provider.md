# OpenRouter joins as the second free provider

Follow-up to [the free-provider research](2026-07-17-free-provider-research.md),
same day. The Cerebras pick optimised for rate limits, but the user's real
obstacle is registration friction: asking someone to sign up at a provider
they've never heard of is a bigger ask than adding one more key to an account
they already have. OpenRouter flips that tradeoff — one no-credit-card signup
unlocks ~25 `:free` models from many vendors, and it's a name users already
know. (Shipping our own key inside the open-source app was investigated and is
a dead end: scrapers find public keys in minutes, providers auto-revoke them,
and strangers would drain the quota anyway. Truly keyless APIs exist but only
serve small models at 2 req/min — demo-tier at best.)

## The picks

- **Free primary: `qwen/qwen3-coder:free`** — consistently named the strongest
  `:free` tool-calling/coding model in July 2026 roundups; the patch role is
  tool calling.
- **Free cell: `meta-llama/llama-3.3-70b-instruct:free`** — a long-lived
  `:free` workhorse; fast, non-reasoning, fine for bulk boolean fills.
- `openrouter/free` (the auto-router that picks any live free model with the
  needed capabilities) is the rotation-proof alternative if a pinned id 404s.

## What the free plan costs you instead of money

- **Data**: `:free` endpoints require the account privacy setting that allows
  free model publication — providers may train on prompts. TamedTable sends
  the user's table rows to the cell model, so this is a real disclosure, not
  fine print. The paid three don't have this tradeoff.
- **Requests**: 20 req/min (cap the engine with `TAMEDTABLE_RPM=20`) and ~50
  req/day on a $0 account — 1,000/day after a one-time $10 credit purchase.
  Real daily app use needs that top-up; the sweep needs a reduced grid
  (batch 1 alone is 120 calls).

## What changed in the repo

`providerFor` routes any slash-containing id (`vendor/model:free`) to a new
bench-only `openrouter` provider; the engine calls
`https://openrouter.ai/api/v1` with `OPENROUTER_API_KEY`; both picks sit in
`models.jsonl` at $0; and chart filenames now slug `/` and `:` out of model
ids (`batch-qwen-qwen3-coder-free.svg`), which OpenRouter ids would otherwise
break. Same containment as Cerebras: no catalogue entry, no chooser card,
`resolveConfig` untouched.

## Next

Sign up at openrouter.ai, allow free model publication in privacy settings,
export `OPENROUTER_API_KEY`, then run the reduced-grid sweep in
[benchmarks/README.md](../../benchmarks/README.md#free-providers-cerebras-openrouter)
and compare against the committed phase-2 results before trusting the picks.
