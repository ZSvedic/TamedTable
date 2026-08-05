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
resolveConfig(readConfigFromEnv(), { ...readStoredConfig(), ...opts.config })
```

When the user has `ANTHROPIC_API_KEY=sk-ant-…` in their environment and no
stored preferences:

```
{
  provider: "anthropic",
  anthropicKey: "sk-ant-…",
  geminiKey: null,
  puterKey: null,
  openaiKey: null,
  openrouterKey: null,
  model: "claude-sonnet-4-6",
  cellModel: "claude-haiku-4-5"
}
```

When the user switches to Gemini in the settings panel:

```
{
  provider: "gemini",
  anthropicKey: "sk-ant-…",
  geminiKey: "AIza…",
  openaiKey: null,
  openrouterKey: null,
  model: "gemini-3.6-flash",
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
  enforces it). Membership rule: for the paid providers the catalogue equals
  `models.jsonl` minus rows marked `runnable: false`; for OpenRouter only the
  `defaults` pick gets a catalogue entry — the other `:free` rows are
  bench-only sweep candidates, not app choices. Each entry's `voiceInput`
  mirrors its row's `audioInput`. `ALL_MODELS` is this array, imported — code
  never duplicates the list, and this spec intentionally doesn't either (a
  copy here went stale once already).
- `defaults` — for each provider, the `primary` and `secondary` model ids,
  plus an optional `batchSize` when the provider's cell model has a
  benchmarked sweet spot. Exposed as `DEFAULTS`.

Each `models` entry carries:

- `id` — the provider's exact API model id (verified against provider docs
  before any change; never invent or guess an id)
- `name` — short display name
- `provider` — `puter` | `gemini` | `openai` | `anthropic` | `openrouter`
- `temperature` — whether the model still accepts a `temperature` sampling
  parameter (see `acceptsTemperature` below)
- `voiceInput` — whether the model accepts audio input
- `inUsdPerMtok` / `outUsdPerMtok` — input/output price, US$ per million tokens

The user picks a **provider**, not individual models; the `defaults` section
decides the two roles. The current defaults:

| provider | primary (`model`) | secondary (`cellModel`) |
|---|---|---|
| puter | `gemini-3.6-flash` | `gemini-3.1-flash-lite` |
| gemini | `gemini-3.6-flash` | `gemini-3.1-flash-lite` |
| openai | `gpt-5.5` | `gpt-5.4-mini` |
| anthropic | `claude-sonnet-4-6` | `claude-haiku-4-5` |
| openrouter | `cohere/north-mini-code:free` | `cohere/north-mini-code:free` |

OpenRouter is the free tier: one model fills both roles, at $0. Its defaults
row also pins `batchSize: 5` — the [2026-07-17 benchmark](../../../process/journal/2026-07-17-free-model-benchmark-run.md)
measured `cohere/north-mini-code:free` at 96% accuracy at batch 5 and sharply
worse at 40+, so the engine batches cells in fives for this provider.
`defaultBatchSize(provider)` returns that pinned size, or `undefined` for
providers without one (their engine keeps its own default).

## Config resolution

`resolveConfig(env, stored)` merges environment variables over stored values;
env always wins. The rules:

1. If `PUTER_TOKEN` is set in env → provider is puter, puterKey is that value.
2. Else if `GEMINI_API_KEY` is set in env → provider is gemini, geminiKey is that value.
3. Else if `OPENAI_API_KEY` is set in env → provider is openai, openaiKey is that value.
4. Else if `ANTHROPIC_API_KEY` is set in env → provider is anthropic, anthropicKey is that value.
5. Else if `OPENROUTER_API_KEY` is set in env → provider is openrouter,
   openrouterKey is that value — last so a paid key always outranks the free
   tier when both are present.
6. Else use `stored.provider`, falling back to "gemini" — the provider whose
   defaults every committed cassette is recorded with, so key-free replay
   (tests, tours) resolves the models the recordings used.
7. `TAMEDTABLE_MODEL` in env overrides the primary model from stored. An
   empty value counts as unset — like the `*_API_KEY` vars — and falls
   through to stored, then the provider default.
8. Keys not present in env keep their stored values (or null).
9. The final primary model must belong to the resolved provider; if it doesn't, replace it with `defaultModel(provider)`. A model id that belongs to **no** provider — one `providerFor` only reaches through its anthropic catch-all, without the `claude-` prefix — does not belong to anthropic either: it is replaced the same way, never sent to the API to 404.
10. `TAMEDTABLE_CELL_MODEL` in env overrides the secondary (`cellModel`) from stored; otherwise stored, otherwise `defaultCellModel(provider)`. An empty value counts as unset, as in rule 6.
11. The final `cellModel` must belong to the resolved provider too — cell calls never cross providers; if it doesn't (including a no-provider id, as in rule 8), replace it with `defaultCellModel(provider)`.

When multiple provider keys are set in env, puter wins first, then gemini, then openai, then
anthropic, then openrouter.

`defaultModel(provider)` returns the `defaults[provider].primary` id (falling
back to the provider's first catalogue entry). Currently: `claude-sonnet-4-6`
for anthropic, `gemini-3.6-flash` for puter and gemini, `gpt-5.5` for openai,
`cohere/north-mini-code:free` for openrouter.

`defaultCellModel(provider)` returns the `defaults[provider].secondary` id
(falling back to that provider's primary default). Currently: `claude-haiku-4-5`
for anthropic, `gemini-3.1-flash-lite` for puter and gemini, `gpt-5.4-mini` for openai,
`cohere/north-mini-code:free` for openrouter.

`defaultBatchSize(provider)` returns the `defaults[provider].batchSize`
pin, or `undefined` when the provider has none. Currently: `5` for
openrouter, `undefined` for the rest.

`providerFor(modelId)` returns:

- `openrouter` for any id containing `/` — every OpenRouter id is
  vendor-prefixed (`qwen/qwen3-coder:free`), and no other provider's ids
  contain a slash, so this rule is checked first
- `anthropic` for any id starting with `claude-`
- `gemini` for any id starting with `gemini-`
- `cerebras` for any id starting with `zai-` or `gpt-oss-` — the `gpt-oss-`
  rule is checked **before** the `gpt-` rule, so open-weight OpenAI models
  served by Cerebras never land on the OpenAI provider
- `openai` for any other id starting with `gpt-`

The return type is `EngineProvider = Exclude<Provider, 'puter'> | 'cerebras'`. Puter.js is a full app provider that reuses Gemini model ids through
Puter.js rather than the engine model-id router. OpenRouter is a
full app provider — chooser card, catalogue entry, `defaults` row, resolved
by `resolveConfig`; the engine routes its ids to OpenRouter's OpenAI-compatible
endpoint. Cerebras stays **bench-only**: the engine routes its ids the same
way and the benchmark sweeps them, but it has no catalogue entry, no
`defaults` row, and no chooser card, and `resolveConfig` never resolves it.
Non-default `:free` ids (the other OpenRouter benchmark rows) are likewise
sweep-only — routable by the engine, absent from the catalogue.

`acceptsTemperature(modelId)` reports whether a model still accepts a
`temperature` sampling parameter. The newest models (Anthropic Opus 4.8/4.7,
Fable 5, Sonnet 5; OpenAI GPT-5.4+/5.5) removed sampling params and reject the
request with a 400. The flag lives per model in `models.json` (`temperature`);
the helper returns `true` only for ids that prefix-match a catalogue entry
marked `true` (so dated aliases still match) and `false` for everything else —
including unknown ids, so new models default to the safe no-temperature path.
The headless engine calls it to decide whether to send `temperature: 0`.

`keyFor(config)` returns the API key for `config.provider` — `puterKey` when
the provider is puter, `geminiKey` when
the provider is gemini, `openaiKey` when openai, `openrouterKey` when
openrouter, otherwise `anthropicKey` — or
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
`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `PUTER_TOKEN`, `TAMEDTABLE_MODEL`, and
`TAMEDTABLE_CELL_MODEL` from
`process.env` and returns them as a plain Record suitable for passing as
`resolveConfig`'s first argument. It
is in a separate `env.ts` export so environments without `process` (browser
code) never import it. Call it only on Node/Bun surfaces.

## How the CLI uses it

The CLI resolves config with `resolveConfig(readConfigFromEnv(), {})`, then
takes the active provider's key with `keyFor(config)` and forwards it to the
headless runner. The help text mentions `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
`OPENAI_API_KEY`, and `OPENROUTER_API_KEY`.

## Model chooser component

`ModelChooser` is the provider accordion UI: five cards — Puter.js, Google, OpenAI,
Anthropic, OpenRouter — each with an API-key field (masked, with an eye toggle
to reveal it). **The user picks a provider, not individual models.** Each expanded card
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
- OpenRouter → `https://openrouter.ai/settings/keys`

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

## Testing a key

A key that is merely typed is not a key that works. Each expanded card carries
a **Test** button next to its key field, and the card answers in a second
instead of leaving the user to find out from a failed transformation minutes
later. The component still touches no network: clicking calls
`onTestKey(provider)` and the host reports back through `testState`.

The button reads **Test** when idle and **Testing…**, disabled, while a call is
out. It is also disabled when the key field is empty — there is nothing to
test. The result renders under the key field, keyed to the card that ran it: a
green `✓ <model> answered in <n.n>s` line on success, a red sentence naming
what went wrong otherwise. Only one result shows at a time; testing a second
card replaces the first card's result.

The component is pure — props in, callbacks out — and holds no state except
the per-provider reveal toggle. It never touches storage or the network:

- `models` — the catalogue to render (usually `ALL_MODELS`), used to look up
  each default's price and voice flag
- `provider`, `keys` — the current provider and per-provider keys
- `primaryModel`, `secondaryModel` — the provider's two default model ids,
  shown read-only
- `expandedProvider` — which card shows its body, or null
- `savedProvider` — the provider whose config the host most recently saved, or
  null. That card's header shows a `✓ Saved` badge between the provider name
  and the voice badge, green fading to grey (see `savedFadeMs`).
- `savedSeq` — a counter the host bumps on every save; keying the badge on it
  restarts the green phase even when `savedProvider` is unchanged (repeated
  keystrokes in the same key field)
- `savedFadeMs` — how long the badge stays green before fading to grey
  (default 3000 ms); the web app passes its standard toast duration for the
  badge text
- `byokHelpUrl`, `changeModelsHelpUrl` — the two optional help-link URLs above
- `testState` — the key test the host last ran, or null:
  `{ provider, state: 'running' | 'ok' | 'error', message }`. The card whose
  provider matches renders it; every other card renders nothing.
- `onProviderClick(p)` — a card header was clicked
- `onKeyChange(p, value)` — the user typed in a key field
- `onKeyCommit(p, value)` — the user finished with a key field: it lost focus,
  or they pressed Enter in it. A host that saves on every keystroke can ignore
  it and use `onKeyChange` alone (the demo does); the app saves here, so half a
  typed key never reaches the engine.
- `onTestKey(p)` — the card's Test button was clicked. Omit it and no card
  shows a Test button, so a host with no way to call a provider gets no
  button that cannot work.

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
  `readStoredConfig()` and writes every change back — the same localStorage
  blob the main app uses, so the key and provider choice carry over between
  the app and the demo in both directions. A page load is not a change: with
  no interaction the stored blob is left byte-for-byte untouched. When a
  change is written, the demo's fields are merged over the stored blob, so
  fields the demo doesn't thread (`alwaysRunAll`) keep their persisted
  values instead of resetting to defaults. The models follow the provider defaults, so switching
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
`--mc-accent`, `--mc-accent-soft`, `--mc-ok`, `--mc-ok-soft`, `--mc-err`,
`--mc-font-ui`,
`--mc-font-mono`, `--mc-radius`, `--mc-radius-sm`, `--mc-radius-lg`.

For tests, each element carries a stable data attribute:
`data-mc-card`, `data-mc-key`, `data-mc-reveal`, `data-mc-keyurl`,
`data-mc-test` (the Test button), `data-mc-testresult` (its result line, with
`data-mc-teststate` carrying `ok` or `error`) — all keyed by
provider id — each read-only default row `data-mc-model` (keyed by model id)
plus `data-mc-role` (`"primary"` or `"secondary"`), `data-mc-saved` on the
`✓ Saved` badge (keyed by provider id), `data-mc-byok` on the
top BYOK help link, and `data-mc-changemodels` on the bottom FAQ link.
