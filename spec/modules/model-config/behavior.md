# Model config

The `@tamedtable/model-config` module owns provider selection, API key
storage, and model catalogue for every surface that calls an LLM. It has
zero runtime dependencies and runs in any JavaScript environment — browser,
Node, or Bun. Storage integration (localStorage in the browser, nothing in
the CLI) is injected through a `StoragePort` interface; the module only
defines that interface.

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

The web package implements `StoragePort` with localStorage, persisting config
as a single JSON blob under the key `tamedtable.config`. On first read, if the
old `tamedtable.apiKey` key is present and the new key is absent, the old value
migrates to `{ anthropicKey: oldValue }` and the old key is removed.

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

## How the web settings panel uses it

The panel shows three provider accordion cards — Google, OpenAI, Anthropic —
stacked vertically. See the Web UI section of [spec/behavior.md](../../spec/behavior.md)
for the full interaction design.
