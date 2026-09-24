import { describe, expect, test } from 'bun:test';
import { buildPrompt } from '@tamedtable/headless';
import type { TablePlan } from '@tamedtable/table-plan';
import {
  e1Fetch, newSession, parsePlannerRequest, parseUserText, patchAnswer, recordedCall, verdict,
  type CandidateStep, type Chat, type E1Record,
} from './index.ts';

const SYSTEM = 'You are TamedTable. The user either asks you to CHANGE a table or asks a QUESTION about it.';
const spec: TablePlan = { table: 'sales.csv', columns: [{ id: 'Region' }, { id: 'Revenue' }], transformations: [] };

function geminiBody(text: string, extra: unknown[] = []): string {
  return JSON.stringify({ contents: [{ role: 'user', parts: [{ text }] }, ...extra], systemInstruction: { parts: [{ text: SYSTEM }] } });
}
function recorded(name: string, args: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ functionCall: { name, args } }] } }] }));
}
const init = (body: string): RequestInit => ({ method: 'POST', body });

describe('wire', () => {
  test('reads back what headless buildPrompt wrote, fresh and recovery', () => {
    expect(parseUserText(buildPrompt('sort by revenue', spec, undefined, 'West leads.'))).toEqual({
      kind: 'fresh', spec, request: 'sort by revenue', prior: 'West leads.',
    });
    const back = parseUserText(buildPrompt('sort by revenue', spec, 'Your previous patch failed: bad path'));
    expect(back).toEqual({ kind: 'recovery', spec, request: 'sort by revenue', error: 'bad path' });
  });

  test('only patch turns are planner requests; a tool history is a follow-up', () => {
    expect(parsePlannerRequest(JSON.stringify({ contents: [], systemInstruction: { parts: [{ text: 'Classify rows' }] } }))).toBeUndefined();
    expect(parsePlannerRequest(geminiBody(buildPrompt('x', spec), [{ role: 'model', parts: [] }]))).toEqual({ kind: 'followup' });
  });

  test('a patch answer JSON-encodes values the way apply_spec_patch expects', async () => {
    const res = patchAnswer([{ op: 'add', path: '/transformations/-', value: { kind: 'select', columns: ['Region'] } }], 'Kept Region.');
    const call = recordedCall(await res.text())!;
    expect(call.name).toBe('apply_spec_patch');
    expect(call.args).toEqual({
      operations: [{ op: 'add', path: '/transformations/-', value: '{"kind":"select","columns":["Region"]}' }],
      summary: 'Kept Region.',
    });
  });
});

class FakeChat implements Chat {
  system = 'sys';
  toolsChars = 10;
  turns: string[] = [];
  refusals: string[] = [];
  constructor(private readonly steps: Array<Partial<CandidateStep>>) {}
  newTurn(_s: TablePlan, request: string) { this.turns.push(request); }
  rejected(error: string) { this.refusals.push(error); }
  async step(): Promise<CandidateStep> {
    return { text: '', inputTokens: 1, outputTokens: 1, ms: 0, ...this.steps.shift()! };
  }
}

const SORT = [{ op: 'add', path: '/transformations/-', value: { kind: 'sort', by: [{ key: 'Revenue', dir: 'desc' }] } }];
const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

describe('e1Fetch', () => {
  test('a change turn goes to the stand-in, which retries past a schema refusal', async () => {
    const chat = new FakeChat([{ plan: { ops: [{ op: 'add', path: '/nowhere/0', value: 1 }] } }, { plan: { ops: SORT, summary: 'Sorted.' } }]);
    const session = newSession(chat);
    const replay = async () => recorded('apply_spec_patch', { operations: [{ op: 'add', path: '/transformations/-', value: '{"kind":"filter"}' }] });
    const f = e1Fetch({ chat, replay, live: async () => { throw new Error('no live'); } }, session);
    const call = recordedCall(await (await f(url, init(geminiBody(buildPrompt('sort by revenue', spec))))).text())!;
    expect(call.name).toBe('apply_spec_patch');
    expect(session.turns).toHaveLength(1);
    const t = session.turns[0]!;
    expect(t.outcome).toBe('committed');
    expect(t.attempts.map((a) => a.after)).toEqual(['first', 'schema']);
    expect(t.attempts[0]!.error).toBeDefined();
    expect(t.reference).toEqual([{ op: 'add', path: '/transformations/-', value: { kind: 'filter' } }]);
    expect(chat.refusals).toHaveLength(1);
  });

  test('an engine refusal comes back as a recovery turn and continues the same turn', async () => {
    const chat = new FakeChat([{ plan: { ops: SORT } }, { plan: { ops: SORT } }]);
    const session = newSession(chat);
    const f = e1Fetch({ chat, replay: async () => { throw new Error('miss'); }, live: async () => { throw new Error('no live'); } }, session);
    await f(url, init(geminiBody(buildPrompt('sort', spec))));
    await f(url, init(geminiBody(buildPrompt('sort', spec, 'Your previous patch failed: evaluation failed'))));
    expect(session.turns).toHaveLength(1);
    expect(session.turns[0]!.attempts.map((a) => [a.after, a.error])).toEqual([['first', 'evaluation failed'], ['engine', undefined]]);
  });

  test('a question the planner answered on tape replays untouched', async () => {
    const chat = new FakeChat([]);
    const session = newSession(chat);
    const f = e1Fetch({ chat, replay: async () => recorded('query_table', { sql: 'SELECT 1' }), live: async () => { throw new Error('no live'); } }, session);
    expect(recordedCall(await (await f(url, init(geminiBody(buildPrompt('which region?', spec))))).text())!.name).toBe('query_table');
    expect(session.turns).toHaveLength(0);
    expect(session.questions).toBe(1);
  });

  test('a cell call the cassette misses goes live and is counted', async () => {
    const chat = new FakeChat([]);
    const session = newSession(chat);
    const f = e1Fetch({ chat, replay: async () => { throw new Error('miss'); }, live: async () => new Response('live') }, session);
    expect(await (await f(url, init('{"contents":[]}'))).text()).toBe('live');
    expect(session.liveCalls).toBe(1);
  });
});

describe('verdict', () => {
  const turn = (outcome: 'committed' | 'no-plan' | 'gave-up') => ({ request: 'r', attempts: [], outcome });
  const r = (over: Partial<E1Record>) => ({ status: 'FAILED', turns: [turn('committed')], errors: [], ...over });
  test('grades pass, silent and visible failures, plan-shape checks and ungraded scenarios', () => {
    expect(verdict(r({ turns: [] }))).toBe('not-graded');
    expect(verdict(r({ status: 'PASSED' }))).toBe('correct');
    expect(verdict(r({ turns: [turn('committed'), turn('gave-up')] }))).toBe('visible-failure');
    expect(verdict(r({ failedStep: 'the spec has 2 transformations' }))).toBe('plan-shape');
    expect(verdict(r({ failedStep: 'compare with the expected output' }))).toBe('silently-wrong');
    expect(verdict(r({ errors: ['boom'] }))).toBe('harness-error');
  });
});
