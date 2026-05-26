// User-facing message formatters — turn engine errors and debug info into
// strings the chat and toasts can display.

import type { RequestDebugInfo } from '@tamedtable/headless';

/** Map an engine error string to a sentence a non-technical user can act on. */
export function userFacingMessage(message: string): string {
  if (message.startsWith('Runner: recovery budget exhausted'))
    return "Couldn't apply that change after 3 attempts. Try rephrasing or breaking it into smaller steps.";
  if (message === 'Runner: cancelled') return 'Request cancelled.';
  if (message === 'Runner: a request is already in progress.')
    return 'A request is already running.';
  return message;
}

/** A one-line-per-expression summary of a committed request, for the chat. */
export function summarizeDebug(info: RequestDebugInfo): string {
  const calls = info.modelCalls.map((m) => `${m.model} ×${m.calls}`).join(', ');
  const total = info.inputTokens + info.outputTokens;
  const head = info.expressions.map((e) => `${e.label}: ${e.body}`);
  const tail = `${calls} · ${total.toLocaleString('en-US')} tokens · ${(info.elapsedMs / 1000).toFixed(1)}s`;
  return [...head, tail].join('\n');
}
