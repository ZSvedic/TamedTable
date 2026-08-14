import { describe, it, expect } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner, tryParseBatchResponse } from './index.ts';

describe('tryParseBatchResponse', () => {
  it('parses a plain JSON array of strings', () => {
    expect(tryParseBatchResponse('["a", "b", "c"]', 3)).toEqual(['a', 'b', 'c']);
  });

  it('parses null entries as null', () => {
    expect(tryParseBatchResponse('["a", null, "c"]', 3)).toEqual(['a', null, 'c']);
  });

  it('treats an empty string and the lowercased literal "null" as null', () => {
    expect(tryParseBatchResponse('["", "null", " null "]', 3)).toEqual([null, null, null]);
  });

  // spec/behavior.md § LLM cells: only the literal *lowercased* word null is
  // the sentinel: "NULL" and "Null" are answers a cell may legitimately give
  // (a database keyword, an acronym) and must survive as strings.
  it('keeps "NULL" and "Null" as real strings', () => {
    expect(tryParseBatchResponse('["NULL", "Null", "ok"]', 3)).toEqual(['NULL', 'Null', 'ok']);
  });

  it('strips a leading ```json fence and trailing ```', () => {
    const text = '```json\n["a", "b"]\n```';
    expect(tryParseBatchResponse(text, 2)).toEqual(['a', 'b']);
  });

  it('strips a leading bare ``` fence', () => {
    const text = '```\n["a", "b"]\n```';
    expect(tryParseBatchResponse(text, 2)).toEqual(['a', 'b']);
  });

  it('coerces non-string entries to strings', () => {
    expect(tryParseBatchResponse('[1, true, "c"]', 3)).toEqual(['1', 'true', 'c']);
  });

  it('returns undefined when length does not match', () => {
    expect(tryParseBatchResponse('["a", "b"]', 3)).toBeUndefined();
    expect(tryParseBatchResponse('["a", "b", "c", "d"]', 3)).toBeUndefined();
  });

  it('returns undefined when not an array', () => {
    expect(tryParseBatchResponse('{"a": 1}', 1)).toBeUndefined();
    expect(tryParseBatchResponse('"plain string"', 1)).toBeUndefined();
  });

  it('returns undefined on JSON parse failure', () => {
    expect(tryParseBatchResponse('not json at all', 1)).toBeUndefined();
    expect(tryParseBatchResponse('["unclosed', 1)).toBeUndefined();
  });

  it('handles whitespace around the array', () => {
    expect(tryParseBatchResponse('   \n["a", "b"]  \n', 2)).toEqual(['a', 'b']);
  });
});

// ── Every {llm} slot packs at the same 20-per-batch limit ───────────────────
// spec/behavior.md § LLM cells: the packing and concurrency apply "at EVERY
// place an {llm} expression produces one value per row or per group". Only
// `mutate` used to batch; a sort key handed the whole table to one call and a
// group aggregate pushed one prompt per group into one call (RED-HL-7a/7b),
// blowing the context window at real sizes. Offline: a fake Anthropic Messages
// fetch answers each batch with a correctly-sized JSON array.

const N = 45;
const BATCH = 20; // spec default TAMEDTABLE_BATCH_SIZE (code-contract.md § ConfigEnv)

/** Count numbered batch tasks ([1]\n … [k]\n) in a serialized request body. */
function countTasks(body: string): number {
  return body.match(/\[(\d+)\]\\n/g)?.length ?? 1;
}

let batchMsgN = 0;
function echoBatchFetch() {
  const log: Array<{ body: string }> = [];
  const f = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const body = String(init?.body ?? '');
    log.push({ body });
    const k = countTasks(body);
    return new Response(
      JSON.stringify({
        id: `m_${++batchMsgN}`, type: 'message', role: 'assistant', model: 'claude-sonnet-4-6',
        content: [{ type: 'text', text: JSON.stringify(Array.from({ length: k }, (_, i) => `r${i}`)) }],
        stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  return Object.assign(f, { log });
}

const BIG_CSV = join(mkdtempSync(join(tmpdir(), 'batch-sites-')), 'big.csv');
writeFileSync(BIG_CSV, 'v\n' + Array.from({ length: N }, (_, i) => `item${i}`).join('\n') + '\n');

describe('batch packing at every {llm} site', () => {
  it(`packs an {llm} sort key over ${N} rows at most ${BATCH} per request`, async () => {
    const fetch = echoBatchFetch();
    const r = createHeadlessRunner({ model: 'claude-sonnet-4-6', apiKey: 'x', maxRetries: 0, fetch });
    await r.loadInput(BIG_CSV);
    await r.setSpec({
      columns: [{ id: 'v' }],
      transformations: [{ kind: 'sort', by: [{ key: { llm: 'rank {v}' }, dir: 'asc' }] }],
    } as never);
    const sizes = fetch.log.map((c) => countTasks(c.body));
    expect(sizes.length).toBeGreaterThan(1);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(BATCH);
  });

  it(`packs {llm} group aggregates over ${N} groups at most ${BATCH} per request`, async () => {
    const fetch = echoBatchFetch();
    const r = createHeadlessRunner({ model: 'claude-sonnet-4-6', apiKey: 'x', maxRetries: 0, fetch });
    await r.loadInput(BIG_CSV);
    await r.setSpec({
      columns: [{ id: 'v' }, { id: 'summary' }],
      transformations: [{ kind: 'group', by: ['v'], agg: { summary: { llm: 'sum {*}' } } }],
    } as never);
    const sizes = fetch.log.map((c) => countTasks(c.body));
    expect(sizes.length).toBeGreaterThan(1);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(BATCH);
  });
});
