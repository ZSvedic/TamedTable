// #ModelConfig — Node/Bun only entry point.
// Reads provider config from process.env. Do not import this from browser code.

/**
 * Read ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, GROQ_API_KEY,
 * OPENROUTER_API_KEY, TAMEDTABLE_MODEL, and TAMEDTABLE_CELL_MODEL from
 * process.env and return them as a plain Record suitable for resolveConfig's
 * first argument. Only these keys are included.
 */
export function readConfigFromEnv(): Record<string, string | undefined> {
  return {
    ANTHROPIC_API_KEY:    process.env['ANTHROPIC_API_KEY'],
    GEMINI_API_KEY:       process.env['GEMINI_API_KEY'],
    OPENAI_API_KEY:       process.env['OPENAI_API_KEY'],
    GROQ_API_KEY:         process.env['GROQ_API_KEY'],
    OPENROUTER_API_KEY:   process.env['OPENROUTER_API_KEY'],
    TAMEDTABLE_MODEL:     process.env['TAMEDTABLE_MODEL'],
    TAMEDTABLE_CELL_MODEL: process.env['TAMEDTABLE_CELL_MODEL'],
  };
}
