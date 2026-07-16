// #Patch — unit tests for query-provenance stamping and its prompt-side strip.
import { describe, it, expect } from 'bun:test';
import { stampQueries, stripQueryMetadata } from './index.ts';
import type { TablePlan, Transformation } from '@tamedtable/core';

const plan = (transformations: Transformation[]): TablePlan => ({
  columns: [{ id: 'Country' }],
  transformations,
});

const usaFilter: Transformation = { kind: 'filter', pred: { js: "row.Country === 'USA'" } };
const sortRows: Transformation = { kind: 'sort', by: [{ key: 'Country', dir: 'asc' }] };

describe('stampQueries', () => {
  it('stamps a transformation the turn added', () => {
    const before = plan([]);
    const after = stampQueries(plan([usaFilter]), before, 'Show only USA');
    expect(after.transformations[0]).toEqual({ ...usaFilter, query: 'Show only USA' });
  });

  it('keeps the earlier stamp on an untouched transformation', () => {
    const stamped: Transformation = { ...usaFilter, query: 'first request' };
    const before = plan([stamped]);
    const after = stampQueries(plan([stamped, sortRows]), before, 'second request');
    expect(after.transformations).toEqual([stamped, { ...sortRows, query: 'second request' }]);
  });

  it('restamps a transformation the turn rewrote', () => {
    const stamped: Transformation = { ...usaFilter, query: 'first request' };
    const rewritten: Transformation = { ...stamped, pred: { js: "row.Country === 'Canada'" } };
    const after = stampQueries(plan([rewritten]), plan([stamped]), 'make it Canada');
    expect(after.transformations[0]).toEqual({ ...rewritten, query: 'make it Canada' });
  });
});

describe('stripQueryMetadata', () => {
  it('removes every stamp and nothing else', () => {
    const spec = plan([{ ...usaFilter, query: 'Show only USA' }, sortRows]);
    expect(stripQueryMetadata(spec).transformations).toEqual([usaFilter, sortRows]);
  });

  it('returns the spec unchanged when nothing is stamped', () => {
    const spec = plan([usaFilter]);
    expect(stripQueryMetadata(spec)).toBe(spec);
  });
});
