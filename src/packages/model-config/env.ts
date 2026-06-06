// #ModelConfig — Node/Bun only entry point.
// Reads provider config from process.env. Do not import this from browser code.

/**
 * Read ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, and TAMEDTABLE_MODEL
 * from process.env and return them as a plain Record suitable for resolveConfig's
 * first argument. Only these four keys are included.
 */
export function readConfigFromEnv(): Record<string, string | undefined> {
  return {
    ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'],
    GEMINI_API_KEY:    process.env['GEMINI_API_KEY'],
    OPENAI_API_KEY:    process.env['OPENAI_API_KEY'],
    TAMEDTABLE_MODEL:  process.env['TAMEDTABLE_MODEL'],
  };
}
