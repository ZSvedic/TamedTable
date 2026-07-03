# Model config

The `@tamedtable/model-config` module owns provider selection, API key
storage, the model catalogue, and the model chooser UI for every surface
that calls an LLM. The main entry has zero runtime dependencies and runs in
any JavaScript environment — browser, Node, or Bun; the `ModelChooser` React
component ships as a separate entry point. Storage integration is injected
through a `StoragePort` interface; the module defines the interface and ships
the browser localStorage implementation as a separate `storage.ts` entry
point (the CLI uses no storage).

## Worked example

The web controller boots with:

```
resolveConfig(readConfigFromEnv(), { ...opts.config, ...readStoredConfig() })
```

When the user has `ANTHROPIC_API_KEY=sk-ant-…` in their environment and no
stored preferences:

```
{
  provider: "anthropic",
  anthropicKey: "sk-ant-…",
  geminiKey: null,
  openaiKey: null,
  model: "claude-sonnet-4-6",
  cellModel: "claude-haiku-4-5"
}
```

When the user switches to Gemini in the settings panel:

```
{
  provider: "gemini",
  anthropicKey: null,
  geminiKey: "AIza…",
  openaiKey: null,
  model: "gemini-3.5-flash",
  cellModel: "gemini-3.1-flash-lite"
}
```

## Model catalogue

The catalogue has **one canonical home**:
[`src/packages/model-config/models.json`](../../../src/packages/model-config/models.json),
a single JSON object with **two sections**:

- `models` — every available model with its per-Mtok prices. This list mirrors
  [`benchmarks/models.jsonl`](../../../benchmarks/models.jsonl) (same ids, same
  prices); every catalogue id must have a pricing row there (a bench test
  enforces it). Membership rule: the catalogue equals `models.jsonl` minus
  rows marked `runnable: false`, and each entry's `voiceInput` mirrors that
  row's `audioInput`. `ALL_MODELS` is this array, imported — code never duplicates
  the list, and this spec intentionally doesn't either (a copy here went stale
  once already).
- `defaults` — for each provider, the `primary` and `secondary` model ids.
  Exposed as `DEFAULTS`.

Each `models` entry carries:

- `id` — the provider's exact API model id (verified against provider docs
  before any change; never invent or guess an id)
- `name` — short display name
- `provider` — `gemini` | `openai` | `anthropic`
- `voiceInput` — whether the model accepts audio input
- `inUsdPerMtok` / `outUsdPerMtok` — input/output price, US$ per million tokens

The user picks a **provider**, not individual models; the `defaults` section
decides the two roles. The current defaults:

| provider | primary (`model`) | secondary (`cellModel`) |
|---|---|---|
| gemini | `gemini-3.5-flash` | `gemini-3.1-flash-lite` |
| openai | `gpt-5.5` | `gpt-5.4-mini` |
| anthropic | `claude-sonnet-4-6` | `claude-haiku-4-5` |

## Config resolution

`resolveConfig(env, stored)` merges environment variables over stored values;
env always wins. The rules:

1. If `GEMINI_API_KEY` is set in env → provider is gemini, geminiKey is that value.
2. Else if `OPENAI_API_KEY` is set in env → provider is openai, openaiKey is that value.
3. Else if `ANTHROPIC_API_KEY` is set in env → provider is anthropic, anthropicKey is that value.
4. Else use `stored.provider`, falling back to "gemini" — the provider whose
   defaults every committed cassette is recorded with, so key-free replay
   (tests, tours) resolves the models the recordings used.
5. `TAMEDTABLE_MODEL` in env overrides the primary model from stored.
6. Keys not present in env keep their stored values (or null).
7. The final primary model must belong to the resolved provider; if it doesn't, replace it with `defaultModel(provider)`.
8. `TAMEDTABLE_CELL_MODEL` in env overrides the secondary (`cellModel`) from stored; otherwise stored, otherwise `defaultCellModel(provider)`.
9. The final `cellModel` must belong to the resolved provider too — cell calls never cross providers; if it doesn't, replace it with `defaultCellModel(provider)`.

When multiple provider keys are set in env, gemini wins, then openai, then anthropic.

`defaultModel(provider)` returns the `defaults[provider].primary` id (falling
back to the provider's first catalogue entry). Currently: `claude-sonnet-4-6`
for anthropic, `gemini-3.5-flash` for gemini, `gpt-5.5` for openai.

`defaultCellModel(provider)` returns the `defaults[provider].secondary` id
(falling back to that provider's primary default). Currently: `claude-haiku-4-5`
for anthropic, `gemini-3.1-flash-lite` for gemini, `gpt-5.4-mini` for openai.

`providerFor(modelId)` returns:

- `anthropic` for any id starting with `claude-`
- `gemini` for any id starting with `gemini-`
- `openai` for any id starting with `gpt-`

`acceptsTemperature(modelId)` reports whether a model still accepts a
`temperature` sampling parameter. The newest models (Anthropic Opus 4.8/4.7,
Fable 5, Sonnet 5; OpenAI GPT-5.4+/5.5) removed sampling params and reject the
request with a 400, so it returns `true` only for models known to accept it
(current Gemini, Sonnet 4.5/4.6, Haiku 4.5) and `false` for everything else —
including unknown ids, so new models default to the safe no-temperature path.
The headless engine calls it to decide whether to send `temperature: 0`.

`keyFor(config)` returns the API key for `config.provider` — `geminiKey` when
the provider is gemini, `openaiKey` when openai, otherwise `anthropicKey` — or
null when that provider's key is unset. Every surface that needs "the key for
the active provider" (the CLI, the web controller) uses this one helper so the
provider→key mapping lives in a single place.

## StoragePort

The module defines the interface; each surface implements it:

```
read()   → Partial<ResolvedConfig>
write(c: Partial<ResolvedConfig>) → void
clear()  → void
```

The module's `storage.ts` entry point implements `StoragePort` with
localStorage as `readStoredConfig` / `writeStoredConfig` / `clearStoredConfig`,
persisting config as a single JSON blob under the key `tamedtable.config`. On
first read, if the old `tamedtable.apiKey` key is present and the new key is
absent, the old value migrates to `{ anthropicKey: oldValue }` and the old key
is removed. All three helpers are no-ops in environments without localStorage
and swallow storage exceptions. The web app and the demo page share this
implementation, so keys entered in one are visible in the other (both are
served from the same origin).

## Reading from env

`readConfigFromEnv()` reads `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
`OPENAI_API_KEY`, `TAMEDTABLE_MODEL`, and `TAMEDTABLE_CELL_MODEL` from
`process.env` and returns them as a plain Record suitable for passing as
`resolveConfig`'s first argument. It
is in a separate `env.ts` export so environments without `process` (browser
code) never import it. Call it only on Node/Bun surfaces.

## How the CLI uses it

The CLI resolves config with `resolveConfig(readConfigFromEnv(), {})`, then
takes the active provider's key with `keyFor(config)` and forwards it to the
headless runner. The help text mentions `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
and `OPENAI_API_KEY`.

## Model chooser component

`ModelChooser` is the provider accordion UI: three cards — Google, OpenAI,
Anthropic — each with an API-key field (masked, with an eye toggle to reveal
it). **The user picks a provider, not individual models.** Each expanded card
shows that provider's two fixed defaults **read-only** — a Primary row (the
patch-turn model, which carries voice input) and a Secondary row (the per-row
cell model) — each with its model id and per-Mtok price (`$in in / $out out`).
There are no radios and no model selection. A single generic explainer of the
two roles sits above the cards (not repeated per card). A per-row `🎙 voice`
tag shows only on voice-capable models. It lives in its own entry point
(`@tamedtable/model-config/ModelChooser`) so the main entry stays React-free;
`react` is a peer dependency.

Each expanded card also shows a **"Get API key ↗"** deep link to that
provider's key page, opening in a new tab:

- Google → `https://aistudio.google.com/apikey`
- OpenAI → `https://platform.openai.com/api-keys`
- Anthropic → `https://console.anthropic.com/settings/keys`

These URLs are provider metadata baked into the component. Two optional host-
supplied help links frame the cards, both opening in a new tab; the host
supplies each path so the component stays free of any site-specific URL:

- `byokHelpUrl` → a **"New here? How to get an API key ↗"** link rendered at the
  **top**, directly below the role explainer. The web app points it at the BYOK
  setup guide.
- `changeModelsHelpUrl` → a **"How to change primary and secondary models? ↗"**
  link rendered at the **bottom**, below the cards. It points at the FAQ entry
  explaining that the defaults are edited in `models.json`. The web app points
  it at `FAQ.html#change-models`.

Either link is omitted when its prop is unset.

The component is pure — props in, callbacks out — and holds no state except
the per-provider reveal toggle. It never touches storage or the network:

- `models` — the catalogue to render (usually `ALL_MODELS`), used to look up
  each default's price and voice flag
- `provider`, `keys` — the current provider and per-provider keys
- `primaryModel`, `secondaryModel` — the provider's two default model ids,
  shown read-only
- `expandedProvider` — which card shows its body, or null
- `byokHelpUrl`, `changeModelsHelpUrl` — the two optional help-link URLs above
- `onProviderClick(p)` — a card header was clicked
- `onKeyChange(p, value)` — the user typed in a key field

The host owns all state and semantics. In the web app, `SettingsPanel` binds
the props to `WebController` (clicking a card expands it and selects the
provider; collapsing changes nothing — see the Web UI section of
[spec/behavior.md](../../behavior.md)). On the demo page, plain React state
plays that role and `resolveConfig` renders the resulting config live.

## Demo page

The demo (`demo.html` + `demo.tsx`, deployed under `/demos/model-config/`)
mounts the real `ModelChooser` over plain React state and shows the
`resolveConfig` result live. Two behaviors beyond the chooser itself:

- **Shared persistence.** On load the demo seeds its state from
  `readStoredConfig()` and writes every change back with
  `writeStoredConfig(resolved)` — the same localStorage blob the main app
  uses, so the key and provider choice carry over between the app and the demo
  in both directions. The models follow the provider defaults, so switching
  provider repoints `model`/`cellModel` to that provider's two defaults.
- **Test call.** Below the resolved config sits a dev test harness: a query
  input (`#tc-input`), a Send button (`#tc-send`), and a response field
  (`#tc-response`). Send issues one real completion call to the selected
  provider/model straight from the browser using the resolved key, and the
  response text (or the error message) lands in the response field. When the
  selected model has `voiceInput: true`, a mic button (`#tc-mic`) appears.
  It is press-and-hold, matching the main app: holding records, releasing
  sends. The audio itself is the query — it
  goes to the selected model in one round trip with an instruction to reply
  as JSON carrying both a verbatim transcript and the answer. The transcript
  fills the query input (so the user sees what the model heard) and the
  answer lands in the response field. No separate transcription call. If the
  model's reply isn't parseable JSON, the raw text lands in the response
  field and the input is left alone. The button is absent for models without
  voice support.

Styling comes only from `--mc-*` CSS custom properties, each with a default
that gives a presentable light look standalone. The host injects its theme by
setting the variables on any wrapping element: `--mc-ink`, `--mc-ink3`,
`--mc-surface`, `--mc-surface2`, `--mc-surface3`, `--mc-line`, `--mc-line2`,
`--mc-accent`, `--mc-accent-soft`, `--mc-ok`, `--mc-ok-soft`, `--mc-font-ui`,
`--mc-font-mono`, `--mc-radius`, `--mc-radius-sm`, `--mc-radius-lg`.

For tests, each element carries a stable data attribute:
`data-mc-card`, `data-mc-key`, `data-mc-reveal`, `data-mc-keyurl` (all keyed by
provider id), each read-only default row `data-mc-model` (keyed by model id)
plus `data-mc-role` (`"primary"` or `"secondary"`), `data-mc-byok` on the
top BYOK help link, and `data-mc-changemodels` on the bottom FAQ link.
