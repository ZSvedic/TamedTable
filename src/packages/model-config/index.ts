// #ModelConfig
// Provider/key/model catalogue and config resolution.
// Zero runtime dependencies, no process, no DOM references.

import catalogue from './models.json' with { type: 'json' };

export type Provider = 'anthropic' | 'gemini' | 'openai' | 'groq' | 'openrouter' | 'puter';

/** What a provider says about the account behind a key. `null` means the
 *  provider reports nothing: the chooser then shows no tag rather than a
 *  guess. See spec § Checking a key. */
export type Tier = 'free' | 'paid' | null;

/** Providers the engine can route a model id to. Cerebras is bench-only: the
 *  engine calls its OpenAI-compatible endpoint (free tier), the benchmark
 *  sweeps its models, but it has no catalogue entry, no defaults row, and no
 *  chooser card: `resolveConfig` never resolves it. */
export type EngineProvider = Provider | 'cerebras';

export interface ModelDef {
  id: string;
  name: string;
  provider: Provider;
  /** Whether the model still accepts a `temperature` sampling parameter. */
  temperature: boolean;
  voiceInput: boolean;
  /** Input price, US$ per million tokens. Mirrors benchmarks/models.jsonl. */
  inUsdPerMtok: number;
  /** Output price, US$ per million tokens. Mirrors benchmarks/models.jsonl. */
  outUsdPerMtok: number;
}

/** The chat + cell model ids chosen as a provider's defaults, plus an optional
 *  pinned cell batch size where the benchmark found a cliff. */
export interface ProviderDefaults {
  chat: string;
  cell: string;
  batchSize?: number;
  /** A second model set for a provider that serves both free and paid models.
   *  OpenRouter is the only one: its `:free` ids are all a $0 account can
   *  reach, while an account with credits can reach everything it proxies. */
  paid?: { chat: string; cell: string; batchSize?: number };
  /** The catalogue price is not necessarily what this provider's user pays.
   *  Groq's free tier costs nothing and is indistinguishable from a paid key
   *  over the API (same models, same headers) so quoting the paid price
   *  would be wrong for most Groq accounts. See `priceVariesByPlan`. */
  priceVariesByPlan?: boolean;
}

export interface ResolvedConfig {
  provider: Provider;
  anthropicKey: string | null;
  geminiKey: string | null;
  openaiKey: string | null;
  groqKey: string | null;
  openrouterKey: string | null;
  /** Puter.js session token, not an API key: see § Puter.js. */
  puterToken: string | null;
  /** Chat model: answers the request and writes the spec patch each turn (and
   *  carries voice input). Named `model` because it is the config's main one. */
  model: string;
  /** Cell model: fills per-row LLM cells. Always same-provider as `model`. */
  cellModel: string;
  /** Run OpenRouter's paid model set rather than its `:free` one. Off by
   *  default: having credits is not the same as wanting to spend them, so the
   *  user asks for this on the card. Ignored for every other provider. */
  openrouterPaid: boolean;
  /** Simple mode: "Always run on all rows" (#LazyExec): every AI step runs
   *  table-wide immediately, with the estimate dialog gating runs of more
   *  than one page. Off by default. */
  alwaysRunAll: boolean;
}

export interface StoragePort {
  read(): Partial<ResolvedConfig>;
  write(c: Partial<ResolvedConfig>): void;
  clear(): void;
}

// ── Model catalogue ────────────────────────────────────────────────────────
// One canonical home: models.json, two sections. `models` lists every
// available model with its per-Mtok prices (mirrors benchmarks/models.jsonl);
// `defaults` maps each provider to its chat + cell model ids.
// The user no longer picks individual models: they pick a provider, and the
// defaults below decide the two roles. Every id must be verified against the
// provider's current docs before changing, never guess an id.

export const ALL_MODELS: readonly ModelDef[] =
  (catalogue as { models: ModelDef[] }).models;

export const DEFAULTS: Readonly<Record<Provider, ProviderDefaults>> =
  (catalogue as { defaults: Record<Provider, ProviderDefaults> }).defaults;

// ── Helpers ────────────────────────────────────────────────────────────────

/** The model set in force for a provider: its paid set when one exists and the
 *  caller asked for it, otherwise the plain defaults. */
function setFor(provider: Provider, paid = false): ProviderDefaults | undefined {
  const d = DEFAULTS[provider];
  if (!d) return undefined;
  return paid && d.paid ? { ...d, ...d.paid, batchSize: d.paid.batchSize } : d;
}

/** Default chat (patch-turn) model for a provider: the `defaults` entry for
 *  that provider, falling back to the provider's first catalogue entry. */
export function defaultModel(provider: Provider, paid = false): string {
  return setFor(provider, paid)?.chat
    ?? ALL_MODELS.find((m) => m.provider === provider)!.id;
}

/** Whether this provider offers a paid model set as well as a free one, which
 *  is what puts the free/paid choice on its card. OpenRouter is the only one. */
export function hasPaidModelSet(provider: Provider): boolean {
  return DEFAULTS[provider]?.paid !== undefined;
}

/** The catalogue entry for one model **as served by one provider**. Ids are not
 *  unique on their own: Puter re-serves `gemini-3.6-flash` under that exact
 *  name, so anything reading a model's price, voice support or temperature
 *  flag has to say who is serving it. */
export function modelFor(provider: Provider, modelId: string): ModelDef | undefined {
  return ALL_MODELS.find((m) => m.provider === provider && m.id === modelId);
}

/** Default per-row cell model for a provider: the `defaults` entry for that
 *  provider, falling back to that provider's chat default. Always same-provider:
 *  cell calls never cross providers. */
export function defaultCellModel(provider: Provider, paid = false): string {
  return setFor(provider, paid)?.cell ?? defaultModel(provider, paid);
}

/** Whether this provider's catalogue price might not be the price the user
 *  pays, because it has a free tier we cannot detect. Two qualify, for the same
 *  reason: Groq's free tier is $0 and its API says nothing about which tier a
 *  key is on, and Google's is the same once you know that
 *  `x-gemini-service-tier` reports the inference tier rather than a billing one
 *  (see § Checking a key). Quoting the paid rate to a free-tier user is a
 *  number that is wrong for a great many of them, so the card names none. */
export function priceVariesByPlan(provider: Provider): boolean {
  return DEFAULTS[provider]?.priceVariesByPlan === true;
}

/** The provider's pinned cell batch size from `defaults`, or undefined when it
 *  has none (the engine then keeps its own default). Openrouter pins 5: the
 *  2026-07-17 benchmark's north-mini sweet spot. */
export function defaultBatchSize(provider: Provider, paid = false): number | undefined {
  return setFor(provider, paid)?.batchSize;
}

/** The provider that serves a model id. The catalogue is asked first: an exact
 *  match returns its own `provider`, which is what keeps Groq's vendor-prefixed
 *  ids (`openai/gpt-oss-120b`) off OpenRouter and makes the next provider a
 *  data change rather than a new prefix rule. Ids the catalogue doesn't know:
 *  bench-only sweep candidates, dated aliases, anything new: fall back to
 *  prefixes: a slash means an OpenRouter vendor/model id, and `gpt-oss-` is
 *  checked before `gpt-` so the open-weight OpenAI models served by Cerebras
 *  never land on the OpenAI provider. Unknown ids end on 'anthropic'. */
export function providerFor(modelId: string): EngineProvider {
  // Puter is skipped on purpose: it is a gateway that re-serves other
  // providers' models under their own ids, so no id could ever point at it.
  // Every Puter connection reaches the engine with an explicit provider.
  const known = ALL_MODELS.find((m) => m.provider !== 'puter' && m.id === modelId);
  if (known)                          return known.provider;
  if (modelId.includes('/'))          return 'openrouter';
  if (modelId.startsWith('gemini-'))  return 'gemini';
  if (modelId.startsWith('zai-'))     return 'cerebras';
  if (modelId.startsWith('gpt-oss-')) return 'cerebras';
  if (modelId.startsWith('gpt-'))     return 'openai';
  return 'anthropic';
}

// ── Where each provider lives ──────────────────────────────────────────────
// Two things reach these hosts: the engine (via the AI SDK clients) and the
// probe that checks a pasted key. They used to carry their own copies of the
// URLs, which is a drift waiting to happen: a provider that moves its
// endpoint would have left the chooser measuring one host while the engine
// called another. One table instead.

/** Each provider's API base. Gemini's is the AI SDK's own default too, so the
 *  engine leaves that one to the SDK and only the probe reads it here. */
export const PROVIDER_BASE_URL = {
  gemini:     'https://generativelanguage.googleapis.com/v1beta',
  openai:     'https://api.openai.com/v1',
  anthropic:  'https://api.anthropic.com/v1',
  groq:       'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  cerebras:   'https://api.cerebras.ai/v1',
  // Puter is a gateway, not an API in the usual sense: one endpoint takes an
  // envelope whose `args` happen to be an OpenAI chat-completions body.
  puter:      'https://api.puter.com',
} as const satisfies Record<EngineProvider, string>;

/** Puter's single endpoint: see `puterEnvelope`. */
export const PUTER_DRIVERS_URL = `${PROVIDER_BASE_URL.puter}/drivers/call`;

/** Wrap an OpenAI-shaped request body in Puter's driver envelope. Shared by the
 *  engine's gateway fetch and the probe, so the two cannot disagree about the
 *  shape Puter expects. */
export function puterEnvelope(body: Record<string, unknown>): Record<string, unknown> {
  return {
    interface: 'puter-chat-completion',
    driver: 'ai-chat',
    method: 'complete',
    args: body,
  };
}

// ── Detecting a provider from a pasted key ─────────────────────────────────
// The user never picks a provider from a list: the key names it. Order
// matters here: sk-proj-, sk-ant- and sk-or- all start with sk-, so the
// generic OpenAI rule is tested last or it would swallow all three.

const KEY_PREFIXES: ReadonlyArray<readonly [string, Provider]> = [
  ['sk-proj-', 'openai'],
  ['sk-ant-',  'anthropic'],
  ['sk-or-',   'openrouter'],
  ['gsk_',     'groq'],
  // Google issues two shapes. `AIza…` is the old Standard key; `AQ.Ab…` is the
  // auth key every new AI Studio key has been since mid-2026, and Google
  // rejects Standard keys from September 2026. Matching only `AIza` turned
  // every freshly minted Gemini key into "key not recognised".
  ['AIza',     'gemini'],
  ['AQ.',      'gemini'],
  // A Puter token is a JWT, so it opens with the base64 of `{"alg":`. Looser
  // than the others, any JWT matches, but no other provider issues one, and
  // verifyKey has Puter confirm it before anything is stored.
  ['eyJ',      'puter'],
  ['sk-',      'openai'],
];

/** What each provider is called in prose: the probe's error sentences, the
 *  chooser's card headers and its instructions row all read from here. It used
 *  to be spelled out in three places, which is three chances to rename Groq
 *  everywhere but one. */
export const PROVIDER_NAME = {
  gemini:     'Google',
  openai:     'OpenAI',
  anthropic:  'Anthropic',
  groq:       'Groq',
  openrouter: 'OpenRouter',
  puter:      'Puter.js',
} as const satisfies Record<Provider, string>;

// ── How to get a key ───────────────────────────────────────────────────────
// The five providers a key can be pasted for, in the order the chooser names
// them, each with the short version of the FAQ's instructions. Puter is absent:
// its credential comes from the sign-in button, not from the key input.
//
// The console URLs are the part that must not drift from the FAQ, a test
// asserts each one appears there. The prose is deliberately allowed to differ:
// the FAQ is the long form, this is the two lines that fit in a 400px panel.

/** One how-to line. Usually plain text; the object form carries a single
 *  inline link: the text before it, the linked text itself, its href, and the
 *  text after: for the one beat that points a user off to a tutorial. */
export type Step =
  | string
  | { before?: string; text: string; href: string; after?: string };

export interface KeySetup {
  provider: Provider;
  /** What this provider's keys start with, shown beside the link so a user
   *  can check the thing they just copied. Also the display list
   *  `SUPPORTED_PREFIXES` is built from. */
  prefix: string;
  /** Three or four short lines in one fixed order: what it costs, who it
   *  suits, whether the key can be re-read later, and the one extra
   *  requirement where a provider has one. Same beats in the same places for
   *  every provider, because this section exists to be compared. Google is the
   *  exception: its cost beat is an inline link to Puter's key-creation
   *  tutorial rather than a plan name. */
  steps: readonly Step[];
  /** The provider we steer a new user to. Its first line is the reason why, and
   *  the chooser sets that line in bold. At most one provider carries this: a
   *  recommendation that names two things is not a recommendation. */
  recommended?: true;
  /** Where the key is created. */
  url: string;
  /** The link's text. */
  action: string;
}

export const KEY_SETUP: readonly KeySetup[] = [
  {
    provider: 'gemini',
    recommended: true,
    // The shape a user minting a key today gets. Old `AIza…` keys still match
    // in KEY_PREFIXES; they are just not what we tell anyone to look for.
    prefix: 'AQ.Ab…',
    steps: [
      // Why this one, before anything else: the four things a new user is
      // choosing between providers on.
      'Recommended: voice input, a generous free tier, accurate and fast.',
      {
        before: 'Puter has a ',
        text: 'tutorial on how to create a new free API key ↗',
        href: 'https://developer.puter.com/tutorials/how-to-get-gemini-api-key/',
        after: '.',
      },
      'Keys stay viewable, so you can come back for yours later.',
    ],
    url: 'https://aistudio.google.com/apikey',
    action: 'Create a Gemini API key',
  },
  {
    provider: 'openai',
    prefix: 'sk-proj-…',
    steps: [
      'Paid only.',
      'Best if you already buy OpenAI API credits (separate from a ChatGPT subscription).',
      'The key is shown once, so copy it straight away.',
    ],
    url: 'https://platform.openai.com/api-keys',
    action: 'Create an OpenAI API key',
  },
  {
    provider: 'anthropic',
    prefix: 'sk-ant-…',
    steps: [
      'Paid only.',
      'Best if you already buy Anthropic API credits (separate from a Claude subscription).',
      'The key is shown once, so copy it straight away.',
    ],
    url: 'https://console.anthropic.com/settings/keys',
    action: 'Create an Anthropic API key',
  },
  {
    provider: 'openrouter',
    prefix: 'sk-or-…',
    steps: [
      'Free and paid plans.',
      'Free models are slow and can drop rows on large batches.',
      'The key is shown once, so copy it straight away.',
      'To use free models at all, you must let them train on your prompts, in OpenRouter privacy settings.',
    ],
    url: 'https://openrouter.ai/settings/keys',
    action: 'Create an OpenRouter API key',
  },
  {
    provider: 'groq',
    prefix: 'gsk_…',
    steps: [
      'Free and paid plans.',
      "Open weight models on Groq's own hardware, fast per call. The free tier allows 8,000 tokens a minute, which stalls on larger tables.",
      'The key is shown once, so copy it straight away.',
    ],
    url: 'https://console.groq.com/keys',
    action: 'Create a Groq API key',
  },
];

/** The prefixes named in the chooser's "key not recognised" message, in the
 *  order a user reads them, not the order they are matched in. Built from
 *  KEY_SETUP so the list is stated once, plus Puter, which has no pasted-key
 *  instructions of its own (its credential comes from the sign-in button). */
export const SUPPORTED_PREFIXES: readonly string[] = [
  ...KEY_SETUP.map((s) => s.prefix), 'eyJ…',
];

/** The provider a pasted key belongs to, or null when no prefix matches. A
 *  prefix is a guess, not proof: `verifyKey` (probe.ts) is what confirms it
 *  against the provider before anything is stored. */
export function detectProvider(key: string): Provider | null {
  const k = key.trim();
  if (k === '') return null;
  return KEY_PREFIXES.find(([prefix]) => k.startsWith(prefix))?.[1] ?? null;
}

/** Providers we can actually send a recorded clip to. Voice rides on the patch
 *  turn as a `file` message part, and only the Google client converts one: every
 *  other provider goes through the AI SDK's OpenAI-compatible client, which
 *  rejects it outright with *"'file part media type audio/wav' functionality not
 *  supported"*. Verified against OpenRouter on 2026-08-13, where both the model
 *  and OpenRouter's own API accept the audio and the client still refuses to
 *  send it.
 *
 *  This is deliberately about the transport, not the model. `voiceInput` in the
 *  catalogue says what a model can hear, which stays true wherever it is served;
 *  this says what we can put on the wire. Keeping them apart is what stops a
 *  card promising a microphone that throws: the Puter card did exactly that,
 *  because its Gemini row is voice-capable and its transport is not. */
const AUDIO_CAPABLE_PROVIDERS = new Set<Provider>(['gemini']);

/** Whether the microphone should be offered for this model on this provider:
 *  the model can hear, and we can send. Both the chooser's VOICE tag and the
 *  web mic gate read this, so they cannot disagree. */
export function supportsVoiceInput(provider: Provider, modelId: string): boolean {
  return AUDIO_CAPABLE_PROVIDERS.has(provider) && (modelFor(provider, modelId)?.voiceInput ?? false);
}

/** Whether a model accepts a `temperature` (sampling) parameter. The newest
 *  models: Anthropic Opus 4.8/4.7, Fable 5, Sonnet 5; OpenAI GPT-5.4+ / 5.5:
 *  removed sampling params and reject the request with a 400 ("temperature is
 *  deprecated for this model"). The flag lives per model in models.json; we
 *  only send `temperature` for models marked true, and omit it (the safe
 *  default) for everything else, including any unknown id. Prefix-matched
 *  against catalogue ids so dated aliases still match. */
export function acceptsTemperature(modelId: string): boolean {
  return ALL_MODELS.some((m) => m.temperature && modelId.startsWith(m.id));
}

/** The API key for the config's active provider, or null when it's unset.
 *  One home for the provider→key mapping, shared by the CLI and web surfaces. */
export function keyFor(config: ResolvedConfig): string | null {
  return config[KEY_FIELD[config.provider]];
}

/** The `ResolvedConfig` field each provider's key lives in. One table so the
 *  provider→key mapping is stated once; `keyFor` and `connectedProviders` both
 *  read it, as does the web controller. */
export const KEY_FIELD = {
  gemini:     'geminiKey',
  openai:     'openaiKey',
  anthropic:  'anthropicKey',
  groq:       'groqKey',
  openrouter: 'openrouterKey',
  puter:      'puterToken',
} as const satisfies Record<Provider, keyof ResolvedConfig>;

/** Every provider whose key is set. A connected provider *is* a provider with
 *  a key: connecting stores nothing of its own, so the chooser's card list is
 *  derived from the config rather than tracked beside it.
 *
 *  The design orders cards by when they were added, which the config alone
 *  cannot say, so `order` is an optional `Provider → timestamp` map (the
 *  `connectedAt` values from the probe blob: see storage.ts `connectedOrder`).
 *  A provider missing from it sorts as 0, and `sort` is stable, so untimed
 *  providers keep catalogue order among themselves and sit ahead of the timed
 *  ones, which is what a config written before the timestamps existed needs.
 *  Callers that only want "which providers have a key" pass no map. */
export function connectedProviders(
  config: ResolvedConfig,
  order: Partial<Record<Provider, number>> = {},
): Provider[] {
  return (Object.keys(KEY_FIELD) as Provider[])
    .filter((p) => (config[KEY_FIELD[p]] ?? '') !== '')
    .sort((a, b) => (order[a] ?? 0) - (order[b] ?? 0));
}

// ── resolveConfig ──────────────────────────────────────────────────────────

/**
 * Merge env vars over stored values into a complete ResolvedConfig.
 * Env always wins. Resolution order:
 *   1. GEMINI_API_KEY in env → provider=gemini, geminiKey=value
 *   2. OPENAI_API_KEY in env → provider=openai, openaiKey=value
 *   3. ANTHROPIC_API_KEY in env → provider=anthropic, anthropicKey=value
 *   4. GROQ_API_KEY in env → provider=groq, groqKey=value
 *   5. OPENROUTER_API_KEY in env → provider=openrouter, openrouterKey=value:
 *      last, so a paid key always outranks the free tier
 *   6. stored.provider (fallback: "gemini", the provider every committed
 *      cassette records with, so key-free replay resolves the taped models)
 *   7. TAMEDTABLE_MODEL in env overrides stored model
 *   8. Final model must belong to resolved provider; if not, use defaultModel
 *   9. TAMEDTABLE_CELL_MODEL in env overrides stored cellModel; the final cell
 *      model must also belong to the provider, else use defaultCellModel
 */
/** Whether a stored value names a provider this build knows. */
function isProvider(p: unknown): p is Provider {
  return typeof p === 'string' && p in KEY_FIELD;
}

/** Whether a model id belongs to a provider: the same-provider guard's test.
 *  `providerFor` must route the id there, and for anthropic (providerFor's
 *  catch-all) the id must actually carry the `claude-` prefix: an id that
 *  belongs to no provider is treated as not belonging, so it is coerced to
 *  the provider default instead of being sent to the API to 404. */
function modelBelongsTo(provider: Provider, modelId: string): boolean {
  // A provider that re-serves other providers' ids (Puter) can only be checked
  // against the catalogue: `providerFor` deliberately never returns it.
  if (modelFor(provider, modelId)) return true;
  if (provider === 'puter') return false;
  if (provider === 'anthropic') return modelId.startsWith('claude-');
  return providerFor(modelId) === provider;
}

export function resolveConfig(
  env: Record<string, string | undefined>,
  stored: Partial<ResolvedConfig>,
): ResolvedConfig {
  let provider: Provider;
  let anthropicKey: string | null  = stored.anthropicKey ?? null;
  let geminiKey: string | null     = stored.geminiKey ?? null;
  let openaiKey: string | null     = stored.openaiKey ?? null;
  let groqKey: string | null       = stored.groqKey ?? null;
  let openrouterKey: string | null = stored.openrouterKey ?? null;
  let puterToken: string | null    = stored.puterToken ?? null;

  const envGemini     = env['GEMINI_API_KEY'];
  const envOpenai     = env['OPENAI_API_KEY'];
  const envAnthropic  = env['ANTHROPIC_API_KEY'];
  const envGroq       = env['GROQ_API_KEY'];
  const envOpenrouter = env['OPENROUTER_API_KEY'];
  const envPuter      = env['PUTER_TOKEN'];

  if (envGemini) {
    provider = 'gemini';
    geminiKey = envGemini;
  } else if (envOpenai) {
    provider = 'openai';
    openaiKey = envOpenai;
  } else if (envAnthropic) {
    provider = 'anthropic';
    anthropicKey = envAnthropic;
  } else if (envGroq) {
    provider = 'groq';
    groqKey = envGroq;
  } else if (envOpenrouter) {
    provider = 'openrouter';
    openrouterKey = envOpenrouter;
  } else if (envPuter) {
    provider = 'puter';
    puterToken = envPuter;
  } else {
    // The stored blob is written by whatever build last ran on the origin
    // (production and pr-preview share one blob), so an unknown provider
    // value must resolve to the gemini fallback, never throw at boot.
    provider = isProvider(stored.provider) ? stored.provider : 'gemini';
  }

  // Chat model: env wins, then stored, then provider default. Truthiness,
  // like the key vars above: an empty env value (`TAMEDTABLE_MODEL=` in a
  // .env) means unset, never a real model id.
  // Which OpenRouter model set the user asked for. Read before the models,
  // because it decides what "the default" even is.
  const openrouterPaid = stored.openrouterPaid ?? false;

  let model = env['TAMEDTABLE_MODEL'] || stored.model || defaultModel(provider, openrouterPaid);

  // Guard: model must belong to resolved provider
  if (!modelBelongsTo(provider, model)) {
    model = defaultModel(provider, openrouterPaid);
  }

  // Cell model: env wins, then stored, then provider cell default.
  // Same-provider invariant: a stored cell model from another provider is
  // coerced to this provider's cell default.
  let cellModel = env['TAMEDTABLE_CELL_MODEL'] || stored.cellModel || defaultCellModel(provider, openrouterPaid);
  if (!modelBelongsTo(provider, cellModel)) {
    cellModel = defaultCellModel(provider, openrouterPaid);
  }

  return {
    provider, anthropicKey, geminiKey, openaiKey, groqKey, openrouterKey, puterToken,
    model, cellModel, openrouterPaid,
    alwaysRunAll: stored.alwaysRunAll ?? false,
  };
}
