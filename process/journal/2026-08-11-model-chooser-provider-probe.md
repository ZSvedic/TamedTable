# 2026-08-11 — Provider probe for the model chooser redesign

Before rebuilding the chooser around "paste a key, we work out the rest", every
claim the [design handoff](../../marketing/design_handoff_model_chooser/README.md)
makes was checked against the live provider APIs. Four of the five keys were
available (`ANTHROPIC_API_KEY` was not set), so Anthropic is the one row below
that is reasoned from its docs rather than measured.

## What the design claims, and what the APIs actually do

| Claim | Result |
|---|---|
| The key's prefix names its provider | Holds. `AIza`, `sk-proj-`, `sk-or-`, `gsk_` each matched their real key. |
| A key can be validated against the provider | Holds for all five. |
| Cost and latency can be measured per model | Holds — numbers below. |
| The browser may call providers directly | Holds. All five answer a CORS preflight from `https://www.tamedtable.com`. |
| Groq can join as a provider | Holds, and it is the fastest and cheapest of the paid providers. |
| Free vs paid is read from the provider's API | **Only Google and OpenRouter report it.** |
| Puter.js signs the user in for credits | **Web-only as drawn** — the token itself works anywhere. |

## Measurements

One classification call per model, priced through `benchmarks/models.jsonl`:

| provider | model | $ / 1000 tok | sec / 1000 tok | tier signal |
|---|---|---|---|---|
| gemini | `gemini-3.6-flash` | 0.0068 | 6.1 | `x-gemini-service-tier: standard` |
| openai | `gpt-5.5` | 0.0207 | 15.8 | none needed — no free tier exists |
| groq | `openai/gpt-oss-120b` | 0.0004 | 3.1 | none published |
| openrouter | `cohere/north-mini-code:free` | 0 | 30.6 | `/api/v1/key` → `is_free_tier` |

## Four decisions

**The tier tag shows only when the provider reports one.** Google returns
`x-gemini-service-tier` on every response and OpenRouter has `GET /api/v1/key`;
OpenAI and Anthropic have no free tier to distinguish. Groq publishes nothing —
its per-minute token limit differs between tiers, but the threshold is
undocumented and would go wrong silently. Groq's card carries no tier tag.

**Only speed is measured; price comes from the catalogue.** OpenRouter is the
one provider that reports what a call cost (`usage.cost`, and a `cost_details`
breakdown). OpenAI, Google, Groq and Anthropic return tokens and nothing else.
One exception does not justify a second source of truth, so the card shows
catalogue prices per thousand tokens — input and output separately, since a
blended figure hides which one a workload actually pays.

**Speed splits into getting going and generating.** Three attempts:

1. *Elapsed ÷ total tokens.* Made `gemini-3.1-flash-lite` look 70% slower than
   the `gemini-3.6-flash` it is far faster than — the cheap model answered in
   eleven tokens, so nearly all its time was fixed overhead.
2. *Elapsed ÷ output tokens.* Better, but asked for twenty bare booleans
   flash-lite answered in 41 tokens and still read 25.3 sec/1000 against
   flash's 7.6.
3. *One capped streaming call, timed in two parts.* `ttftSec` is the wait for
   the first chunk; `tokPerSec` is generation once under way. The card shows
   `ttftSec + 1000 / tokPerSec`. Startup is paid once per call whatever its
   length, so adding it beats averaging it in.

The cap is 300 output tokens. At 100 a thinking model spends the entire budget
reasoning and never streams a word. Turning thinking off is not the alternative:
Gemini 3.6 rejects `thinkingBudget: 0`, so the probe sends no reasoning options
at all and stays provider-neutral.

**Some providers buffer**, and Gemini 3.6 is one — it streams its thinking
silently, then flushes everything in a frame or two at the very end. When under
a fifth of the call was spent streaming there is no separable first-token time,
so the whole call counts as generation and the estimate becomes a plain average.

The shipped `measureModel`, run live against every default:

| provider | model | ttft | rate | ~sec / 1000 tok |
|---|---|---|---|---|
| groq | `openai/gpt-oss-20b` | 0.28s | 607 tok/s | 1.9 |
| groq | `openai/gpt-oss-120b` | 0.41s | 468 tok/s | 2.5 |
| gemini | `gemini-3.1-flash-lite` | 1.31s | 487 tok/s | 3.4 |
| openai | `gpt-5.4-mini` | 0.83s | 157 tok/s | 7.2 |
| openai | `gpt-5.5` | 2.88s | 149 tok/s | 9.6 |
| gemini | `gemini-3.6-flash` | buffered | 103 tok/s | 9.7 |
| openrouter | `cohere/north-mini-code:free` | 0.52s | 27 tok/s | 37.2 |

A measurement is a snapshot of one minute on one network, so each card carries
a **⟳** button to take it again.

**Measuring never blocks the card.** OpenRouter's free model took 12.2 seconds
to answer. The key is verified with one cheap call (about a second), the card
appears immediately, and the two measurements fill it in afterwards.

**The engine is told its provider instead of inferring one.** Groq's ids are
vendor-prefixed (`openai/gpt-oss-120b`), and the old rule sent every
slash-containing id to OpenRouter — but no string rule could be right here:
OpenRouter serves those same weights under that same name. A model id cannot say
who hosts it. The connection can, because the key named the provider when it was
pasted, so `createHeadlessRunner` now takes `provider`. `providerFor` survives
as the fallback for callers holding only an id (the benchmark sweeping from a
command line, a stored config from an older build), and reads the catalogue
before it reads prefixes.

## Puter.js

Left out of this PR, but not blocked — and the first reading of it here was
wrong. Puter does have an HTTP API behind a bearer token:

```
POST https://api.puter.com/drivers/call   401 {"code":"token_missing"}
GET  https://api.puter.com/whoami         401 {"code":"token_missing"}
```

That is what `puter.ai.chat()` calls underneath, so a token works from Node and
the CLI as well as the browser. What is browser-only is **obtaining** the token:
`puter.auth.signIn()` opens a popup, and there is no device-code or `/login`
endpoint to mint one headlessly (both 404). A signed-in browser holds it at
`localStorage["puter.auth.token.v2"]`, which is where the reverted PR's
`PUTER_TOKEN` came from.

So Puter fits the redesigned chooser better than the old one: a Puter token is
another pasted credential, and the design's "Sign in" button is a shortcut for
getting one rather than a separate mechanism. What it needs before landing is a
sample token, to see whether it carries a prefix `detectProvider` can recognise.
It was [reverted from `main`](https://github.com/ZSvedic/TamedTable/pull/286)
the day before this probe over sign-in persistence and routing bugs, and returns
in its own PR.
