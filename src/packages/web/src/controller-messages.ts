// User-facing message formatters — turn engine errors and debug info into
// strings the chat and toasts can display.

import type { RequestDebugInfo } from '@tamedtable/headless';

/** The human provider name shown in toasts, keyed off the resolved provider. */
export function providerLabel(provider?: string): string {
  return provider === 'gemini' ? 'Google'
    : provider === 'openai' ? 'OpenAI'
    : provider === 'openrouter' ? 'OpenRouter'
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

/** The greyed hint inside the disabled chat input while staying in a finished
 *  tour — the cassette cannot answer a request it never recorded, so the input
 *  and mic are disabled instead of failing. See behavior.md § Staying in the tour. */
export const STAY_REPLAY_HINT =
  'You are inside Tour replay, use undo/redo to examine steps. To exit, select Open or Tours to leave.';

/** Map an engine error (or its message string) to a sentence a non-technical
 *  user can act on, plus its report classification. Pass the raw caught error
 *  object when available — the function inspects `statusCode` and
 *  `responseBody` on SDK error objects so it can classify errors whose
 *  `.message` is empty or opaque.
 *
 *  `reportable: false` marks a *guidance* error — the message already tells
 *  the user what to do (fix a key, wait out a rate limit, check the network)
 *  and a bug report would be a false positive. Anything else is an *app
 *  error* the chat offers to report; the unknown fall-through defaults to
 *  reportable so an unclassified new error costs an extra button, never a
 *  lost bug report. See spec/behavior.md § Web UI. */
export function describeError(error: unknown, provider?: string): { message: string; reportable: boolean } {
  const message = typeof error === 'string' ? error
    : error instanceof Error ? error.message
    : String(error);

  // Runner-level messages (these always have a clear string). An exhausted
  // recovery budget means the model failed at its job three times — that is
  // an app error worth reporting, not user misuse.
  if (message.startsWith('Runner: recovery budget exhausted'))
    return { message: "Couldn't apply that change after 3 attempts. Try rephrasing or breaking it into smaller steps.", reportable: true };
  if (message === 'Runner: cancelled') return { message: 'Request cancelled.', reportable: false };
  if (message === 'Runner: a request is already in progress.')
    return { message: 'A request is already running.', reportable: false };

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
      return { message: `${base} If the key is correct, Google now blocks unrestricted keys — add an application restriction in Google AI Studio.`, reportable: false };
    return { message: base, reportable: false };
  }

  if (statusCode === 404 || /\b404\b|not_found_error|model.*not found/i.test(fullText))
    return { message: 'Model not found. The selected model may be unavailable.', reportable: false };

  // An empty billing account arrives as a 429 too, so it has to be checked
  // before the rate-limit rule below — OpenAI answers no-credit with
  // `insufficient_quota`, and "wait a minute" is a wait that never ends.
  if (/insufficient_quota|insufficient credit|exceeded your current quota|billing_not_active|no credit balance|credit balance is too low/i.test(fullText))
    return {
      message: `Your ${label} account has no credit left. Add credit (or a billing method) and try again.`,
      reportable: false,
    };

  // Rate limiting is not the user's fault — say retry, not rephrase.
  if (statusCode === 429 || /\b429\b|rate.?limit|resource.{0,5}exhausted|too many requests|quota/i.test(fullText))
    return { message: `Rate limited by the ${label} API. Wait a minute and try again.`, reportable: false };

  // Each engine words a fetch failure differently: Chromium "Failed to
  // fetch", Safari/WebKit "Load failed", Firefox "NetworkError when
  // attempting to fetch resource." — all the same offline/unreachable state.
  if (/failed to fetch|load failed|networkerror|network error|cors blocked|connection refused/i.test(fullText))
    return { message: `Network error. Could not reach the ${label} API.`, reportable: false };

  return { message: message || `An unexpected error occurred reaching the ${label} API.`, reportable: true };
}

/** The message-only wrapper around `describeError` — kept because most
 *  callers only need the sentence, not the classification. */
export function userFacingMessage(error: unknown, provider?: string): string {
  return describeError(error, provider).message;
}

/** Up to 7 numbered step lines with overflow rendered as "… and N more" —
 *  the shared shape of a chat reply and a flow-replay reply. */
export function numberedStepLines(steps: string[]): string[] {
  const MAX_LINES = 7;
  const lines = steps.slice(0, MAX_LINES).map((s, i) => `${i + 1}. ${s}`);
  if (steps.length > MAX_LINES) lines.push(`… and ${steps.length - MAX_LINES} more`);
  return lines;
}

/** The chat reply for a committed request: an "Executed steps:" heading and
 *  a numbered line per appended step — the human step labels, not the
 *  generated code (that lives in the request detail panel). */
export function summarizeDebug(info: RequestDebugInfo): string {
  if (info.steps.length === 0) return 'Done.';
  return ['Executed steps:', ...numberedStepLines(info.steps)].join('\n');
}
