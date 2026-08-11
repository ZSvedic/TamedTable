# Model config

The `@tamedtable/model-config` module owns provider detection, API key
storage, the model catalogue, and the model chooser UI for every surface
that calls an LLM. The main entry has zero runtime dependencies and runs in
any JavaScript environment — browser, Node, or Bun; the `ModelChooser` React
component, the localStorage adapter, the env reader, and the network probe
each ship as a separate entry point, so a host only pays for what it uses.

## Worked example

The user pastes `AIza…` into the chooser and presses Add. The host asks the
module what that key is, checks it against the provider, and stores the result:

```
detectProvider("AIza…")            → "gemini"
await verifyKey("gemini", "AIza…") → { tier: "paid" }
```

The card appears at once, marked as the default, with both model rows still
measuring. Two reference calls later the card reads:

```
Primary model    gemini-3.6-flash
$0.0015 in / $0.0075 out per 1000 tok, ~9.7 sec
Secondary model  gemini-3.1-flash-lite
$0.00025 in / $0.0015 out per 1000 tok, ~3.4 sec
```

The prices are the catalogue's, divided by a thousand. Only the seconds are
measured. The stored config is `{ provider: "gemini", geminiKey: "AIza…",
model: "gemini-3.6-flash", cellModel: "gemini-3.1-flash-lite" }`.

## Detecting the provider from the key

The user never picks a provider from a list. They paste a key, and its prefix
names the provider. `detectProvider(key)` trims the key, tests these prefixes
**in order**, and returns the provider or `null`:

| prefix | provider |
|---|---|
| `sk-proj-` | openai |
| `sk-ant-` | anthropic |
| `sk-or-` | openrouter |
| `gsk_` | groq |
| `AIza` | gemini |
| `eyJ` | puter |
| `sk-` | openai |

Order matters: `sk-proj-`, `sk-ant-` and `sk-or-` all start with `sk-`, so the
generic OpenAI rule is tested last. `eyJ` is the base64 of `{"alg":` — a Puter
token is a JWT, which makes it the loosest rule here, since any JWT matches.
`SUPPORTED_PREFIXES` exposes the display list
(`AIza…, sk-proj-…, sk-ant-…, sk-or-…, gsk_…, eyJ…`) that the chooser's error
message names.

A prefix is a guess, not proof. Nothing is stored until `verifyKey` has had the
provider itself confirm the key.

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
- `provider` — `gemini` | `openai` | `anthropic` | `openrouter` | `groq` | `puter`
- `temperature` — whether the model still accepts a `temperature` sampling
  parameter (see `acceptsTemperature` below)
- `voiceInput` — whether the model accepts audio input
- `inUsdPerMtok` / `outUsdPerMtok` — input/output price, US$ per million tokens

The user connects a **provider**, not individual models; the `defaults` section
decides the two roles. The current defaults:

| provider | primary (`model`) | secondary (`cellModel`) |
|---|---|---|
| gemini | `gemini-3.6-flash` | `gemini-3.1-flash-lite` |
| openai | `gpt-5.5` | `gpt-5.4-mini` |
| anthropic | `claude-sonnet-4-6` | `claude-haiku-4-5` |
| groq | `openai/gpt-oss-120b` | `openai/gpt-oss-20b` |
| openrouter | `cohere/north-mini-code:free` | `cohere/north-mini-code:free` |
| puter | `gemini-3.6-flash` | `gemini-3.1-flash-lite` |

OpenRouter is the free tier: one model fills both roles, at $0. Its defaults
row also pins `batchSize: 5` — the [2026-07-17 benchmark](../../../process/journal/2026-07-17-free-model-benchmark-run.md)
measured `cohere/north-mini-code:free` at 96% accuracy at batch 5 and sharply
worse at 40+, so the engine batches cells in fives for this provider.
`defaultBatchSize(provider)` returns that pinned size, or `undefined` for
providers without one (their engine keeps its own default).

Ids are **not unique**. Puter is a gateway: it re-serves other providers'
models under their own names, so `gemini-3.6-flash` appears twice in the
catalogue — once as Google's, once as Puter's. `modelFor(provider, id)` is the
lookup anything reading a price, a voice flag or a temperature flag must use;
`ALL_MODELS.find(m => m.id === …)` would silently pick whichever came first.

Groq serves open-weight models on its own hardware and is the fastest and
cheapest of the paid providers — see the
[2026-08-11 provider probe](../../../process/journal/2026-08-11-model-chooser-provider-probe.md).
Its model ids are vendor-prefixed (`openai/gpt-oss-120b`), which is why
`providerFor` reads the catalogue before it reads prefixes.

## Where each provider lives

Two things reach a provider's API: the engine, through the AI SDK clients, and
the probe that checks a pasted key. `PROVIDER_BASE_URL` is the one table both
read, so a provider that moves its endpoint cannot leave the chooser measuring
one host while the engine calls another. `PUTER_DRIVERS_URL` and
`puterEnvelope(body)` are shared the same way — the gateway's request shape is
stated once rather than once per caller. Gemini's base is the AI SDK's own
default, so there the engine keeps the SDK's and only the probe reads the table.

## Config resolution

`resolveConfig(env, stored)` merges environment variables over stored values;
env always wins. The rules:

1. If `GEMINI_API_KEY` is set in env → provider is gemini, geminiKey is that value.
2. Else if `OPENAI_API_KEY` is set in env → provider is openai, openaiKey is that value.
3. Else if `ANTHROPIC_API_KEY` is set in env → provider is anthropic, anthropicKey is that value.
4. Else if `GROQ_API_KEY` is set in env → provider is groq, groqKey is that value.
5. Else if `OPENROUTER_API_KEY` is set in env → provider is openrouter,
   openrouterKey is that value.
6. Else if `PUTER_TOKEN` is set in env → provider is puter, puterToken is that
   value — last, so a direct provider key always outranks the gateway.
7. Else use `stored.provider`, falling back to "gemini" — the provider whose
   defaults every committed cassette is recorded with, so key-free replay
   (tests, tours) resolves the models the recordings used.
8. `TAMEDTABLE_MODEL` in env overrides the primary model from stored. An
   empty value counts as unset — like the `*_API_KEY` vars — and falls
   through to stored, then the provider default.
9. Keys not present in env keep their stored values (or null).
10. The final primary model must belong to the resolved provider; if it doesn't, replace it with `defaultModel(provider)`. A model id that belongs to **no** provider — one `providerFor` only reaches through its anthropic catch-all, without the `claude-` prefix — does not belong to anthropic either: it is replaced the same way, never sent to the API to 404.
11. `TAMEDTABLE_CELL_MODEL` in env overrides the secondary (`cellModel`) from stored; otherwise stored, otherwise `defaultCellModel(provider)`. An empty value counts as unset, as in rule 8.
12. The final `cellModel` must belong to the resolved provider too — cell calls never cross providers; if it doesn't (including a no-provider id, as in rule 10), replace it with `defaultCellModel(provider)`.

When multiple provider keys are set in env, gemini wins, then openai, then
anthropic, then groq, then openrouter, then puter. A model belongs to a
provider when `modelFor` finds it there — the check `providerFor` can't make for
a gateway.

`defaultModel(provider)` returns the `defaults[provider].primary` id (falling
back to the provider's first catalogue entry). `defaultCellModel(provider)`
returns `defaults[provider].secondary` (falling back to that provider's
primary default). Both read the table above — the ids are not restated here.

`providerFor(modelId)` is a **fallback, not the routing authority**. A model id
cannot say who serves it — `openai/gpt-oss-120b` is Groq's here, and OpenRouter
and half a dozen other hosts serve the same weights under the same name. So the
engine is **told** its provider (`createHeadlessRunner({ provider, … })`), which
the connection has known since the key named it. `providerFor` is what's left
for callers holding only an id: the benchmark sweeping a model off a command
line, and a stored config from an older build.

It reads the **catalogue first** — an id matching a catalogue entry exactly
returns that entry's provider — then falls back to prefixes:

- `openrouter` for any id containing `/` — every unknown vendor-prefixed id is
  an OpenRouter sweep candidate
- `anthropic` for any id starting with `claude-`
- `gemini` for any id starting with `gemini-`
- `cerebras` for any id starting with `zai-` or `gpt-oss-` — the `gpt-oss-`
  rule is checked **before** the `gpt-` rule, so open-weight OpenAI models
  served by Cerebras never land on the OpenAI provider
- `openai` for any other id starting with `gpt-`
- `anthropic` for anything left

The return type is `EngineProvider = Provider | 'cerebras'`. Groq and OpenRouter
are full app providers — chooser card, catalogue entry, `defaults` row, resolved
by `resolveConfig`; the engine routes their ids to each one's OpenAI-compatible
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

`keyFor(config)` returns the credential for `config.provider`, looked up
through `KEY_FIELD` — `geminiKey` for gemini, `puterToken` for puter, and so on
— or null when it is unset. Every surface that needs "the key for the active
provider" (the CLI, the web controller) uses this one helper so the
provider→key mapping lives in a single place.

`connectedProviders(config, order?)` returns the providers whose key is set. It
is what turns the stored config into the chooser's card list — a connected
provider *is* a provider with a key, so connecting needs no storage of its own.

The design orders cards **as they were added**, which the config alone cannot
say, so the optional second argument is a `Provider → timestamp` map and the
result is sorted by it. Providers missing from the map sort as `0` and the sort
is stable, so they keep catalogue order among themselves and sit ahead of the
timestamped ones — which is exactly right for a config written by a build that
predates the timestamps. Callers that only want "which providers have a key"
(the CLI, the fallback pick when a card is deleted) pass no map and get
catalogue order.

The timestamps live with the measurements (`connectedAt` in `tamedtable.probes`,
below), not in the config blob: card order is display, and the engine's input
stays exactly what the engine is built from.

## Checking a key — the probe

A key that is merely typed is not a key that works, and a price a user cannot
see is a price they find out about on their bill. The `probe.ts` entry point
answers both questions against the live provider. It is a separate entry point
because it is the only part of the module that touches the network; hosts
inject `fetch` so tests never do.

**`verifyKey(provider, key, { fetch })` → `{ tier }`** makes one small call and
returns the account tier, or throws. It is the gate: no card appears, and
nothing is stored, until it resolves. It answers in about a second because it
calls the cheap secondary model with a two-word prompt and no retries — a user
whose account is empty should not watch a spinner for a minute to learn what the
first response already said.

`tier` is `'free'`, `'paid'`, or `null` when the provider reports nothing.
Only real signals count; the chooser shows no tag rather than a guess:

| provider | tier read from |
|---|---|
| gemini | the `x-gemini-service-tier` response header: `free` → free, any other value → paid, **header absent → null** |
| openrouter | `GET /api/v1/key` → `is_free_tier` |
| openai, anthropic | always `paid` — neither provider has a free tier |
| groq, puter | `null` — neither publishes a tier signal |

The absent-header case is null and not paid on purpose. Google sends the header
on the endpoints and regions that have the tier concept and omits it elsewhere;
reading silence as "paid" labels a free-tier account with the one word that
tells its owner not to worry about the bill.

Puter is checked with `GET /whoami` rather than a model call: it proves the
token, costs nothing, and answers immediately.

Failures come back as one sentence the user can act on, named for the provider:
`Key rejected by Google. Check the key and try again.` (401/403),
`Google rate-limited the check. Wait a minute and try again.` (429),
`Could not reach Google.` (network or CORS), and anything else passes the
provider's own message through so no information is lost.

**Price is never measured.** It comes from the catalogue, shown per thousand
tokens (`inUsdPerMtok / 1000`), input and output separately. Providers do not
report what a call cost — only OpenRouter does, and one exception is not worth a
second source of truth. A model the catalogue doesn't price shows no price.

**`measureModel(provider, key, modelId, { fetch, now })` → `{ ttftSec,
tokPerSec }`** measures **speed only**, with one small streaming call: the same
twenty-row classification prompt the app runs, capped at 300 output tokens.
Timing splits in two, because a model call is two different things end to end:

```
ttftSec  = seconds until the first frame carrying text  — getting the model going
tokPerSec = outTok / (totalSec − ttftSec)               — generating, once started
```

"Carrying text" is the whole point of that first line. A stream opens with
frames that are not output: a role header, a `message_start`, a keep-alive
ping, and — on the thinking models — however many reasoning deltas the model
needs before it says anything. Stamping the first *frame* would report the time
to the cheapest byte on the wire and make a slow thinker look instant, so each
provider's frames are read as they arrive and only one with a non-empty text
delta stops the clock (Gemini's `candidates[].content.parts[].text`, skipping
parts marked `thought`; Anthropic's `content_block_delta`; `choices[].delta.content`
for everything OpenAI-compatible, and Puter's `{"type":"text"}` NDJSON).

A card's `~Z sec` is those two put back together for a thousand tokens:
`ttftSec + 1000 / tokPerSec`. Splitting them is what makes a small sample
extrapolate honestly — the startup cost is paid once per call whatever its
length, so folding it into a per-token average makes short answers look slow.
Measured against live providers, dividing a whole round trip by its tokens
inverted the ranking outright.

The 300-token cap is not arbitrary. At 100 a thinking model spends the entire
budget reasoning and never streams a word — `gemini-3.6-flash` returned 96
tokens in a single frame. Turning thinking off is not the answer either: Gemini
3.6 rejects `thinkingBudget: 0`, so the probe sends no reasoning options at all
and stays provider-neutral.

**When a provider buffers**, there is no separable first-token time: the reply
arrives in one or two frames at the very end. If no frame carried text, or the
streaming window is under a fifth of the call, the split is abandoned and the
whole call counts as generation (`ttftSec = 0`, `tokPerSec = outTok / totalSec`).
The estimate is then a plain average, which is the honest reading of a response
nobody watched arrive.

Measuring is slow (a free OpenRouter model took eleven seconds), so it never
blocks the card. `verifyKey` gates the card; the two measurements fill it in
afterwards, and each row reads `measuring…` until its own call lands. A
measurement that fails leaves the row reading `speed unknown` rather than the
card broken — the price still shows, and a working key is still a working key.
Saying so beats going blank: blank is what an unmeasured row looks like too.
The card's
**⟳ button re-runs both measurements** for that provider, so a number taken when
the provider was having a bad minute is one click from being replaced.

## Puter.js

Puter is a **gateway**, not a model provider: one account reaches 800-odd models
from every vendor, billed against one balance. It is connected like any other
provider — paste the credential — but three things about it are its own.

**The credential is a session token, not an API key.** A signed-in browser holds
it at `localStorage["puter.auth.token.v2"]`; the CLI reads `PUTER_TOKEN`. It is
a JWT, so `detectProvider` matches it on `eyJ` — the loosest of the prefixes,
since any JWT matches, which is why `verifyKey` has Puter confirm it before
anything is stored.

Only Puter's popup can mint one, which is what the chooser's **Sign in / Sign up
to Puter.js** button is for. The web app wires it to `browserPuterSignIn`: load
Puter's SDK, call `puter.auth.signIn()`, read the token back out of
localStorage, and hand it to the same connect path a pasted credential takes.
The SDK is fetched **on click, never on page load** — TamedTable's pages pull in
no third-party scripts, and a user who never touches Puter keeps it that way.
A dismissed popup resolves to null and is not an error.

**The transport is one endpoint.** `POST https://api.puter.com/drivers/call`
takes `{ interface: "puter-chat-completion", driver: "ai-chat", method:
"complete", args }`, where `args` is an OpenAI chat-completions body, and
answers `{ success, result }` with `result` an OpenAI choice —
`finish_reason: "tool_calls"` and `message.tool_calls[]` included. Close enough
to translate rather than reimplement: the engine points the ordinary OpenAI
client at a fetch that wraps the body and unwraps the reply
(`#PuterGateway` in `src/packages/headless/`), so tool calling, retries and
usage all stay on the path the other providers already use.

That translation always calls Puter **non-streaming**. Puter streams
newline-delimited JSON rather than SSE, and its streamed frames carry no tool
calls — which the patch turn depends on. The one place the engine streams is the
Python export, and there the finished script is replayed as a single frame: it
lands in one piece instead of typing out.

**Its models are other providers' models.** Puter's catalogue rows mirror the
Gemini defaults, at the same prices — Puter passes list price through. This is
what makes ids non-unique, and why `providerFor` skips Puter entirely: no id
could ever point at a gateway.

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

Measurements live in their **own** blob under `tamedtable.probes`, read and
written by `readStoredProbes` / `writeStoredProbes` / `clearStoredProbes`. They
are a display cache, not config: the engine never reads them, and losing them
costs a re-measure, not a working setup. Keeping them out of `tamedtable.config`
keeps the engine's input exactly what it was. Each provider's entry holds its
tier, the `connectedAt` timestamp the card order reads, and one reading per
role.

A reading records **which model it came from and when**, because both can go
stale under it. `models.json` picking a new default would otherwise show
yesterday's model's speed under today's model's name, and a provider that was
slow last month is not a provider that is slow now. So `readStoredProbes` drops
any reading whose `model` is no longer that role's default, or whose `at` is
more than seven days old. A dropped reading leaves the row without its `~Z sec`
tail rather than with a wrong one; the card's ⟳ button puts a fresh number
there. Nothing re-measures on its own — a panel that opens should not spend the
user's money without a click.

## Reading from env

`readConfigFromEnv()` reads `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
`OPENAI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `TAMEDTABLE_MODEL`, and
`TAMEDTABLE_CELL_MODEL` from `process.env` and returns them as a plain Record
suitable for passing as `resolveConfig`'s first argument. It is in a separate
`env.ts` export so environments without `process` (browser code) never import
it. Call it only on Node/Bun surfaces.

## How the CLI uses it

The CLI resolves config with `resolveConfig(readConfigFromEnv(), {})`, then
takes the active provider's key with `keyFor(config)` and forwards it to the
headless runner. The help text mentions `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
`OPENAI_API_KEY`, `GROQ_API_KEY`, and `OPENROUTER_API_KEY`.

## Model chooser component

`ModelChooser` is the panel a user connects providers in. It has three parts,
stacked in this order: the list of connected providers (or an empty row when
there are none), the "Already have an API key?" block that adds one, and the
supported-providers footer. There is no provider list to choose from before
connecting — the key names its own provider.

The footer reads `Google / OpenAI / Anthropic / OpenRouter / Groq`: the
providers a **pasted key** can belong to. Puter is deliberately not among them
even though it is a full provider — its credential comes from the sign-in
button below, not from the input the footer sits under, so naming it here would
send users looking for a Puter key to paste.

**Connected provider cards.** One card per connected provider, ordered as they
were added — the host passes the chooser an already-ordered list, which in the
web app and the demo is `connectedProviders(config, connectedAt)`. The header — the whole row is the click target — carries a radio
knob, the provider's display name (`Google API`, `OpenAI API`, `Anthropic API`,
`Groq API`, `OpenRouter API`), its tags, a **⟳ refresh** button and a delete
button. Tags are `FREE`
or `PAID` when the provider reported a tier and nothing when it didn't, plus
`VOICE` when that provider's primary model accepts audio input — read from the
catalogue, not hardcoded. Both buttons stop the click from also selecting the
card, and both carry an `aria-label` as well as a tooltip — they are icon-only,
so without one a screen reader announces "button". ⟳ re-runs that provider's
two measurements; its rows fall back to `measuring…` while they are out.

Only the **selected** card shows a body, and the selected card is the default
provider every run uses. The body has two rows, **Primary model** and
**Secondary model**, labelled in the same colour — the secondary is not a
lesser setting, it is the one that runs on every row. Each row puts its label
and model id on one line and the priced line beneath *both*, starting at the
row's left edge rather than indented under the id: indented it had a third of
the card in which to fit a sentence, and got clipped.

```
Primary model    gemini-3.6-flash
$0.0015 in / $0.0075 out per 1000 tok, ~9.4 sec
```

The prices are catalogue values per thousand tokens and are always there. The
`~Z sec` tail is the measurement, and it has four states, because "blank" was
telling the user three different things at once:

| state | tail |
|---|---|
| the call is out | `measuring…` |
| the numbers are in | `~9.4 sec` |
| the call came back an error | `speed unknown` |
| never measured | nothing |

A model the catalogue doesn't price shows only the tail.

**Adding a key.** One input and an Add button, enabled as soon as the input is
non-empty; Enter does the same thing as the button. The host detects, verifies,
stores, and selects — the component only reports the click. Typing clears the
error. While an add is in flight the input and button are disabled and the
button reads `Checking…`, so a slow provider cannot be double-submitted.

Errors render as one banner above the input:

- unrecognised prefix — `Key not recognised. Supported prefixes: AIza…, sk-proj-…, sk-ant-…, sk-or-…, gsk_….`
- whatever `verifyKey` threw, unchanged

A key for an **already-connected provider replaces it in place** and re-measures,
rather than erroring. The card has no key field, so a user whose key expired
would otherwise have to delete the card to fix it — and the design's own note
asks for exactly this.

**No API key?** Below the supported-providers footer, an `OR` divider, the line
`$25 in API credits for *any model* on Puter.js sign up.`, and a full-width
**Sign in / Sign up to Puter.js** button carrying Puter's mark.
Puter's credential is a session token that only its popup can mint, so the
button is the way in for a user with no API key at all. Once Puter is connected
the button turns green, reads `Connected to Puter.js`, and is inert. The whole
block — divider included — is rendered only when `onPuterSignIn` is supplied, so
a host that cannot open a sign-in window shows no button that would not work.

**Selecting and deleting.** Clicking any card header makes it the default; the
previously selected card collapses. Deleting removes the card and its key; if
it was the default, the default falls back to the last remaining card, or to
none, and the empty row returns.

The component is pure — props in, callbacks out — and holds no state at all. It
never touches storage or the network:

- `connected` — the cards to render: `{ id, tier, voice, primary, secondary }`.
  Each role is `{ model, inUsdPer1kTok, outUsdPer1kTok, speed }`: the two prices
  come from the catalogue (null for a model it doesn't price), and `speed` is
  the four-state measurement above. Both hosts turn a stored probe into that
  value with the component's exported `speedOf(reading, measuring)` — an absent
  reading is unmeasured, a null one failed, and only one place has to remember
  which. Display names live in the exported `PROVIDER_LABEL`, so a host never
  spells them out.
- `selected` — the default provider, or null when nothing is connected
- `keyInput`, `error`, `busy` — the add row's state
- `byokHelpUrl` — optional; renders the `How to get ↗` link beside the
  subtitle. The host supplies the path so the component carries no site URL,
  and the link is omitted when the prop is unset.
- `onKeyInputChange(v)`, `onAdd()`, `onSelect(p)`, `onRemove(p)`,
  `onRefresh(p)` — the ⟳ button; omit it and no card shows one
- `onPuterSignIn()` — the "No API key?" button; omit it and the block is left
  out entirely

The host owns all state and semantics. In the web app, `SettingsPanel` binds
the props to `WebController`. On the demo page, plain React state plays that
role and `resolveConfig` renders the resulting config live.

Styling comes only from `--mc-*` CSS custom properties, each with a default
that gives a presentable light look standalone. The host injects its theme by
setting the variables on any wrapping element: `--mc-ink`, `--mc-ink-on-ink`,
`--mc-ink2`, `--mc-ink3`, `--mc-surface`, `--mc-surface2`, `--mc-surface3`,
`--mc-line`, `--mc-line2`, `--mc-accent`, `--mc-accent-soft`, `--mc-ok`,
`--mc-ok-soft`, `--mc-err`, `--mc-err-soft`, `--mc-font-ui`, `--mc-font-mono`,
`--mc-radius`, `--mc-radius-sm`, `--mc-radius-lg`.

The **Add** button is filled `ink` on `ink-on-ink` once the input is non-empty,
which is the host's *primary* button — a deliberate departure from the
handoff's accent fill. This theme's accent is a pale sky, so an accent-filled
Add read as the quieter half of the pair rather than the action.

For tests, each element carries a stable data attribute: `data-mc-empty` on the
empty row, `data-mc-card`, `data-mc-tier`, `data-mc-voice` and `data-mc-remove`
keyed by provider id, `data-mc-model` (keyed by model id) plus `data-mc-role`
(`"primary"` or `"secondary"`) on each role row, `data-mc-model-id` on the id
itself and `data-mc-cost` on the line beneath it, `data-mc-refresh` on the ⟳
button, `data-mc-keyinput` and `data-mc-add` on the add row,
`data-mc-error` on the banner, `data-mc-providers` on the footer, `data-mc-puter` on the
Puter sign-in button, and `data-mc-byok` on the help link.

## Demo page

The demo (`demo.html` + `demo.tsx`, deployed under `/demos/model-config/`)
mounts the real `ModelChooser` over plain React state and shows the
`resolveConfig` result live. Two behaviors beyond the chooser itself:

- **Shared persistence.** On load the demo seeds its state from
  `readStoredConfig()` and writes every change back — the same localStorage
  blob the main app uses, so the keys and provider choice carry over between
  the app and the demo in both directions. A page load is not a change: with
  no interaction the stored blob is left byte-for-byte untouched. When a
  change is written, the demo's fields are merged over the stored blob, so
  fields the demo doesn't thread (`alwaysRunAll`) keep their persisted
  values instead of resetting to defaults. The models follow the provider
  defaults, so selecting a card repoints `model`/`cellModel` to that
  provider's two defaults.
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
