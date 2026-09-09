// #TablePick #IoFormats
// Edges the Gherkin round trip does not reach: the XLSX writer's typed cells
// survive a write→read (numbers, booleans, nulls, nested values, whitespace
// and control characters), and the HTML reader's colspan / nested rules.
import { describe, expect, test } from 'bun:test';
import { xlsxCodec } from './xlsx.ts';
import { htmlCodec } from './html.ts';

describe('xlsx codec', () => {
  test('typed cells round-trip through write and read', async () => {
    const rows = [
      { n: 1.5, b: true, s: ' padded ', nested: { a: [1, 2] }, empty: null, ctl: 'ab' },
      { n: -2, b: false, s: 'x < y & "z"', nested: null, empty: null, ctl: 'plain' },
    ];
    const columns = ['n', 'b', 's', 'nested', 'empty', 'ctl'];
    const bytes = await xlsxCodec.serialize!(rows, columns, ['N', 'B', 'S', 'Nested', 'Empty', 'Ctl']);
    const tables = await xlsxCodec.listTables!(bytes, 'out.xlsx');
    expect(tables).toHaveLength(1);
    expect(tables[0]!.columns).toEqual(['N', 'B', 'S', 'Nested', 'Empty', 'Ctl']);
    expect(tables[0]!.location).toBe('Sheet1!A1:F3');
    const parsed = await xlsxCodec.parse(bytes, 'out.xlsx', 1);
    expect(parsed.rows).toEqual([
      { N: 1.5, B: true, S: ' padded ', Nested: '{"a":[1,2]}', Empty: null, Ctl: 'ab' },
      { N: -2, B: false, S: 'x < y & "z"', Nested: null, Empty: null, Ctl: 'plain' },
    ]);
  });

  test('a table with no rows still lists once, with its header', async () => {
    const bytes = await xlsxCodec.serialize!([], ['a', 'b']);
    const [table] = await xlsxCodec.listTables!(bytes, 'empty.xlsx');
    expect(table).toMatchObject({ index: 1, name: 'Sheet1', rowCount: 0, columns: ['a', 'b'] });
  });

  test('bytes that are not a workbook fail by name', () => {
    expect(() => xlsxCodec.listTables!(new TextEncoder().encode('nope'), 'x.xlsx')).toThrow(
      'x.xlsx: not an .xlsx workbook',
    );
  });
});

describe('html codec', () => {
  const html = (body: string): Uint8Array => new TextEncoder().encode(`<html><body>${body}</body></html>`);

  test('a colspan header repeats its slot and blank names become column<i>', async () => {
    const bytes = html(
      '<table><tr><th colspan="2">Sales</th><th></th></tr><tr><td>1</td><td>2</td><td>3</td><td>4</td></tr></table>',
    );
    const [table] = await htmlCodec.listTables!(bytes, 'p.html');
    expect(table!.columns).toEqual(['Sales', 'column2', 'column3']);
    const parsed = await htmlCodec.parse(bytes, 'p.html', 1);
    // The row is wider than the header: the table widens with column4.
    expect(parsed.columns).toEqual(['Sales', 'column2', 'column3', 'column4']);
    expect(parsed.rows).toEqual([{ Sales: '1', column2: '2', column3: '3', column4: '4' }]);
  });

  test('a nested table is its own candidate and text in scripts is ignored', async () => {
    const bytes = html(
      '<script>document.write("<table><tr><td>x</td></tr></table>")</script>' +
        '<table id="outer"><tr><th>k</th></tr><tr><td><table><caption>Inner</caption><tr><th>v</th></tr><tr><td>1</td></tr></table></td></tr></table>',
    );
    const tables = await htmlCodec.listTables!(bytes, 'p.html');
    expect(tables.map((t) => [t.name, t.location])).toEqual([
      ['outer', 'table 1 of 2'],
      ['Inner', 'table 2 of 2'],
    ]);
    expect((await htmlCodec.parse(bytes, 'p.html', 2)).rows).toEqual([{ v: '1' }]);
  });
});
