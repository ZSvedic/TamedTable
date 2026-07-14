// User-facing message formatters — turn engine errors and debug info into
// strings the chat and toasts can display.

import type { RequestDebugInfo } from '@tamedtable/headless';

/** The human provider name shown in toasts, keyed off the resolved provider. */
export function providerLabel(provider?: string): string {
  return provider === 'gemini' ? 'Google'
    : provider === 'openai' ? 'OpenAI'
    : 'Anthropic';
}

/** A "<lead> … API key — open Settings and add one." toast that names the
 *  selected provider, so a user holding the wrong provider's key acts on the
 *  right one. `an` for OpenAI/Anthropic, `a` for Google. */
export function missingProviderKeyMessage(provider: string | undefined, lead: string): string {
  const label = providerLabel(provider);
  const article = label === 'Google' ? 'a' : 'an';
  return `${lead} ${article} ${label} API key — open Settings and add one.`;
}

/** The missing-key toast for a chat text request. */
export function missingTextKeyMessage(provider?: string): string {
  return missingProviderKeyMessage(provider, 'Text requests require');
}

/** The refusal toast while staying in a finished tour — the cassette cannot
 *  answer a request it never recorded. See behavior.md § Staying in the tour. */
export const STAY_TOUR_MESSAGE =
  'The tour is finished — undo/redo still work. Open Tours to leave.';

/** Map an engine error (or its message string) to a sentence a non-technical
 *  user can act on. Pass the raw caught error object when available — the
 *  function inspects `statusCode` and `responseBody` on SDK error objects so
 *  it can classify errors whose `.message` is empty or opaque. */
export function userFacingMessage(error: unknown, provider?: string): string {
  const message = typeof error === 'string' ? error
    : error instanceof Error ? error.message
    : String(error);

  // Runner-level messages (these always have a clear string).
  if (message.startsWith('Runner: recovery budget exhausted'))
    return "Couldn't apply that change after 3 attempts. Try rephrasing or breaking it into smaller steps.";
  if (message === 'Runner: cancelled') return 'Request cancelled.';
  if (message === 'Runner: a request is already in progress.')
    return 'A request is already running.';

  const label = providerLabel(provider);

  // Inspect AI SDK error properties for structured HTTP errors. The SDK wraps
  // retryable failures (429s) in a RetryError after its backoff runs out —
  // classify by the last underlying error, not the wrapper.
  const wrapped = (error as Record<string, unknown>)?.errors;
  const cause = (Array.isArray(wrapped) && wrapped.length ? wrapped[wrapped.length - 1] : error) as
    Record<string, unknown> | undefined;
  const statusCode = cause?.statusCode as number | undefined;
  const responseBody = String(cause?.responseBody ?? '');
  const fullText = `${message} ${responseBody}`;

  if (statusCode === 401 || /\b401\b|authentication_error|invalid.*api.{0,5}key|api key not valid|unauthenticated/i.test(fullText)) {
    const base = `Invalid API key. Open Settings to update your ${label} key.`;
    // Google rejects unrestricted keys (policy effective 2026-06-19) with the
    // same "API key not valid" response a genuinely-wrong key gives, so a user
    // whose key is fine would otherwise keep re-entering it. Point at the real
    // fix. See https://ai.google.dev/gemini-api/docs/api-key#secure-unrestricted-keys
    if (provider === 'gemini')
      return `${base} If the key is correct, Google now blocks unrestricted keys — add an application restriction in Google AI Studio.`;
    return base;
  }

  if (statusCode === 404 || /\b404\b|not_found_error|model.*not found/i.test(fullText))
    return 'Model not found. The selected model may be unavailable.';

  // Rate limiting is not the user's fault — say retry, not rephrase.
  if (statusCode === 429 || /\b429\b|rate.?limit|resource.{0,5}exhausted|too many requests|quota/i.test(fullText))
    return `Rate limited by the ${label} API. Wait a minute and try again.`;

  if (/failed to fetch|network error|cors blocked|connection refused/i.test(fullText))
    return `Network error. Could not reach the ${label} API.`;

  return message || `An unexpected error occurred reaching the ${label} API.`;
}

/** A one-line-per-expression summary of a committed request, for the chat. */
export function summarizeDebug(info: RequestDebugInfo): string {
  const MAX_BODY = 240;
  const MAX_LINES = 7;
  const allHead = info.expressions.map((e) => {
    const body = e.body.length > MAX_BODY ? e.body.slice(0, MAX_BODY) + '…' : e.body;
    return `${e.label}: ${body}`;
  });
  const head =
    allHead.length > MAX_LINES
      ? [...allHead.slice(0, MAX_LINES), `… and ${allHead.length - MAX_LINES} more`]
      : allHead;
  return head.join('\n');
}
