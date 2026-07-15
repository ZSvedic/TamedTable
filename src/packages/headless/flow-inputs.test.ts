// #FileIO
// checkFlowInputColumns — can a saved flow run on a table with the given
// source columns? Drives the web's "Open .flow & run on current data…" guard.
import { describe, expect, it } from 'bun:test';
import type { TablePlan, Transformation } from '@tamedtable/core';
import { checkFlowInputColumns } from './index.ts';

const SOURCE = ['ID', 'Name', 'Country'];

function plan(transformations: Transformation[]): TablePlan {
  return { columns: SOURCE.map((id) => ({ id })), transformations };
}

describe('checkFlowInputColumns', () => {
  it('accepts a flow that reads only source columns', () => {
    const spec = plan([
      { kind: 'filter', pred: { js: "row.Country === 'USA'" } },
      { kind: 'sort', by: [{ key: 'Name', dir: 'asc' }] },
    ]);
    expect(checkFlowInputColumns(spec, SOURCE)).toBeUndefined();
  });

  it('names a template column the table lacks', () => {
    const spec = plan([
      { kind: 'mutate', columns: 'Phone', value: { llm: 'Normalize {Phone}' } },
    ]);
    expect(checkFlowInputColumns(spec, SOURCE)).toContain('"Phone"');
  });

  it('names a js row reference the table lacks', () => {
    const spec = plan([{ kind: 'filter', pred: { js: 'row.FED === "CRO"' } }]);
    const err = checkFlowInputColumns(spec, SOURCE);
    expect(err).toContain('"FED"');
    expect(err).toContain('step 1 (filter)');
  });

  it('sees columns created by earlier steps', () => {
    const spec = plan([
      { kind: 'mutate', columns: 'Upper', value: { js: 'String(row.Name).toUpperCase()' } },
      { kind: 'sort', by: [{ key: 'Upper', dir: 'asc' }] },
    ]);
    expect(checkFlowInputColumns(spec, SOURCE)).toBeUndefined();
  });

  it('narrows availability through a group', () => {
    const spec = plan([
      { kind: 'group', by: ['Country'], agg: { total: { js: 'rows.length' } } },
      { kind: 'sort', by: [{ key: 'Name', dir: 'asc' }] },
    ]);
    expect(checkFlowInputColumns(spec, SOURCE)).toContain('"Name"');
  });

  it('suspends the check after a join (columns unknowable)', () => {
    const spec = plan([
      { kind: 'join', with: 'lookup.csv', on: { js: 'row.ID' } },
      { kind: 'filter', pred: { js: 'row.JoinedColumn != null' } },
    ]);
    expect(checkFlowInputColumns(spec, SOURCE)).toBeUndefined();
  });
});
