// TDD: a patch that leaves a `validate` reading a column no earlier step
// provides is rejected before anything runs and fed back through the recovery
// loop. See spec/behavior.md § Headless and § validate. Uses a mock fetch so
// no cassette or API key is needed.

import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';
import { createHeadlessRunner, checkValidateColumnOrder } from './index.ts';
import type { RequestDebugInfo } from './index.ts';
import type { TablePlan } from '@tamedtable/core';

// Bypass the rate limiter — same trick the cassette replay profile uses.
process.env.TAMEDTABLE_RPM = String(Number.MAX_SAFE_INTEGER);

const FIXTURES = join(import.meta.dirname, '..', '..', '..', 'spec', 'test-cases');

const plan = (transformations: unknown[]): TablePlan =>
  ({ columns: [], transformations } as TablePlan);

describe('checkValidateColumnOrder', () => {
  const SOURCE = ['City', 'Country'];

  it('passes a validate reading a source column', () => {
    const spec = plan([{ kind: 'validate', pred: { js: "row.City !== ''" } }]);
    expect(checkValidateColumnOrder(spec, SOURCE)).toBeUndefined();
  });

  it('passes a validate reading a column an earlier mutate creates', () => {
    const spec = plan([
      { kind: 'mutate', columns: '_match', value: { js: "'yes'" } },
      { kind: 'validate', pred: { js: "row._match === 'yes'" } },
    ]);
    expect(checkValidateColumnOrder(spec, SOURCE)).toBeUndefined();
  });

  it('rejects a validate ordered before the mutate that computes its column', () => {
    const spec = plan([
      { kind: 'validate', pred: { js: "row._match === 'yes'" } },
      { kind: 'mutate', columns: '_match', value: { js: "'yes'" } },
    ]);
    const err = checkValidateColumnOrder(spec, SOURCE);
    expect(err).toContain('"_match"');
    expect(err).toContain('no earlier step provides');
  });

  it('rejects a validate reading a column nothing creates', () => {
    const spec = plan([{ kind: 'validate', pred: { js: 'row.Missing' } }]);
    expect(checkValidateColumnOrder(spec, SOURCE)).toContain('"Missing"');
  });

  it('checks bracket references and {llm} placeholders too', () => {
    const bracket = plan([{ kind: 'validate', pred: { js: "row['Not There']" } }]);
    expect(checkValidateColumnOrder(bracket, SOURCE)).toContain('"Not There"');
    const llm = plan([{ kind: 'validate', pred: { llm: 'Is {Ghost} plausible? Reply yes or no.' } }]);
    expect(checkValidateColumnOrder(llm, SOURCE)).toContain('"Ghost"');
  });

  it('allows the reserved _valid/_validation pair and skips {sql} preds', () => {
    const reserved = plan([
      { kind: 'validate', pred: { js: 'row.City' } },
      { kind: 'validate', pred: { js: 'row._valid === true' } },
    ]);
    expect(checkValidateColumnOrder(reserved, SOURCE)).toBeUndefined();
    const sql = plan([{ kind: 'validate', pred: { sql: 'Missing > 0' } }]);
    expect(checkValidateColumnOrder(sql, SOURCE)).toBeUndefined();
  });

  it('suspends the check after a join (its columns are unknowable statically)', () => {
    const spec = plan([
      { kind: 'join', with: 'lookup.csv', on: { js: 'leftRow.City === rightRow.City' } },
      { kind: 'validate', pred: { js: "row.ISO !== ''" } },
    ]);
    expect(checkValidateColumnOrder(spec, SOURCE)).toBeUndefined();
  });

  it('tracks split targets and select narrowing', () => {
    const split = plan([
      { kind: 'split', from: 'City', into: ['A', 'B'], on: ' ' },
      { kind: 'validate', pred: { js: 'row.B' } },
    ]);
    expect(checkValidateColumnOrder(split, SOURCE)).toBeUndefined();
    const select = plan([
      { kind: 'select', columns: ['City'] },
      { kind: 'validate', pred: { js: 'row.Country' } },
    ]);
    expect(checkValidateColumnOrder(select, SOURCE)).toContain('"Country"');
  });
});

/** Minimal Anthropic response body for an apply_spec_patch tool call. */
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

const BAD_ORDER_OPS = [
  { op: 'add', path: '/columns/-', value: { id: '_flag' } },
  { op: 'add', path: '/transformations/-', value: { kind: 'validate', pred: { js: "row._flag === 'yes'" }, message: { js: "'flagged'" } } },
  { op: 'add', path: '/transformations/-', value: { kind: 'mutate', columns: '_flag', value: { js: "row.Country === 'USA' ? 'yes' : 'no'" } } },
];

const GOOD_ORDER_OPS = [
  { op: 'add', path: '/columns/-', value: { id: '_flag' } },
  { op: 'add', path: '/transformations/-', value: { kind: 'mutate', columns: '_flag', value: { js: "row.Country === 'USA' ? 'yes' : 'no'" } } },
  { op: 'add', path: '/transformations/-', value: { kind: 'validate', pred: { js: "row._flag === 'yes'" }, message: { js: "'flagged'" } } },
];

describe('request() feeds the ordering rejection through the recovery loop', () => {
  it('rejects the mis-ordered patch, then commits the corrected one', async () => {
    let patchCalls = 0;
    let debugInfo: RequestDebugInfo | undefined;
    const runner = createHeadlessRunner({
      apiKey: 'test-key',
      onDebug: (info) => { debugInfo = info; },
      fetch: async () => {
        patchCalls++;
        const body = specPatchBody(patchCalls === 1 ? BAD_ORDER_OPS : GOOD_ORDER_OPS);
        return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });
    await runner.loadInput(join(FIXTURES, 'customers-input.csv'));
    await runner.request('Flag customers outside the USA');

    expect(patchCalls).toBe(2);
    const transformations = runner.currentSpec().transformations;
    expect(transformations.map((t) => (t as { kind: string }).kind)).toEqual(['mutate', 'validate']);

    expect(debugInfo!.turns).toHaveLength(2);
    expect(debugInfo!.turns[0]!.outcome).toBe('rejected');
    expect(debugInfo!.turns[0]!.sentBack).toContain('no earlier step provides');
    expect(debugInfo!.turns[1]!.outcome).toBe('committed');

    const rows = runner.currentRows();
    expect(rows[0]!._valid).toBe(true);   // row 01 — USA
    expect(rows[1]!._valid).toBe(false);  // row 02 — Canada
  });
});
