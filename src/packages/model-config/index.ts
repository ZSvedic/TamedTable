// #ModelConfig
// Provider/key/model catalogue and config resolution.
// Zero runtime dependencies — no process, no DOM references.

export type Provider = 'anthropic' | 'gemini' | 'openai';

export interface ModelDef {
  id: string;
  name: string;
  desc: string;
  provider: Provider;
  voiceInput: boolean;
}

export interface ResolvedConfig {
  provider: Provider;
  anthropicKey: string | null;
  geminiKey: string | null;
  openaiKey: string | null;
  model: string;
}

export interface StoragePort {
  read(): Partial<ResolvedConfig>;
  write(c: Partial<ResolvedConfig>): void;
  clear(): void;
}

// ── Model catalogue ────────────────────────────────────────────────────────

export const ALL_MODELS: readonly ModelDef[] = [
  // Google (Gemini) — all models support voice input
  { id: 'gemini-2.5-flash',      name: 'Gemini 2.5 Flash',  desc: "Google's fast, balanced model — the Google default.", provider: 'gemini', voiceInput: true  },
  { id: 'gemini-2.5-pro',        name: 'Gemini 2.5 Pro',    desc: 'Most capable Gemini model.',                          provider: 'gemini', voiceInput: true  },
  // OpenAI — only the audio model supports voice
  { id: 'gpt-4o',                name: 'GPT-4o',            desc: 'Balanced OpenAI model — the OpenAI default.',         provider: 'openai', voiceInput: false },
  { id: 'gpt-4o-audio-preview',  name: 'GPT-4o Audio',      desc: 'OpenAI audio model for voice input.',                 provider: 'openai', voiceInput: true  },
  { id: 'gpt-4o-mini',           name: 'GPT-4o Mini',       desc: 'Fast and cheap OpenAI model.',                        provider: 'openai', voiceInput: false },
  // Anthropic — no models support voice input
  { id: 'claude-opus-4-7',       name: 'Opus 4.7',          desc: 'Most capable — best for tricky requests.',         provider: 'anthropic', voiceInput: false },
  { id: 'claude-sonnet-4-6',     name: 'Sonnet 4.6',        desc: 'Balanced — the default.',                          provider: 'anthropic', voiceInput: false },
  { id: 'claude-haiku-4-5',      name: 'Haiku 4.5',         desc: 'Fastest and cheapest.',                            provider: 'anthropic', voiceInput: false },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Default patch-turn model for a given provider. */
export function defaultModel(provider: Provider): string {
  if (provider === 'gemini') return 'gemini-2.5-flash';
  if (provider === 'openai') return 'gpt-4o';
  return 'claude-sonnet-4-6';
}

/** Infer provider from a model id prefix. Returns 'anthropic' for unknown ids. */
export function providerFor(modelId: string): Provider {
  if (modelId.startsWith('gemini-')) return 'gemini';
  if (modelId.startsWith('gpt-'))    return 'openai';
  return 'anthropic';
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

  // Model: env wins, then stored, then provider default
  let model = env['TAMEDTABLE_MODEL'] ?? stored.model ?? defaultModel(provider);

  // Guard: model must belong to resolved provider
  if (providerFor(model) !== provider) {
    model = defaultModel(provider);
  }

  return { provider, anthropicKey, geminiKey, openaiKey, model };
}
