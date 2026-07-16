// #OpenFlow — unit tests for describeStep, the derived one-line step label
// the flow-run dialog shows. Shapes mirror a real user flow (chess
// tournaments): an AI clustering mutate, js filters, a grouped aggregation.
import { describe, it, expect } from 'bun:test';
import { describeStep } from './index.ts';
import type { Transformation } from '@tamedtable/core';

describe('describeStep', () => {
  it('marks a per-row AI mutate with its target column', () => {
    const t: Transformation = { kind: 'mutate', columns: 'EventGroup', value: { llm: 'Cluster this row…' } };
    expect(describeStep(t)).toBe('mutate EventGroup (AI)');
  });

  it('labels deterministic filters by expression shape', () => {
    expect(describeStep({ kind: 'filter', pred: { js: "row.FED === 'CRO'" } })).toBe('filter (js)');
    expect(describeStep({ kind: 'filter', pred: { sql: "FED = 'CRO'" } })).toBe('filter (sql)');
  });

  it('shows group keys and aggregate outputs, capped', () => {
    const t: Transformation = {
      kind: 'group',
      by: ['EventGroup'],
      agg: {
        total_players: { js: 'rows.length' },
        sections: { js: 'rows.length' },
        first_start: { js: 'null' },
        last_end: { js: 'null' },
        locations: { js: 'null' },
      },
    };
    expect(describeStep(t)).toBe('group by EventGroup → total_players, sections, first_start, last_end, …');
  });

  it('marks a group whose aggregate calls the cell model', () => {
    const t: Transformation = { kind: 'group', by: ['City'], agg: { summary: { llm: 'Summarize {*}' } } };
    expect(describeStep(t)).toBe('group by City → summary (AI)');
  });

  it('names sort keys with direction, expression keys by marker', () => {
    expect(describeStep({ kind: 'sort', by: [{ key: 'Name', dir: 'desc' }] })).toBe('sort by Name desc');
    expect(describeStep({ kind: 'sort', by: [{ key: { js: 'Number(row.total_players) || 0' }, dir: 'desc' }] }))
      .toBe('sort by (js) desc');
  });

  it('covers the remaining kinds', () => {
    expect(describeStep({ kind: 'select', columns: ['A', 'B'] })).toBe('select A, B');
    expect(describeStep({ kind: 'join', with: 'lookup.csv', on: { js: 'true' } })).toBe('join lookup.csv');
    expect(describeStep({ kind: 'split', from: 'Name', into: ['First', 'Last'], on: ' ' })).toBe('split Name → First, Last');
    expect(describeStep({ kind: 'validate', pred: { js: 'true' } })).toBe('validate (js)');
    expect(describeStep({ kind: 'pivot', index: ['Y'], on: 'Month', values: 'Sales' })).toBe('pivot Sales by Month');
    expect(describeStep({ kind: 'unpivot', id: ['Y'], measures: ['Jan', 'Feb'] })).toBe('unpivot Jan, Feb');
  });
});
