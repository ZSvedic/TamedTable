# Model config

The `@tamedtable/model-config` package owns the six provider choices, their fixed model pairs, config resolution, local storage, and the paste-first chooser. It does not own app state or send keys anywhere except the chosen provider.

## Worked example

A user pastes `gsk_…`. Prefix detection chooses Groq's validator, the app makes a small real request, and only a successful reply adds Groq and selects it:

```
Groq API  PAID
Primary    openai/gpt-oss-120b
           $0.00015 in / $0.00075 out per 1000 tokens · ~2.3 sec
Secondary  llama-3.1-8b-instant
           $0.00005 in / $0.00008 out per 1000 tokens · ~1.7 sec
```

The prices come from `models.json`. The time is the latest measured estimate, not a promise.

## Providers and models

The app supports Google, OpenAI, Anthropic, OpenRouter, Groq, and Puter.js. Each provider has one fixed primary model and one fixed secondary model in `models.json`.

API keys remain in `tamedtable.config` in local storage. Puter owns its session through the Puter SDK; the stored `puterConnected` flag only restores the card.

`resolveConfig` reads `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, and `GROQ_API_KEY`. A selected provider always resolves to its own two default models.

## Adding a provider

The chooser starts with no cards when it has no saved keys or Puter session. It always shows one masked paste field and an Add button.

Prefix detection chooses which validator to call:

- `AIza` → Google
- `sk-proj-` or generic `sk-` → OpenAI
- `sk-ant-` → Anthropic
- `sk-or-` → OpenRouter
- `gsk_` → Groq

The prefix is only a hint. Add makes a small real model call with the pasted key. Success replaces that provider's old key, adds or selects its card, clears the field, and saves the key. Failure keeps the old connection and shows the provider error inline. Unknown prefixes clear the field and list the accepted prefixes.

Puter's button loads the existing Puter SDK, opens its sign-in flow, validates one model call, then adds and selects Puter. API keys never go to Puter.

## Provider cards

Cards stay in connection order. A header selects the default provider and expands only that card. The expanded body shows the fixed primary and secondary rows.

Each model row reads:

```
$X in / $Y out per 1000 tokens · ~Z sec
```

The price divides the catalogue's per-million input and output rates by 1,000. Validation requests measure time to first output and generation speed from about 100 output tokens; the estimate combines the first-output wait with the measured rate normalized to 1,000 output tokens.

A refresh button `⟳` immediately left of delete repeats both measurements. Delete removes the provider. Deleting the default selects the last remaining card; deleting the last card restores the empty state.

Tags describe the configured route, not the account plan. A zero-price catalogue route reads `FREE`; a non-zero route reads `PAID`. Voice appears only when the primary model accepts audio.

## Public entries

The main entry exports provider and config types, `ALL_MODELS`, `DEFAULTS`, `detectProvider`, config resolution, price data, and provider helpers. `ModelChooser.tsx` is the React entry, `env.ts` is Node/Bun-only, and `storage.ts` is browser-safe.

The demo mounts the real chooser over local state and uses the same storage blob as the app. It exposes the resolved config and a manual live-call harness.
