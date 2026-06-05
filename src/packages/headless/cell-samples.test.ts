// TDD: verify that RequestDebugInfo.cellSamples captures per-row LLM replies.
// Uses a mock fetch so no cassette or API key is needed.

import { describe, it, expect, beforeAll } from 'bun:test';
import { join } from 'node:path';
import { createHeadlessRunner } from './index.ts';
import type { RequestDebugInfo } from './index.ts';

// Bypass the rate limiter — same trick the cassette replay profile uses.
process.env.TAMEDTABLE_RPM = String(Number.MAX_SAFE_INTEGER);

const FIXTURES = join(import.meta.dirname, '..', '..', '..', 'spec', 'test-cases');

/** Minimal Anthropic streaming response body for a tool-use call. */
function specPatchBody(operations: unknown[]): string {
  return JSON.stringify({
    model: 'claude-sonnet-4-6',
    id: 'msg_test_patch',
    type: 'message',
    role: 'assistant',
    content: [{
      type: 'tool_use',
      id: 'toolu_test_patch',
      name: 'apply_spec_patch',
      input: { operations },
    }],
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 50 },
  });
}

/** Minimal Anthropic response body for a per-cell text reply. */
function cellReplyBody(text: string): string {
  return JSON.stringify({
    model: 'claude-sonnet-4-5',
    id: 'msg_test_cell',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 30, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 10 },
  });
}

/** Returns a mock fetch: spec-patch on the first call, single-cell value on all
 *  subsequent calls (per-row path — the SDK falls back to per-row when the
 *  batch response isn't a JSON array matching the prompt count). */
function mockFetch(): typeof globalThis.fetch {
  return async (_input, init) => {
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    const isSpecPatch = Array.isArray(body.tools);
    const responseBody = isSpecPatch
      ? specPatchBody([{
          op: 'add',
          path: '/transformations/-',
          value: {
            kind: 'mutate',
            columns: 'Country',
            value: { llm: "Normalize '{Country}' to its canonical English name. Reply with only the name." },
          },
        }])
      : cellReplyBody('United States');
    return new Response(responseBody, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}

describe('RequestDebugInfo.cellSamples', () => {
  let debugInfo: RequestDebugInfo | undefined;

  beforeAll(async () => {
    const runner = createHeadlessRunner({
      apiKey: 'test-key',
      fetch: mockFetch(),
      onDebug: (info) => { debugInfo = info; },
    });
    await runner.loadInput(join(FIXTURES, 'datanorm-input.csv'));
    await runner.request('Normalize the Country column using LLM');
  });

  it('populates cellSamples in the debug info', () => {
    expect(debugInfo).toBeDefined();
    expect(debugInfo!.cellSamples).toBeDefined();
    expect(debugInfo!.cellSamples!.length).toBeGreaterThan(0);
  });

  it('records the column name', () => {
    const sample = debugInfo!.cellSamples!.find((s) => s.column === 'Country');
    expect(sample).toBeDefined();
  });

  it('records at least one before→after pair', () => {
    const sample = debugInfo!.cellSamples!.find((s) => s.column === 'Country')!;
    expect(sample.samples.length).toBeGreaterThan(0);
    // "in" is the original value, "out" is the LLM reply
    expect(sample.samples[0]).toHaveProperty('in');
    expect(sample.samples[0]).toHaveProperty('out');
  });

  it('before value is the original cell content', () => {
    const sample = debugInfo!.cellSamples!.find((s) => s.column === 'Country')!;
    // datanorm-input.csv row 1 Country = "USA"
    expect(sample.samples[0]!.in).toBe('USA');
  });

  it('after value is the LLM reply', () => {
    const sample = debugInfo!.cellSamples!.find((s) => s.column === 'Country')!;
    expect(sample.samples[0]!.out).toBe('United States');
  });
});
