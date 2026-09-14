// #Analyze: the query tool's pure helpers (spec/code-contract.md § Questions
// about the data): result bounds, sentinel blanking, the canonical order an
// unordered result gets, and the carried answer in the prompt.
import { describe, expect, it } from 'bun:test';
import {
  ANSWER_CELL_CHARS,
  ANSWER_SAMPLE_COLS,
  ANSWER_SAMPLE_ROWS,
  blankSentinelRows,
  boundQueryResult,
  buildPrompt,
  canonicalRowOrder,
  failedCell,
  pendingCell,
} from './index.ts';

describe('boundQueryResult', () => {
  it('caps rows and columns, clips cells for the model, keeps real values for the host', () => {
    const columns = Array.from({ length: ANSWER_SAMPLE_COLS + 2 }, (_, i) => `c${i}`);
    const long = 'x'.repeat(ANSWER_CELL_CHARS + 10);
    const rows = Array.from({ length: ANSWER_SAMPLE_ROWS + 5 }, (_, i) => Object.fromEntries(columns.map((c) => [c, i === 0 ? long : i])));
    const { forModel, forHost } = boundQueryResult(columns, rows, 3);
    expect(forModel.rows).toHaveLength(ANSWER_SAMPLE_ROWS);
    expect(forModel.columns).toHaveLength(ANSWER_SAMPLE_COLS);
    expect(forModel.totalRows).toBe(ANSWER_SAMPLE_ROWS + 5);
    expect(forModel.truncated).toBe(true);
    expect(forModel.pendingRows).toBe(3);
    expect(String(forModel.rows[0]![0])).toHaveLength(ANSWER_CELL_CHARS + 1); // clipped, with an ellipsis
    expect(forHost.rows[0]![0]).toBe(long); // the host keeps the value whole
    expect(forHost.totalRows).toBe(ANSWER_SAMPLE_ROWS + 5);
  });

  it('marks a small result as not truncated', () => {
    const { forModel } = boundQueryResult(['a'], [{ a: 1 }], 0);
    expect(forModel.truncated).toBe(false);
    expect(forModel.rows).toEqual([[1]]);
  });
});

describe('blankSentinelRows', () => {
  it('turns pending and failed cells into null and counts the rows touched', () => {
    const rows = [
      { a: 1, b: pendingCell() },
      { a: 2, b: failedCell('boom') },
      { a: 3, b: 'ok' },
    ];
    const out = blankSentinelRows(rows);
    expect(out.pendingRows).toBe(2);
    expect(out.rows.map((r) => r.b)).toEqual([null, null, 'ok']);
    expect(rows[0]!.b).not.toBeNull(); // the input is untouched
  });

  it('returns the same array when no cell carries a sentinel', () => {
    const rows = [{ a: 1 }];
    expect(blankSentinelRows(rows).rows).toBe(rows);
  });
});

describe('canonicalRowOrder', () => {
  it('orders by each column in turn, nulls first, without touching the input', () => {
    const rows = [{ n: 'b', k: 2 }, { n: 'a', k: 2 }, { n: 'a', k: null }, { n: 'a', k: 1 }];
    const out = canonicalRowOrder(['n', 'k'], rows);
    expect(out).toEqual([{ n: 'a', k: null }, { n: 'a', k: 1 }, { n: 'a', k: 2 }, { n: 'b', k: 2 }]);
    expect(rows[0]).toEqual({ n: 'b', k: 2 });
  });
});

describe('buildPrompt', () => {
  const spec = { table: '/tmp/x/customers.csv', columns: [{ id: 'A' }], transformations: [] };
  it('is the plain request without a prior answer', () => {
    expect(buildPrompt('hello', spec)).toBe('Current spec:\n' + JSON.stringify({ ...spec, table: 'customers.csv' }, null, 2) + '\n\nUser request: hello');
  });
  it('appends the prior answer after the request, on the error prompt too', () => {
    expect(buildPrompt('keep those', spec, undefined, 'USA leads.')).toMatch(/User request: keep those\n\nYour previous answer: USA leads\.$/);
    expect(buildPrompt('keep those', spec, 'Your previous patch failed: x', 'USA leads.')).toMatch(/Original user request: keep those\n\nYour previous answer: USA leads\.\n\nEmit a corrected patch\./);
  });
});
