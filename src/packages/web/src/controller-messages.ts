// User-facing message formatters — turn engine errors and debug info into
// strings the chat and toasts can display.

import type { RequestDebugInfo } from '@tamedtable/headless';

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

  const providerLabel =
    provider === 'gemini' ? 'Google'
    : provider === 'openai' ? 'OpenAI'
    : 'Anthropic';

  // Inspect AI SDK error properties for structured HTTP errors.
  const statusCode = (error as Record<string, unknown>)?.statusCode as number | undefined;
  const responseBody = String((error as Record<string, unknown>)?.responseBody ?? '');
  const fullText = `${message} ${responseBody}`;

  if (statusCode === 401 || /\b401\b|authentication_error|invalid.*api.{0,5}key|api key not valid|unauthenticated/i.test(fullText))
    return `Invalid API key. Open Settings to update your ${providerLabel} key.`;

  if (statusCode === 404 || /\b404\b|not_found_error|model.*not found/i.test(fullText))
    return 'Model not found. The selected model may be unavailable.';

  if (/failed to fetch|network error|cors blocked|connection refused/i.test(fullText))
    return `Network error. Could not reach the ${providerLabel} API.`;

  return message || `An unexpected error occurred reaching the ${providerLabel} API.`;
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
