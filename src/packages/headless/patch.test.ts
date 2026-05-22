import { describe, it, expect } from 'bun:test';
import { applyAndValidate } from './index.ts';
import type { Spec } from '@tamedtable/core';

const baseSpec: Spec = { table: 't.csv', columns: [{ id: 'A' }], transformations: [] };

describe('applyAndValidate', () => {
  it('applies a well-formed patch and returns the new spec', () => {
    const r = applyAndValidate(baseSpec, [
      { op: 'add', path: '/transformations/-', value: { kind: 'filter', pred: { js: 'true' } } },
    ]);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.spec.transformations).toHaveLength(1);
  });

  it('rejects an empty operations array with an actionable message', () => {
    const r = applyAndValidate(baseSpec, []);
    expect(r.kind).toBe('err');
  });

  it('surfaces a malformed patch op as a clear RFC-6902 message, not an internal TypeError', () => {
    const r = applyAndValidate(baseSpec, [
      { op: 'bogus', path: '/transformations/-', value: 1 },
    ]);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') {
      expect(r.message).not.toContain('is not an object');
      expect(r.message).toContain('RFC-6902');
    }
  });
});
