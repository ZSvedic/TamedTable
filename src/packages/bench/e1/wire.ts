// #BenchE1
// The wire format between the headless runner and E1's stand-in chat model.
// Every cassette records the Gemini defaults, so the runner under test speaks
// Gemini's generateContent: this file reads its patch-turn requests and writes
// Gemini-shaped answers back. Spec: benchmarks/mcp-e1/README.md.

import type { TablePlan } from '@tamedtable/table-plan';

/** The opening of headless's SYSTEM_PROMPT: marks a patch-turn request apart
 *  from cell, suggestion and export calls. */
const PLANNER_MARK = 'You are TamedTable. The user either asks you to CHANGE a table';

export type PlannerTurn =
  | { kind: 'fresh'; spec: TablePlan; request: string; prior?: string }
  | { kind: 'recovery'; spec: TablePlan; request: string; error: string }
  /** A later step of a question's query_table loop: carries tool history. */
  | { kind: 'followup' };

interface GeminiBody {
  contents?: Array<{ role?: string; parts?: Array<{ text?: string }> }>;
  systemInstruction?: { parts?: Array<{ text?: string }> };
}

/** Read a request body: undefined when it is not a patch turn. */
export function parsePlannerRequest(body: string): PlannerTurn | undefined {
  let json: GeminiBody;
  try { json = JSON.parse(body) as GeminiBody; } catch { return undefined; }
  const system = json.systemInstruction?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!system.startsWith(PLANNER_MARK)) return undefined;
  const contents = json.contents ?? [];
  if (contents.length !== 1) return { kind: 'followup' };
  const text = contents[0]!.parts?.map((p) => p.text ?? '').join('') ?? '';
  return parseUserText(text);
}

/** @internal: exported for unit tests. Undo headless's buildPrompt: the spec,
 *  the request, and on a recovery turn the error that sent it back. */
export function parseUserText(text: string): PlannerTurn {
  const specAt = text.indexOf('Current spec:\n');
  if (specAt < 0) throw new Error(`E1: patch turn without a "Current spec:" block: ${text.slice(0, 200)}`);
  const recovery = text.includes('\n\nOriginal user request: ');
  const requestMark = recovery ? '\n}\n\nOriginal user request: ' : '\n}\n\nUser request: ';
  const endAt = text.indexOf(requestMark, specAt);
  if (endAt < 0) throw new Error(`E1: cannot find the request after the spec: ${text.slice(0, 200)}`);
  const spec = JSON.parse(text.slice(specAt + 'Current spec:\n'.length, endAt + 2)) as TablePlan;
  let rest = text.slice(endAt + requestMark.length);
  if (recovery) {
    rest = rest.slice(0, rest.indexOf('\n\nEmit a corrected patch.'));
    const error = text.slice(0, specAt).trim().replace(/^Your previous patch failed: /, '');
    return { kind: 'recovery', spec, request: stripPrior(rest).request, error };
  }
  return { kind: 'fresh', spec, ...stripPrior(rest) };
}

function stripPrior(rest: string): { request: string; prior?: string } {
  const at = rest.indexOf('\n\nYour previous answer: ');
  if (at < 0) return { request: rest };
  return { request: rest.slice(0, at), prior: rest.slice(at + '\n\nYour previous answer: '.length) };
}

type FunctionCall = { name: string; args: Record<string, unknown> };

/** The function call a recorded Gemini answer made, if any. */
export function recordedCall(body: string): FunctionCall | undefined {
  try {
    const json = JSON.parse(body) as { candidates?: Array<{ content?: { parts?: Array<{ functionCall?: FunctionCall }> } }> };
    return json.candidates?.[0]?.content?.parts?.find((p) => p.functionCall)?.functionCall;
  } catch {
    return undefined;
  }
}

/** A recorded apply_spec_patch's ops with their JSON-string values decoded. */
export function decodeRecordedOps(call: FunctionCall): unknown[] {
  const ops = (call.args.operations ?? []) as Array<Record<string, unknown>>;
  return ops.map((op) => {
    if (typeof op.value !== 'string') return op;
    try { return { ...op, value: JSON.parse(op.value) }; } catch { return op; }
  });
}

function geminiAnswer(call: FunctionCall): Response {
  const body = {
    candidates: [{ content: { role: 'model', parts: [{ functionCall: call }] }, finishReason: 'STOP', index: 0 }],
    usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
    modelVersion: 'e1-stand-in',
  };
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

/** The candidate's ops, handed to the runner as the apply_spec_patch call its
 *  schema expects: every `value` JSON-encoded. */
export function patchAnswer(ops: unknown[], summary: string | undefined): Response {
  const operations = ops.map((op) => {
    const o = op as Record<string, unknown>;
    return 'value' in o ? { ...o, value: JSON.stringify(o.value) } : o;
  });
  return geminiAnswer({ name: 'apply_spec_patch', args: { operations, ...(summary ? { summary } : {}) } });
}

/** A turn that ends without a change: the runner reads it as a reply. */
export function replyAnswer(text: string): Response {
  return geminiAnswer({ name: 'reply', args: { text: text.trim() || '(no answer)' } });
}
