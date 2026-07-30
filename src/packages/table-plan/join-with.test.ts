// #LookupJoin
// Pins join.with's edges: null is a join the model emitted without a filename
// (the user named none — the web UI asks for the file and writes the picked
// name back), while a named file must still be .csv or .jsonl.
import { describe, it, expect } from 'bun:test';
import { validateTablePlan } from './index.ts';

const planWith = (withValue: unknown) => ({
  columns: [{ id: 'Country' }],
  transformations: [
    { kind: 'join', with: withValue, on: { js: 'leftRow.Country === rightRow.Country' } },
  ],
});

describe('join.with', () => {
  it('accepts null — no file named yet', () => {
    expect(() => validateTablePlan(planWith(null))).not.toThrow();
  });

  it('accepts a .csv name', () => {
    expect(() => validateTablePlan(planWith('codes.csv'))).not.toThrow();
  });

  it('still rejects a name with an unknown extension', () => {
    expect(() => validateTablePlan(planWith('codes.xlsx'))).toThrow('unknown file type');
  });
});
