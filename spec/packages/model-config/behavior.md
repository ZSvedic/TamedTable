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
  model: "claude-sonnet-4-6"
}
```

When the user switches to Gemini in the settings panel:

```
{
  provider: "gemini",
  anthropicKey: null,
  geminiKey: "AIza…",
  openaiKey: null,
  model: "gemini-3-flash"
}
```

## Model catalogue

`ALL_MODELS` is a fixed, ordered list of supported models:

| Provider | ID | Name | Description | Voice |
|---|---|---|---|---|
| gemini | gemini-3-flash | Gemini 3 Flash | Google's fast, cheap model — the Google default. | ✓ |
| gemini | gemini-2.5-flash | Gemini 2.5 Flash | Mid-tier Gemini model. | ✓ |
| gemini | gemini-2.5-pro | Gemini 2.5 Pro | Most capable Gemini model. | ✓ |
| openai | gpt-4o-audio-preview | GPT-4o Audio | OpenAI audio model — the OpenAI default. | ✓ |
| openai | gpt-4o | GPT-4o | Balanced OpenAI model. | ✗ |
| openai | gpt-4o-mini | GPT-4o Mini | Fast and cheap OpenAI model. | ✗ |
| anthropic | claude-opus-4-7 | Opus 4.7 | Most capable — best for tricky requests. | ✗ |
| anthropic | claude-sonnet-4-6 | Sonnet 4.6 | Balanced — the default. | ✗ |
| anthropic | claude-haiku-4-5 | Haiku 4.5 | Fastest and cheapest. | ✗ |

Each model entry has a `voiceInput: boolean` flag indicating whether that
model accepts voice (audio) input.

## Config resolution

`resolveConfig(env, stored)` merges environment variables over stored values;
env always wins. The rules:

1. If `GEMINI_API_KEY` is set in env → provider is gemini, geminiKey is that value.
2. Else if `OPENAI_API_KEY` is set in env → provider is openai, openaiKey is that value.
3. Else if `ANTHROPIC_API_KEY` is set in env → provider is anthropic, anthropicKey is that value.
4. Else use `stored.provider`, falling back to "anthropic".
5. `TAMEDTABLE_MODEL` in env overrides model from stored.
6. Keys not present in env keep their stored values (or null).
7. The final model must belong to the resolved provider; if it doesn't, replace it with `defaultModel(provider)`.

When multiple provider keys are set in env, gemini wins, then openai, then anthropic.

`defaultModel(provider)` returns:

- `claude-sonnet-4-6` for anthropic
- `gemini-3-flash` for gemini
- `gpt-4o-audio-preview` for openai

`providerFor(modelId)` returns:

- `anthropic` for any id starting with `claude-`
- `gemini` for any id starting with `gemini-`
- `openai` for any id starting with `gpt-`

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
`OPENAI_API_KEY`, and `TAMEDTABLE_MODEL` from `process.env` and returns them
as a plain Record suitable for passing as `resolveConfig`'s first argument. It
is in a separate `env.ts` export so environments without `process` (browser
code) never import it. Call it only on Node/Bun surfaces.

## How the CLI uses it

The CLI resolves config with `resolveConfig(readConfigFromEnv(), {})`. It
picks `anthropicKey`, `geminiKey`, or `openaiKey` based on `config.provider`
and forwards the chosen key to the headless runner. The help text mentions
`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and `OPENAI_API_KEY`.

## Model chooser component

`ModelChooser` is the provider accordion UI: three cards — Google, OpenAI,
Anthropic — each with an API-key field (masked, with an eye toggle to reveal
it) and that provider's models as a radio list. It lives in its own entry
point (`@tamedtable/model-config/ModelChooser`) so the main entry stays
React-free; `react` is a peer dependency.

The component is pure — props in, callbacks out — and holds no state except
the per-provider reveal toggle. It never touches storage or the network:

- `models` — the catalogue to render (usually `ALL_MODELS`)
- `provider`, `model`, `keys` — the current selection and per-provider keys
- `expandedProvider` — which card shows its body, or null
- `onProviderClick(p)` — a card header was clicked
- `onKeyChange(p, value)` — the user typed in a key field
- `onModelSelect(modelId)` — the user picked a model

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
  uses, so keys and model choice carry over between the app and the demo in
  both directions.
- **Test call.** Below the resolved config sits a dev test harness: a query
  input (`#tc-input`), a Send button (`#tc-send`), and a response field
  (`#tc-response`). Send issues one real completion call to the selected
  provider/model straight from the browser using the resolved key, and the
  response text (or the error message) lands in the response field. When the
  selected model has `voiceInput: true`, a mic button (`#tc-mic`) appears:
  click to record, click again to stop. The audio itself is the query — it
  goes to the selected model together with an answer-the-spoken-request
  instruction in one round trip, and the model's answer lands in the response
  field. No transcription step. The button is absent for models without voice
  support.

Styling comes only from `--mc-*` CSS custom properties, each with a default
that gives a presentable light look standalone. The host injects its theme by
setting the variables on any wrapping element: `--mc-ink`, `--mc-ink3`,
`--mc-surface`, `--mc-surface2`, `--mc-surface3`, `--mc-line`, `--mc-line2`,
`--mc-accent`, `--mc-accent-soft`, `--mc-ok`, `--mc-ok-soft`, `--mc-font-ui`,
`--mc-font-mono`, `--mc-radius`, `--mc-radius-sm`, `--mc-radius-lg`.

For tests, each interactive element carries a stable data attribute:
`data-mc-card`, `data-mc-key`, `data-mc-reveal` (all keyed by provider id),
and `data-mc-model` (keyed by model id).
