// #Analyze: the query tool's read hands back plain values for plain types
// and DuckDB's own text for everything else, so the Node and wasm engines
// produce the same bytes (spec/code-contract.md § Questions about the data).
import { describe, expect, it } from 'bun:test';
import { SqlSession } from './sql.ts';

describe('SqlSession.query', () => {
  const rows = [
    { Customer: 'Acme', Quarter: 'Q1', Revenue: '31000', Day: '2024-02-03' },
    { Customer: 'Acme', Quarter: 'Q2', Revenue: '28000', Day: '2024-05-06' },
  ];

  it('keeps integers, doubles, booleans, and text; casts lists, decimals, and dates to text', async () => {
    const sql = new SqlSession();
    const out = await sql.query(rows, `
      SELECT Customer,
             count(*) AS n,
             sum(TRY_CAST(Revenue AS DOUBLE)) AS rev,
             count(*) > 1 AS several,
             array_agg(Quarter ORDER BY Quarter) AS quarters,
             CAST(59000 AS DECIMAL(10,2)) AS dec,
             min(TRY_CAST(Day AS DATE)) AS first_day
      FROM t GROUP BY Customer ORDER BY Customer`);
    expect(out.columns).toEqual(['Customer', 'n', 'rev', 'several', 'quarters', 'dec', 'first_day']);
    expect(out.rows).toEqual([
      { Customer: 'Acme', n: 2, rev: 59000, several: true, quarters: '[Q1, Q2]', dec: '59000.00', first_day: '2024-02-03' },
    ]);
  });

  it('refuses anything but a read', async () => {
    const sql = new SqlSession();
    await expect(sql.query(rows, 'DELETE FROM t')).rejects.toThrow(/only SELECT or WITH/);
  });

  it('names the columns of an empty result', async () => {
    const sql = new SqlSession();
    const out = await sql.query(rows, "SELECT Customer, Quarter FROM t WHERE Customer = 'nobody'");
    expect(out.columns).toEqual(['Customer', 'Quarter']);
    expect(out.rows).toEqual([]);
  });
});
