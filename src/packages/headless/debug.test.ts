import { describe, it, expect } from 'bun:test';
import { transformationExpressions } from './index.ts';
import type { Transformation } from '@tamedtable/core';

describe('transformationExpressions', () => {
  it('extracts a validate predicate as a "pred" line, ignoring message', () => {
    const t: Transformation = {
      kind: 'validate',
      pred: { js: 'row.DOB && String(row.DOB).length > 0' },
      message: { js: "'DOB is empty'" },
    };
    expect(transformationExpressions(t)).toEqual([
      { label: 'pred', body: 'row.DOB && String(row.DOB).length > 0' },
    ]);
  });

  it('extracts a filter predicate', () => {
    const t: Transformation = { kind: 'filter', pred: { js: "row.Country === 'USA'" } };
    expect(transformationExpressions(t)).toEqual([
      { label: 'pred', body: "row.Country === 'USA'" },
    ]);
  });

  it('extracts a mutate value', () => {
    const t: Transformation = { kind: 'mutate', columns: 'Phone', value: { llm: 'normalize {Phone}' } };
    expect(transformationExpressions(t)).toEqual([
      { label: 'value', body: 'normalize {Phone}' },
    ]);
  });

  it('returns no lines for a pivot (no primary expression)', () => {
    const t: Transformation = { kind: 'pivot', index: ['Region'], on: 'Quarter', values: 'Revenue' };
    expect(transformationExpressions(t)).toEqual([]);
  });
});
