import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';
import { createHeadlessRunner } from './index.ts';
import { validateSpec, type Spec } from '@tamedtable/core';

const CSV = join(import.meta.dir, '../../../spec/test-cases/performance-liked-videos.csv');

// JS aggregate: parse each "HH:MM:SS" duration cell to seconds and sum the
// whole column. 51 of the 1821 rows have an empty duration and contribute 0.
const SUM_DURATION_JS =
  "rows.reduce((a,r)=>{const p=String(r.duration||'').split(':').map(Number);" +
  'return a+((p[0]||0)*3600+(p[1]||0)*60+(p[2]||0));},0)';

const TOTAL_DURATION_SECONDS = 1131455;

describe('group with an empty by — aggregate the whole table', () => {
  it('validateSpec accepts a group transformation with an empty by array', () => {
    expect(() =>
      validateSpec({
        columns: [{ id: 'total_seconds' }],
        transformations: [
          { kind: 'group', by: [], agg: { total_seconds: { js: SUM_DURATION_JS } } },
        ],
      }),
    ).not.toThrow();
  });

  it('collapses every row into a single aggregated row', async () => {
    const runner = createHeadlessRunner({});
    await runner.loadInput(CSV);
    const spec: Spec = {
      columns: [{ id: 'total_seconds' }],
      transformations: [
        { kind: 'group', by: [], agg: { total_seconds: { js: SUM_DURATION_JS } } },
      ],
    };
    await runner.setSpec(spec);
    const rows = runner.currentRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ total_seconds: TOTAL_DURATION_SECONDS });
  });

  it('still rejects a group that omits the by field entirely', () => {
    expect(() =>
      validateSpec({
        columns: [],
        transformations: [{ kind: 'group', agg: { n: { js: 'rows.length' } } }],
      }),
    ).toThrow();
  });

  it('lets a {sql} aggregate reach the whole table as relation t', async () => {
    const runner = createHeadlessRunner({});
    await runner.loadInput(CSV);
    const spec: Spec = {
      columns: [{ id: 'row_count' }],
      transformations: [
        { kind: 'group', by: [], agg: { row_count: { sql: '(SELECT count(*) FROM t)' } } },
      ],
    };
    await runner.setSpec(spec);
    const rows = runner.currentRows();
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]!.row_count)).toBe(1821);
  });

  it('still resolves a {sql} aggregate against relation g', async () => {
    const runner = createHeadlessRunner({});
    await runner.loadInput(CSV);
    const spec: Spec = {
      columns: [{ id: 'row_count' }],
      transformations: [
        { kind: 'group', by: [], agg: { row_count: { sql: 'count(*)' } } },
      ],
    };
    await runner.setSpec(spec);
    expect(Number(runner.currentRows()[0]!.row_count)).toBe(1821);
  });
});
