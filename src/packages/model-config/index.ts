// #ModelConfig
// Provider/key/model catalogue and config resolution.
// Zero runtime dependencies — no process, no DOM references.

export type Provider = 'anthropic' | 'gemini';

export interface ModelDef {
  id: string;
  name: string;
  desc: string;
  provider: Provider;
}

export interface ResolvedConfig {
  provider: Provider;
  anthropicKey: string | null;
  geminiKey: string | null;
  model: string;
}

export interface StoragePort {
  read(): Partial<ResolvedConfig>;
  write(c: Partial<ResolvedConfig>): void;
  clear(): void;
}

// ── Model catalogue ────────────────────────────────────────────────────────

export const ALL_MODELS: readonly ModelDef[] = [
  { id: 'claude-opus-4-7',   name: 'Opus 4.7',         desc: 'Most capable — best for tricky requests.', provider: 'anthropic' },
  { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6',        desc: 'Balanced — the default.',                 provider: 'anthropic' },
  { id: 'claude-haiku-4-5',  name: 'Haiku 4.5',         desc: 'Fastest and cheapest.',                   provider: 'anthropic' },
  { id: 'gemini-3-flash',    name: 'Gemini 3 Flash',    desc: "Google's fast, cheap model — the Gemini default.", provider: 'gemini' },
  { id: 'gemini-2-5-flash',  name: 'Gemini 2.5 Flash',  desc: 'Mid-tier Gemini model.',                  provider: 'gemini' },
  { id: 'gemini-2-5-pro',    name: 'Gemini 2.5 Pro',    desc: 'Most capable Gemini model.',              provider: 'gemini' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Default patch-turn model for a given provider. */
export function defaultModel(provider: Provider): string {
  return provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gemini-3-flash';
}

/** Infer provider from a model id prefix. Returns 'anthropic' for unknown ids. */
export function providerFor(modelId: string): Provider {
  if (modelId.startsWith('gemini-')) return 'gemini';
  return 'anthropic';
}

// ── resolveConfig ──────────────────────────────────────────────────────────

/**
 * Merge env vars over stored values into a complete ResolvedConfig.
 * Env always wins. Resolution order:
 *   1. GEMINI_API_KEY in env → provider=gemini, geminiKey=value
 *   2. ANTHROPIC_API_KEY in env → provider=anthropic, anthropicKey=value
 *   3. stored.provider (fallback: "anthropic")
 *   4. TAMEDTABLE_MODEL in env overrides stored model
 *   5. Final model must belong to resolved provider; if not, use defaultModel
 */
export function resolveConfig(
  env: Record<string, string | undefined>,
  stored: Partial<ResolvedConfig>,
): ResolvedConfig {
  let provider: Provider;
  let anthropicKey: string | null = stored.anthropicKey ?? null;
  let geminiKey: string | null = stored.geminiKey ?? null;

  const envGemini    = env['GEMINI_API_KEY'];
  const envAnthropic = env['ANTHROPIC_API_KEY'];

  if (envGemini) {
    provider = 'gemini';
    geminiKey = envGemini;
    // Env-set gemini key; anthropicKey comes from stored only if not overridden
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

  return { provider, anthropicKey, geminiKey, model };
}
