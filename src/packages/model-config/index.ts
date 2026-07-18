// #ModelConfig
// Provider/key/model catalogue and config resolution.
// Zero runtime dependencies — no process, no DOM references.

import catalogue from './models.json' with { type: 'json' };

export type Provider = 'anthropic' | 'gemini' | 'openai' | 'openrouter';

/** Providers the engine can route a model id to. Cerebras is bench-only: the
 *  engine calls its OpenAI-compatible endpoint (free tier), the benchmark
 *  sweeps its models, but it has no catalogue entry, no defaults row, and no
 *  chooser card — `resolveConfig` never resolves it. */
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

/** The primary + secondary (cell) model ids chosen as a provider's defaults,
 *  plus an optional pinned cell batch size where the benchmark found a sweet
 *  spot (openrouter: 5). */
export interface ProviderDefaults {
  primary: string;
  secondary: string;
  batchSize?: number;
}

export interface ResolvedConfig {
  provider: Provider;
  anthropicKey: string | null;
  geminiKey: string | null;
  openaiKey: string | null;
  openrouterKey: string | null;
  /** Primary model: writes the spec patch each turn (and carries voice input). */
  model: string;
  /** Secondary model: fills per-row LLM cells. Always same-provider as model. */
  cellModel: string;
}

export interface StoragePort {
  read(): Partial<ResolvedConfig>;
  write(c: Partial<ResolvedConfig>): void;
  clear(): void;
}

// ── Model catalogue ────────────────────────────────────────────────────────
// One canonical home: models.json — two sections. `models` lists every
// available model with its per-Mtok prices (mirrors benchmarks/models.jsonl);
// `defaults` maps each provider to its primary + secondary (cell) model ids.
// The user no longer picks individual models — they pick a provider, and the
// defaults below decide the two roles. Every id must be verified against the
// provider's current docs before changing — never guess an id.

export const ALL_MODELS: readonly ModelDef[] =
  (catalogue as { models: ModelDef[] }).models;

export const DEFAULTS: Readonly<Record<Provider, ProviderDefaults>> =
  (catalogue as { defaults: Record<Provider, ProviderDefaults> }).defaults;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Default patch-turn (primary) model for a provider: the `defaults` entry for
 *  that provider, falling back to the provider's first catalogue entry. */
export function defaultModel(provider: Provider): string {
  return DEFAULTS[provider]?.primary
    ?? ALL_MODELS.find((m) => m.provider === provider)!.id;
}

/** Default per-row cell (secondary) model for a provider: the `defaults` entry
 *  for that provider, falling back to that provider's primary default. Always
 *  same-provider — cell calls never cross providers. */
export function defaultCellModel(provider: Provider): string {
  return DEFAULTS[provider]?.secondary ?? defaultModel(provider);
}

/** The provider's pinned cell batch size from `defaults`, or undefined when it
 *  has none (the engine then keeps its own default). Openrouter pins 5 — the
 *  2026-07-17 benchmark's north-mini sweet spot. */
export function defaultBatchSize(provider: Provider): number | undefined {
  return DEFAULTS[provider]?.batchSize;
}

/** Infer provider from a model id prefix. Returns 'anthropic' for unknown ids.
 *  Slash-containing ids are OpenRouter's vendor/model form and no other
 *  provider's ids contain one, so that rule goes first; `gpt-oss-` is checked
 *  before `gpt-`, so the open-weight OpenAI models served by Cerebras never
 *  land on the OpenAI provider. */
export function providerFor(modelId: string): EngineProvider {
  if (modelId.includes('/'))          return 'openrouter';
  if (modelId.startsWith('gemini-'))  return 'gemini';
  if (modelId.startsWith('zai-'))     return 'cerebras';
  if (modelId.startsWith('gpt-oss-')) return 'cerebras';
  if (modelId.startsWith('gpt-'))     return 'openai';
  return 'anthropic';
}

/** Whether a model accepts a `temperature` (sampling) parameter. The newest
 *  models — Anthropic Opus 4.8/4.7, Fable 5, Sonnet 5; OpenAI GPT-5.4+ / 5.5 —
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
  if (config.provider === 'gemini') return config.geminiKey;
  if (config.provider === 'openai') return config.openaiKey;
  if (config.provider === 'openrouter') return config.openrouterKey;
  return config.anthropicKey;
}

// ── resolveConfig ──────────────────────────────────────────────────────────

/**
 * Merge env vars over stored values into a complete ResolvedConfig.
 * Env always wins. Resolution order:
 *   1. GEMINI_API_KEY in env → provider=gemini, geminiKey=value
 *   2. OPENAI_API_KEY in env → provider=openai, openaiKey=value
 *   3. ANTHROPIC_API_KEY in env → provider=anthropic, anthropicKey=value
 *   4. OPENROUTER_API_KEY in env → provider=openrouter, openrouterKey=value —
 *      last, so a paid key always outranks the free tier
 *   5. stored.provider (fallback: "gemini" — the provider every committed
 *      cassette records with, so key-free replay resolves the taped models)
 *   6. TAMEDTABLE_MODEL in env overrides stored model
 *   7. Final model must belong to resolved provider; if not, use defaultModel
 *   8. TAMEDTABLE_CELL_MODEL in env overrides stored cellModel; the final cell
 *      model must also belong to the provider, else use defaultCellModel
 */
export function resolveConfig(
  env: Record<string, string | undefined>,
  stored: Partial<ResolvedConfig>,
): ResolvedConfig {
  let provider: Provider;
  let anthropicKey: string | null  = stored.anthropicKey ?? null;
  let geminiKey: string | null     = stored.geminiKey ?? null;
  let openaiKey: string | null     = stored.openaiKey ?? null;
  let openrouterKey: string | null = stored.openrouterKey ?? null;

  const envGemini     = env['GEMINI_API_KEY'];
  const envOpenai     = env['OPENAI_API_KEY'];
  const envAnthropic  = env['ANTHROPIC_API_KEY'];
  const envOpenrouter = env['OPENROUTER_API_KEY'];

  if (envGemini) {
    provider = 'gemini';
    geminiKey = envGemini;
  } else if (envOpenai) {
    provider = 'openai';
    openaiKey = envOpenai;
  } else if (envAnthropic) {
    provider = 'anthropic';
    anthropicKey = envAnthropic;
  } else if (envOpenrouter) {
    provider = 'openrouter';
    openrouterKey = envOpenrouter;
  } else {
    provider = stored.provider ?? 'gemini';
  }

  // Primary model: env wins, then stored, then provider default
  let model = env['TAMEDTABLE_MODEL'] ?? stored.model ?? defaultModel(provider);

  // Guard: model must belong to resolved provider
  if (providerFor(model) !== provider) {
    model = defaultModel(provider);
  }

  // Secondary (cell) model: env wins, then stored, then provider cell default.
  // Same-provider invariant — a stored cell model from another provider is
  // coerced to this provider's cell default.
  let cellModel = env['TAMEDTABLE_CELL_MODEL'] ?? stored.cellModel ?? defaultCellModel(provider);
  if (providerFor(cellModel) !== provider) {
    cellModel = defaultCellModel(provider);
  }

  return { provider, anthropicKey, geminiKey, openaiKey, openrouterKey, model, cellModel };
}
