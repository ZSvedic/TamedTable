import { describe, it, expect } from 'bun:test';
import { diffPlans, type PlanEdit } from './index.ts';
import type { TablePlan, Transformation } from '@tamedtable/core';

const baseSpec = (overrides: Partial<TablePlan> = {}): TablePlan => ({
  columns: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
  transformations: [],
  ...overrides,
});

const filterT: Transformation = { kind: 'filter', pred: { js: 'row.A === 1' } };
const mutateT: Transformation = { kind: 'mutate', columns: 'B', value: { llm: 'normalize {B}' } };

describe('diffPlans', () => {
  it('returns empty array when specs are identical', () => {
    const s = baseSpec();
    expect(diffPlans(s, s)).toEqual([]);
  });

  it('detects an added column', () => {
    const oldS = baseSpec();
    const newS = baseSpec({ columns: [...oldS.columns, { id: 'D' }] });
    expect(diffPlans(oldS, newS)).toEqual([{ kind: 'add-column', id: 'D' }]);
  });

  it('detects a removed column', () => {
    const oldS = baseSpec();
    const newS = baseSpec({ columns: [{ id: 'A' }, { id: 'C' }] });
    expect(diffPlans(oldS, newS)).toEqual([{ kind: 'remove-column', id: 'B' }]);
  });

  it('detects a same-set reorder', () => {
    const oldS = baseSpec();
    const newS = baseSpec({ columns: [{ id: 'C' }, { id: 'A' }, { id: 'B' }] });
    const edits = diffPlans(oldS, newS);
    expect(edits).toEqual([
      { kind: 'reorder-columns', from: ['A', 'B', 'C'], to: ['C', 'A', 'B'] },
    ]);
  });

  it('detects an appended transformation', () => {
    const oldS = baseSpec();
    const newS = baseSpec({ transformations: [filterT] });
    expect(diffPlans(oldS, newS)).toEqual([
      { kind: 'add-transformation', transformation: filterT },
    ]);
  });

  it('detects a popped transformation (undo)', () => {
    const oldS = baseSpec({ transformations: [filterT, mutateT] });
    const newS = baseSpec({ transformations: [filterT] });
    expect(diffPlans(oldS, newS)).toEqual([
      { kind: 'remove-transformation', transformation: mutateT },
    ]);
  });

  it('treats prefix-divergence as remove + add', () => {
    const oldS = baseSpec({ transformations: [filterT, mutateT] });
    const newS = baseSpec({ transformations: [mutateT] });
    const edits = diffPlans(oldS, newS);
    expect(edits).toContainEqual({ kind: 'remove-transformation', transformation: filterT });
    expect(edits).toContainEqual({ kind: 'remove-transformation', transformation: mutateT });
    expect(edits).toContainEqual({ kind: 'add-transformation', transformation: mutateT });
  });

  it('combines column add with transformation append in a single diff', () => {
    const oldS = baseSpec();
    const newS = baseSpec({
      columns: [...oldS.columns, { id: 'D' }],
      transformations: [
        { kind: 'mutate', columns: 'D', value: { llm: 'compute {A}' } } as Transformation,
      ],
    });
    const edits = diffPlans(oldS, newS);
    expect(edits).toHaveLength(2);
    expect(edits).toContainEqual({ kind: 'add-column', id: 'D' });
    expect(edits.find((p: PlanEdit) => p.kind === 'add-transformation')).toBeDefined();
  });
});
