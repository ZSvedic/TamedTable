// #ModelConfig
// Provider/key/model catalogue and config resolution.
// Zero runtime dependencies — no process, no DOM references.

import catalogue from './models.json' with { type: 'json' };

export type Provider = 'anthropic' | 'gemini' | 'openai';

export interface ModelDef {
  id: string;
  name: string;
  desc: string;
  provider: Provider;
  voiceInput: boolean;
  /** At most one entry per provider — the model defaultModel() returns as the
   *  primary (patch-turn) default. */
  default?: boolean;
  /** At most one entry per provider — the model defaultCellModel() returns as
   *  the secondary (per-row cell) default. */
  secondaryDefault?: boolean;
}

export interface ResolvedConfig {
  provider: Provider;
  anthropicKey: string | null;
  geminiKey: string | null;
  openaiKey: string | null;
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
// One canonical home: models.json. Every model id in it must be verified
// against the provider's current docs before changing — never guess an id.

export const ALL_MODELS: readonly ModelDef[] = catalogue as ModelDef[];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Default patch-turn (primary) model for a given provider: the catalogue
 *  entry flagged `default: true`, falling back to the provider's first entry. */
export function defaultModel(provider: Provider): string {
  const entries = ALL_MODELS.filter((m) => m.provider === provider);
  return (entries.find((m) => m.default) ?? entries[0]!).id;
}

/** Default per-row cell (secondary) model for a given provider: the catalogue
 *  entry flagged `secondaryDefault: true`, falling back to that provider's
 *  primary default. Always same-provider — cell calls never cross providers. */
export function defaultCellModel(provider: Provider): string {
  const entries = ALL_MODELS.filter((m) => m.provider === provider);
  return (entries.find((m) => m.secondaryDefault) ?? entries.find((m) => m.default) ?? entries[0]!).id;
}

/** Infer provider from a model id prefix. Returns 'anthropic' for unknown ids. */
export function providerFor(modelId: string): Provider {
  if (modelId.startsWith('gemini-')) return 'gemini';
  if (modelId.startsWith('gpt-'))    return 'openai';
  return 'anthropic';
}

// Models that still accept a `temperature` (sampling) parameter. The newest
// models — Anthropic Opus 4.8/4.7, Fable 5, Sonnet 5; OpenAI GPT-5.4+ / 5.5 —
// removed sampling params and reject the request with a 400 ("temperature is
// deprecated for this model"). We therefore only send `temperature` for models
// known to accept it, and omit it (the safe default) for everything else,
// including any future model. Prefix-matched so dated aliases still match.
const TEMPERATURE_MODEL_PREFIXES = [
  'gemini-',
  'claude-sonnet-4-5',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
];

/** Whether a model accepts a `temperature` sampling parameter. Returns false
 *  for the newest models that removed sampling params (and for unknown ids, so
 *  new models default to the safe no-temperature path). */
export function acceptsTemperature(modelId: string): boolean {
  return TEMPERATURE_MODEL_PREFIXES.some((p) => modelId.startsWith(p));
}

/** The API key for the config's active provider, or null when it's unset.
 *  One home for the provider→key mapping, shared by the CLI and web surfaces. */
export function keyFor(config: ResolvedConfig): string | null {
  if (config.provider === 'gemini') return config.geminiKey;
  if (config.provider === 'openai') return config.openaiKey;
  return config.anthropicKey;
}

// ── resolveConfig ──────────────────────────────────────────────────────────

/**
 * Merge env vars over stored values into a complete ResolvedConfig.
 * Env always wins. Resolution order:
 *   1. GEMINI_API_KEY in env → provider=gemini, geminiKey=value
 *   2. OPENAI_API_KEY in env → provider=openai, openaiKey=value
 *   3. ANTHROPIC_API_KEY in env → provider=anthropic, anthropicKey=value
 *   4. stored.provider (fallback: "anthropic")
 *   5. TAMEDTABLE_MODEL in env overrides stored model
 *   6. Final model must belong to resolved provider; if not, use defaultModel
 *   7. TAMEDTABLE_CELL_MODEL in env overrides stored cellModel; the final cell
 *      model must also belong to the provider, else use defaultCellModel
 */
export function resolveConfig(
  env: Record<string, string | undefined>,
  stored: Partial<ResolvedConfig>,
): ResolvedConfig {
  let provider: Provider;
  let anthropicKey: string | null = stored.anthropicKey ?? null;
  let geminiKey: string | null    = stored.geminiKey ?? null;
  let openaiKey: string | null    = stored.openaiKey ?? null;

  const envGemini    = env['GEMINI_API_KEY'];
  const envOpenai    = env['OPENAI_API_KEY'];
  const envAnthropic = env['ANTHROPIC_API_KEY'];

  if (envGemini) {
    provider = 'gemini';
    geminiKey = envGemini;
  } else if (envOpenai) {
    provider = 'openai';
    openaiKey = envOpenai;
  } else if (envAnthropic) {
    provider = 'anthropic';
    anthropicKey = envAnthropic;
  } else {
    provider = stored.provider ?? 'anthropic';
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

  return { provider, anthropicKey, geminiKey, openaiKey, model, cellModel };
}
