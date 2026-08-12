# Model config

The `@tamedtable/model-config` module owns provider detection, API key storage,
the model catalogue, and the model chooser UI for every surface that calls an
LLM. Types, signatures and the full prop list are in
[code-contract.md § Model config](../../code-contract.md#model-config); this
document is the behavior and the reasons.

Five entry points, so a host pays only for what it uses: `index.ts` (zero
runtime dependencies, any JS environment), `ModelChooser.tsx` (React),
`storage.ts` (localStorage), `env.ts` (Node/Bun), and `probe.ts` — the only
part that touches the network.

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
measured.

## Detecting the provider from the key

The user never picks a provider from a list — they paste a key and its prefix
names the provider. The prefix table is in the code contract; two things about
it are behavior. Order matters: `sk-proj-`, `sk-ant-` and `sk-or-` all start
with `sk-`, so the generic OpenAI rule is tested last or it swallows all three.
And `eyJ` (the base64 of `{"alg":`) is the loosest rule there is, because a
Puter credential is a JWT and *any* JWT matches.

A prefix is a guess, not proof. Nothing is stored until `verifyKey` has had the
provider itself confirm the key.

## Model catalogue

One canonical home:
[`models.json`](../../../src/packages/model-config/models.json) — `models`
(every model with its per-Mtok prices) and `defaults` (each provider's primary
+ secondary ids, plus an optional pinned `batchSize`). The user connects a
**provider**, not individual models; `defaults` decides the two roles.

`models` mirrors [`benchmarks/models.jsonl`](../../../benchmarks/models.jsonl)
— same ids, same prices, and a bench test enforces that every catalogue id has
a pricing row there. Membership: the paid providers get `models.jsonl` minus
`runnable: false`; OpenRouter gets only the `defaults` pick, since the other
`:free` rows are bench-only sweep candidates. `ALL_MODELS` is that array,
imported — neither the code nor this spec duplicates the list, because a copy
here went stale once already. Every id is verified against the provider's
current docs before it changes; none is ever guessed.

OpenRouter is the free tier: one $0 model fills both roles. Its `defaults` row
pins `batchSize: 5` — the [2026-07-17 benchmark](../../../process/journal/2026-07-17-free-model-benchmark-run.md)
measured `cohere/north-mini-code:free` at 96% accuracy at batch 5 and sharply
worse at 40+. Groq serves open-weight models on its own hardware and is the
fastest and cheapest of the paid providers — see the
[2026-08-11 provider probe](../../../process/journal/2026-08-11-model-chooser-provider-probe.md).

Ids are **not unique**. Puter is a gateway that re-serves other providers'
models under their own names, so `gemini-3.6-flash` appears twice in the
catalogue — once as Google's, once as Puter's. Anything reading a price, a
voice flag or a temperature flag must go through `modelFor(provider, id)`;
`ALL_MODELS.find(m => m.id === …)` would silently pick whichever came first.

## Config resolution

`resolveConfig(env, stored)` merges env over stored; env always wins. When
several provider keys are in env the order is gemini, openai, anthropic, groq,
openrouter, **puter last** — a direct provider key always outranks the gateway.
With no env key the stored provider is used, falling back to gemini: that is
the provider every committed cassette is recorded with, so key-free replay
(tests, tours) resolves the models the recordings used.

Both models are then guarded to the resolved provider — cell calls never cross
providers — and a model belonging to **no** provider is coerced to the default
rather than sent to the API to 404. An empty env value (`TAMEDTABLE_MODEL=` in
a `.env`) counts as unset, like the `*_API_KEY` vars. Membership is
`modelFor`'s answer, not `providerFor`'s: only the catalogue can place an id
that a gateway also serves.

### providerFor is a fallback, not the routing authority

A model id cannot say who serves it. `openai/gpt-oss-120b` is Groq's here, and
OpenRouter and half a dozen other hosts serve the same weights under the same
name. So the engine is **told** its provider
(`createHeadlessRunner({ provider, … })`), which the connection has known since
the key named it. `providerFor` is what is left for callers holding only an id:
the benchmark sweeping a model off a command line, and a stored config from an
older build. It reads the catalogue first, then prefixes (the rule list is in
the code contract), and never returns `puter` — no id could point at a gateway.

Groq and OpenRouter are full app providers: catalogue entry, `defaults` row,
chooser card, resolved by `resolveConfig`. Cerebras stays **bench-only** — the
engine routes its ids and the benchmark sweeps them, but it has no catalogue
entry and no card, and `resolveConfig` never resolves it. The non-default
`:free` OpenRouter ids are sweep-only the same way.

### Where each provider lives

Two things reach a provider's API: the engine, through the AI SDK clients, and
the probe that checks a pasted key. `PROVIDER_BASE_URL` is the one table both
read, so a provider that moves its endpoint cannot leave the chooser measuring
one host while the engine calls another. `PUTER_DRIVERS_URL` and
`puterEnvelope(body)` are shared the same way. Gemini's base is the AI SDK's own
default, so there the engine keeps the SDK's and only the probe reads the table.

### Card order

`connectedProviders(config, order?)` turns the stored config into the chooser's
card list — a connected provider *is* a provider with a key, so connecting
needs no storage of its own. The design orders cards **as they were added**,
which the config alone cannot say, so the optional map is
`Provider → timestamp` and the result is sorted by it. Providers missing from
the map sort as `0` under a stable sort, so they keep catalogue order among
themselves and sit ahead of the timed ones — right for a config written before
the timestamps existed. Callers that only want "which providers have a key"
(the CLI, the fallback pick when a card is deleted) pass no map.

The timestamps live with the measurements (`connectedAt` in
`tamedtable.probes`), not in the config blob: card order is display, and the
engine's input stays exactly what the engine is built from.

## Checking a key — the probe

A key that is merely typed is not a key that works, and a price a user cannot
see is a price they find out about on their bill. `probe.ts` answers both
against the live provider; hosts inject `fetch` so tests never do.

**`verifyKey`** makes one small call and returns the account tier, or throws.
It is the gate: no card appears, and nothing is stored, until it resolves. It
answers in about a second — the cheap secondary model, a two-word prompt, no
retries — because a user whose account is empty should not watch a spinner for
a minute to learn what the first response already said. Puter is checked with
`GET /whoami` instead: it proves the token, costs nothing, answers instantly.

`tier` is only ever a real signal (per-provider sources in the code contract);
where a provider reports nothing the chooser shows no tag rather than a guess.
Google's absent header in particular reads as `null`, **not** paid: Google
sends it where the tier concept applies and omits it elsewhere, and reading
silence as "paid" labels a free-tier account with the one word that tells its
owner not to worry about the bill.

Failures come back as one sentence the user can act on, named for the provider
(`Key rejected by Google. Check the key and try again.`); anything unrecognised
passes the provider's own message through so no information is lost. An account
with no credit left arrives as a 429 alongside real rate limits, so the quota
case is tested first — "wait a minute" would send that user into a wait that
never ends.

**Price is never measured.** It comes from the catalogue, shown per thousand
tokens, input and output separately. Providers do not report what a call cost —
only OpenRouter does, and one exception is not worth a second source of truth.

**`measureModel`** measures **speed only**, with one streaming call: the same
twenty-row classification prompt the app runs, capped at 300 output tokens.
Timing splits in two, because a model call is two different things end to end:

```
ttftSec   = seconds until the first frame carrying text  — getting going
tokPerSec = outTok / (totalSec − ttftSec)                — generating
```

A card's `~Z sec` is those two put back together for a thousand tokens:
`ttftSec + 1000 / tokPerSec`. Splitting them is what makes a small sample
extrapolate honestly — the startup cost is paid once per call whatever its
length, so folding it into a per-token average makes short answers look slow.
Measured against live providers, dividing a whole round trip by its tokens
inverted the ranking outright.

"Carrying text" is the whole point of the first line. A stream opens with
frames that are not output — a role header, a `message_start`, a keep-alive
ping, and on a thinking model however many reasoning deltas it needs before it
says anything. Stamping the first *frame* would time the cheapest byte on the
wire and make a slow thinker look instant, so frames are parsed as they arrive
and only one with a non-empty text delta stops the clock (Gemini's
`candidates[].content.parts[].text`, skipping parts marked `thought`;
Anthropic's `content_block_delta`; `choices[].delta.content` for everything
OpenAI-compatible; Puter's `{"type":"text"}` NDJSON).

The 300-token cap is not arbitrary: at 100 a thinking model spends the whole
budget reasoning and never streams a word (`gemini-3.6-flash` returned 96
tokens in one frame), and turning thinking off is not the answer either since
Gemini 3.6 rejects `thinkingBudget: 0`. The probe therefore sends no reasoning
options at all and stays provider-neutral.

**When a provider buffers** there is no separable first-token time — the reply
arrives in a frame or two at the very end. If no frame carried text, or under a
fifth of the call was spent streaming, the split is abandoned and the whole
call counts as generation. The estimate becomes a plain average, which is the
honest reading of a response nobody watched arrive.

Measuring is slow (a free OpenRouter model took eleven seconds), so it never
blocks the card: `verifyKey` gates the card and the two measurements fill it in
afterwards, each row reading `measuring…` until its own call lands. The card's
**⟳ button re-runs both**, so a number taken while the provider was having a
bad minute is one click from being replaced.

## Puter.js

Puter is a **gateway**, not a model provider: one account reaches 800-odd
models from every vendor, billed against one balance. It connects like any
other provider, but three things about it are its own.

**The credential is a session token, not an API key.** The CLI reads
`PUTER_TOKEN`; in the browser only Puter's own sign-in window can mint one,
which is what the chooser's **Sign in / Sign up to Puter.js** button is for. The
web app wires it to `browserPuterSignIn`: load Puter's SDK, call
`puter.auth.signIn()`, and hand the token it resolves with to the same connect
path a pasted credential takes. The SDK is fetched **on click, never on page
load** — TamedTable's pages pull in no third-party scripts, and a user who never
touches Puter keeps it that way.

Three things about that flow are the difference between it working and it
looking broken:

- **The token comes from the answer**, with the SDK's
  `localStorage["puter.auth.token.v2"]` copy as a fallback. Reading only
  storage meant a sign-in that succeeded but could not write (private mode,
  partitioned storage) came back as `null` — which the caller reads as "the
  user cancelled" and answers by doing nothing.
- **Only a closed window is silent.** `auth_window_closed` is the user changing
  their mind and resolves to null; everything else throws and lands in the
  error banner. A browser-blocked window gets its own sentence — *Your browser
  blocked the Puter.js sign-in window. Allow pop-ups for this site and try
  again.* — because the old catch-all turned it into a click that appeared not
  to register.
- **The button says it started.** While the sign-in is out it reads
  `Signing in…` and is disabled, and a click on the panel's backdrop no longer
  closes it. All of this happens behind a window sitting in front of the panel;
  a panel that looks untouched when the user comes back is a panel that looks
  broken.

**Deleting the Puter card signs out.** Every other card holds a key the user
has their own copy of, so deleting it only forgets ours. Puter's is a session,
and the SDK keeps its own copy — so `removeProvider('puter')` also calls
`browserPuterSignOut`, which drops the SDK's stored token. Without it, a user
who deleted the card and signed in again would be handed the same account back
with no way to switch. The sign-out is deliberately local: no SDK load, no
network call, because deleting a card has to work on a page that never loaded
Puter.js.

**The transport is one endpoint.** `POST /drivers/call` takes an envelope whose
`args` are an OpenAI chat-completions body and answers with an OpenAI choice,
tool calls included — close enough to translate rather than reimplement. The
engine points the ordinary OpenAI client at a fetch that wraps the body and
unwraps the reply (`#PuterGateway` in `src/packages/headless/`), so tool
calling, retries and usage stay on the tested path. It always calls Puter
**non-streaming**: Puter streams NDJSON rather than SSE and its streamed frames
carry no tool calls, which the patch turn depends on. The one streaming caller
is the Python export, and there the finished script is replayed as a single
frame — it lands in one piece instead of typing out.

**Its models are other providers' models**, at the same prices — Puter passes
list price through. That is what makes ids non-unique.

## Storage

`storage.ts` implements `StoragePort` over localStorage, persisting config as
one JSON blob under `tamedtable.config`; an old `tamedtable.apiKey` value
migrates to `{ anthropicKey: … }` on first read. Every helper is a no-op
without localStorage and swallows storage exceptions. The web app and the demo
page share it, so keys entered in one show up in the other (same origin).

Measurements live in their **own** blob under `tamedtable.probes`. They are a
display cache, not config: the engine never reads them, and losing them costs a
re-measure rather than a working setup, so keeping them out of
`tamedtable.config` keeps the engine's input exactly what it was. Each entry
holds the tier, the `connectedAt` the card order reads, and one reading per
role.

A reading records **which model it came from and when**, because both go stale
under it: `models.json` picking a new default would show yesterday's model's
speed under today's model's name, and a provider that was slow last month is
not a provider that is slow now. `readStoredProbes` drops any reading whose
model is no longer that role's default or whose age passes a week. A dropped
reading leaves the row without its `~Z sec` tail rather than with a wrong one,
and ⟳ puts a fresh number there. Nothing re-measures on its own — a panel that
opens should not spend the user's money without a click.

## Reading from env, and the CLI

`readConfigFromEnv()` (in `env.ts`, Node/Bun only) reads the provider key vars
plus `TAMEDTABLE_MODEL` / `TAMEDTABLE_CELL_MODEL` from `process.env` as a plain
Record for `resolveConfig`'s first argument. The CLI calls
`resolveConfig(readConfigFromEnv(), {})`, takes the active provider's key with
`keyFor(config)`, and forwards it to the headless runner.

## Model chooser component

Three parts, stacked: the list of connected providers (or an empty row), the
"Already have an API key?" block that adds one, and the supported-providers
footer. There is no provider list to choose from before connecting — the key
names its own provider.

**Instructions, in the panel.** Under the input sits
`Instructions: Google/OpenAI/Anthropic/OpenRouter/Groq` — one line, the
separators carrying no space of their own so five names and four slashes fit,
with a few pixels of padding on each label to keep it off them. Each provider
is a button that expands a short
paragraph and, on its own row, a link straight to that provider's key page. One
is open at a time, the open one is underlined (and carries `aria-expanded`), and
clicking it again closes it. The link row ends with `(starts with AIza…)` —
the prefixes used to live in the input's placeholder, which is exactly where a
user cannot read them once they have pasted something. Puter is
deliberately absent even though it is a full provider — its credential comes
from the sign-in button below, not from this input, so naming it here would
send users looking for a Puter key to paste.

This replaces a `How to get ↗` link to the FAQ. The user who needs the
instructions is standing in front of this input, and a new tab onto a page
covering six providers is a round trip many never come back from.

The text comes from `KEY_SETUP` in the package — one ordered table of
`{ provider, label, steps, url, action }`, which also supplies the row's
labels, so the list of providers is stated once. The FAQ keeps its own longer
BYOK cards; the two are **allowed to differ in prose and not in destination**,
and a test asserts every `KEY_SETUP` URL appears in `FAQ.html`. A key page that
moves would otherwise leave one of the two pointing at nothing.

**Connected provider cards.** One per connected provider, in the order the host
passes them (see *Card order*). The header — the whole row is the click target
— carries a radio knob, the provider's display name, its tags, a ⟳ refresh
button and a delete button. Tags are `FREE`/`PAID` when the provider reported a
tier and nothing when it didn't, plus `VOICE` when that provider's primary
model accepts audio input, read from the catalogue rather than hardcoded. Both
buttons stop the click from also selecting the card, and both carry an
`aria-label` as well as a tooltip — they are icon-only, so without one a screen
reader announces "button".

Only the **selected** card shows a body, and the selected card is the default
provider every run uses. The body has two rows, **Primary model** and
**Secondary model**, labelled in the same colour — the secondary is not a
lesser setting, it is the one that runs on every row. Each row puts its label
and model id on one line and the priced line beneath *both*, starting at the
row's left edge rather than indented under the id: indented, it had a third of
the card in which to fit a sentence, and got clipped.

```
Primary model    gemini-3.6-flash
$0.0015 in / $0.0075 out per 1000 tok, ~9.4 sec
```

The prices are catalogue values per thousand tokens (a model the catalogue
doesn't price shows only the tail). A provider whose `defaults` row is marked
`priceVariesByPlan` shows **`Price depends on your plan`** in their place —
Groq is the one: its free tier costs nothing and its API cannot say which tier
a key is on, so the catalogue's paid number is wrong for most Groq accounts,
and a wrong price is worse than an admitted unknown. The `~Z sec` tail has four
states, because "blank" was telling the user three different things at once:

| state | tail |
|---|---|
| the call is out | `measuring…` |
| the numbers are in | `~9.4 sec` |
| the call came back an error | `speed unknown` |
| never measured | nothing |

Both hosts derive that value with `speedOf(reading, measuring)` — an absent
reading is unmeasured, a null one failed — so only one place has to remember
which is which.

**Adding a key.** One input reading `Paste an API key here` and an Add button,
enabled as soon as the input is non-empty; Enter does the same thing. The host
detects, verifies, stores and selects — the component only reports the click.
Typing clears the error. While
an add is in flight the input and button are disabled and the button reads
`Checking…`, so a slow provider cannot be double-submitted. Errors render as
one banner above the input: the unrecognised-prefix message, or whatever
`verifyKey` threw, unchanged.

A key for an **already-connected provider replaces it in place** and
re-measures, rather than erroring. The card has no key field, so a user whose
key expired would otherwise have to delete the card to fix it.

**No API key?** Below the instructions row, a full-width
**Sign in / Sign up to Puter.js** button carrying Puter's mark, with
`$0.25 in API credits for any model on Puter.js sign up.` underneath it — it is
the reason to press the button, which reads better as a footnote than as a
preamble. There is no `OR` divider: the host's section heading above the whole
chooser already separates it from what comes next, and a second separator
*inside* one section only competed with it. Once Puter is connected the button
turns green, reads `Connected to Puter.js`, and is inert. The whole block —
divider included — renders only when `onPuterSignIn` is supplied, so a host
that cannot open a sign-in window shows no button that would not work.

**Selecting and deleting.** Clicking any card header makes it the default; the
previously selected card collapses. Deleting removes the card and its key; if
it was the default, the default falls back to the last remaining card, or to
none, and the empty row returns.

The component is pure — props in, callbacks out, no storage, no network — and
holds exactly one piece of state: which provider's instructions are expanded.
That is ephemeral display state the host has no use for (nothing is stored,
nothing is resolved from it), so threading it through two hosts would buy
nothing. Everything else the host owns: `SettingsPanel` binds the props
to `WebController` in the app, and plain React state does it on the demo page.

Styling comes only from `--mc-*` CSS custom properties (listed in the code
contract), each with a default that gives a presentable light look standalone;
the host injects its theme by setting them on any wrapping element. The **Add**
button fills with `ink` on `ink-on-ink` once the input is non-empty — the
host's *primary* button, and a deliberate departure from the handoff's accent
fill, because this theme's accent is a pale sky and an accent-filled Add read
as the quieter half of the pair rather than the action.

## Demo page

The demo (`demo.html` + `demo.tsx`, under `/demos/model-config/`) mounts the
real `ModelChooser` over plain React state and shows the `resolveConfig` result
live. Its chooser runs against a **stub** provider — a demo page that billed
real accounts, or needed a real key to show anything, would do its job badly.
Two behaviors beyond the chooser itself:

- **Shared persistence.** On load the demo seeds from `readStoredConfig()` and
  writes every change back to the same blob the main app uses, so keys and the
  provider choice carry over in both directions. A page load is not a change:
  with no interaction the stored blob is left byte-for-byte untouched. A
  written change merges the demo's fields over the stored blob, so fields the
  demo doesn't thread (`alwaysRunAll`) keep their persisted values.
- **Test call.** Below the resolved config, a dev harness — query input
  (`#tc-input`), Send (`#tc-send`), response (`#tc-response`) — issues one
  *real* completion call to the selected provider/model with the resolved key.
  A model with `voiceInput: true` also gets a press-and-hold mic (`#tc-mic`),
  matching the main app: the audio itself is the query, sent in one round trip
  asking for JSON with both a verbatim transcript and the answer. The
  transcript fills the input (so the user sees what the model heard), the
  answer lands in the response field, and an unparseable reply drops its raw
  text there instead — no separate transcription call either way.
