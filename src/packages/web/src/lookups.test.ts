// #LookupJoin
// The lookup scan behind the "this join needs another file" dialog. The dialog
// itself is covered by the @web flow scenarios; this pins the scan's edges,
// which are what decide whether a run stops to ask at all.
import { describe, it, expect } from 'bun:test';
import type { TablePlan } from '@tamedtable/core';
import { missingLookups } from './controller-files.ts';

const plan = (...transformations: TablePlan['transformations']): TablePlan => ({
  table: 't.csv',
  columns: [{ id: 'Country' }],
  transformations,
});

const join = (name: string | null): TablePlan['transformations'][number] => ({
  kind: 'join',
  with: name,
  on: { js: 'leftRow.Country === rightRow.Country' },
});

const filter = (): TablePlan['transformations'][number] => ({ kind: 'filter', pred: { js: 'true' } });

describe('missingLookups', () => {
  it('names the file a join has nothing staged for', () => {
    expect(missingLookups(plan(join('codes.csv')), new Set())).toEqual([{ index: 0, name: 'codes.csv' }]);
  });

  it('stays quiet when the lookup is already staged', () => {
    expect(missingLookups(plan(join('codes.csv')), new Set(['codes.csv']))).toEqual([]);
  });

  it('asks only for what is missing when an earlier join is staged', () => {
    expect(missingLookups(plan(join('old.csv'), join('new.csv')), new Set(['old.csv']))).toEqual([{ index: 1, name: 'new.csv' }]);
  });

  it('asks once for a name two joins share', () => {
    expect(missingLookups(plan(join('codes.csv'), join('codes.csv')), new Set())).toEqual([{ index: 0, name: 'codes.csv' }]);
  });

  it('names several files in step order', () => {
    expect(missingLookups(plan(join('a.csv'), filter(), join('b.csv')), new Set())).toEqual([
      { index: 0, name: 'a.csv' },
      { index: 2, name: 'b.csv' },
    ]);
  });

  it('asks for a join that names no file, keeping its step index', () => {
    expect(missingLookups(plan(filter(), join(null)), new Set())).toEqual([{ index: 1, name: null }]);
  });

  it('asks separately for each join that names no file', () => {
    expect(missingLookups(plan(join(null), join(null)), new Set())).toEqual([
      { index: 0, name: null },
      { index: 1, name: null },
    ]);
  });

  it('has nothing to ask for in a spec without joins', () => {
    expect(missingLookups(plan(filter()), new Set())).toEqual([]);
  });
});
