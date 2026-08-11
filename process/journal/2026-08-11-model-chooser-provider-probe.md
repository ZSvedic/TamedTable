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
| Puter.js signs the user in for credits | **Cannot work as drawn.** |

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

**Latency is measured per output token, from an answer big enough to mean
something.** The first probe divided elapsed time by total tokens and made
`gemini-3.1-flash-lite` look 70% slower than the `gemini-3.6-flash` it is far
faster than — the cheap model answered in eleven tokens, so almost all of its
time was fixed overhead. Switching to output tokens was not enough on its own:
asked for twenty bare booleans, flash-lite answered in 41 tokens and still read
as 25.3 sec per 1000 against flash's 7.6. The reference prompt now asks for a
sentence of justification per row, which pulls every model to several hundred
output tokens:

| model | in | out | elapsed | $ / 1000 tok | sec / 1000 tok |
|---|---|---|---|---|---|
| `gemini-3.6-flash` | 230 | 1269 | 6.41s | 0.0066 | 5.1 |
| `gemini-3.1-flash-lite` | 230 | 495 | 2.02s | 0.0011 | 4.1 |
| `openai/gpt-oss-120b` | 279 | 809 | 2.14s | 0.0005 | 2.6 |
| `openai/gpt-oss-20b` | 279 | 766 | 1.17s | 0.0002 | 1.5 |

Cheaper is now also faster, which is the truth about these four.

**Measuring never blocks the card.** OpenRouter's free model took 12.2 seconds
to answer. The key is verified with one cheap call (about a second), the card
appears immediately, and the two measurements fill it in afterwards.

**Groq forces `providerFor` to read the catalogue first.** Groq's ids are
vendor-prefixed (`openai/gpt-oss-120b`), and the old rule sent every
slash-containing id to OpenRouter. Looking the id up in the catalogue before
falling back to prefixes fixes it and makes the next provider a data change.

## Puter.js

Left out of the redesign. Puter has no API key — it is a browser-only script
whose sign-in lives in a popup, so the CLI and the headless runner could never
use it, and its "$25 in credits" claim is not on their site. It was also
[reverted from `main`](https://github.com/ZSvedic/TamedTable/pull/286) the day
before this probe, over sign-in persistence and routing bugs, with its return
planned as a separate PR. When that lands it slots into the new chooser as an
ordinary card; nothing in the redesign blocks it.
