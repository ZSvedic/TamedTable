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
  model: "claude-sonnet-4-6"
}
```

When the user switches to Gemini in the settings panel and saves:

```
{
  provider: "gemini",
  anthropicKey: null,
  geminiKey: "AIza…",
  model: "gemini-3-flash"
}
```

## Model catalogue

`ALL_MODELS` is a fixed, ordered list of supported models:

| Provider | ID | Name | Description |
|---|---|---|---|
| anthropic | claude-opus-4-7 | Opus 4.7 | Most capable — best for tricky requests. |
| anthropic | claude-sonnet-4-6 | Sonnet 4.6 | Balanced — the default. |
| anthropic | claude-haiku-4-5 | Haiku 4.5 | Fastest and cheapest. |
| gemini | gemini-3-flash | Gemini 3 Flash | Google's fast, cheap model — the Gemini default. |
| gemini | gemini-2-5-flash | Gemini 2.5 Flash | Mid-tier Gemini model. |
| gemini | gemini-2-5-pro | Gemini 2.5 Pro | Most capable Gemini model. |

## Config resolution

`resolveConfig(env, stored)` merges environment variables over stored values;
env always wins. The rules:

1. If `GEMINI_API_KEY` is set in env → provider is gemini, geminiKey is that value.
2. Else if `ANTHROPIC_API_KEY` is set in env → provider is anthropic, anthropicKey is that value.
3. Else use `stored.provider`, falling back to "anthropic".
4. `TAMEDTABLE_MODEL` in env overrides model from stored.
5. Keys not present in env keep their stored values (or null).
6. The final model must belong to the resolved provider; if it doesn't, replace it with `defaultModel(provider)`.

`defaultModel(provider)` returns `claude-sonnet-4-6` for anthropic and
`gemini-3-flash` for gemini.

`providerFor(modelId)` returns `anthropic` for any id starting with `claude-`,
and `gemini` for any id starting with `gemini-`.

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

`readConfigFromEnv()` reads `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and
`TAMEDTABLE_MODEL` from `process.env` and returns them as a plain Record
suitable for passing as `resolveConfig`'s first argument. It is in a separate
`env.ts` export so environments without `process` (browser code) never import
it. Call it only on Node/Bun surfaces.

## How the CLI uses it

The CLI replaces its inline `process.env.ANTHROPIC_API_KEY` and
`TAMEDTABLE_MODEL` reads with `resolveConfig(readConfigFromEnv(), {})`. It
then picks `anthropicKey` or `geminiKey` based on `config.provider` and
forwards the chosen key to the headless runner. The help text mentions both
`ANTHROPIC_API_KEY` and `GEMINI_API_KEY`.

## How the web settings panel uses it

The panel shows a provider selector (Anthropic / Gemini) at the top, followed
by a model list filtered to models for the selected provider. Two key fields —
one for Anthropic, one for Gemini — each have a show/hide toggle. Saving calls
`controller.setConfig({ provider, anthropicKey, geminiKey, model })`.
