import { describe, it, expect } from 'bun:test';
import { createHeadlessRunner } from './index.ts';
import type { Row, TablePlan } from '@tamedtable/core';

// The path-free load seam (#IoFormats): the web parses a picked file through
// the file-io codec registry and hands the rows straight to loadParsed, so the
// browser never needs a filesystem.
describe('loadParsed — load already-parsed rows without a path', () => {
  const rows: Row[] = [
    { Name: 'Ada', Country: 'uk' },
    { Name: 'Grace', Country: 'usa' },
  ];
  const spec: TablePlan = {
    table: 'people.csv',
    columns: [{ id: 'Name' }, { id: 'Country' }],
    transformations: [],
  };

  it('loads the rows and the fresh-load plan', async () => {
    const runner = createHeadlessRunner({});
    await runner.loadParsed(rows, spec);
    expect(runner.currentRows()).toEqual(rows);
    expect(runner.currentSpec().columns.map((c) => c.id)).toEqual(['Name', 'Country']);
    expect(runner.currentSpec().table).toBe('people.csv');
  });

  it('replays transformations over the parsed source', async () => {
    const runner = createHeadlessRunner({});
    await runner.loadParsed(rows, spec);
    await runner.setSpec({
      ...spec,
      transformations: [{ kind: 'filter', pred: { js: "row.Country === 'usa'" } }],
    });
    expect(runner.currentRows()).toEqual([{ Name: 'Grace', Country: 'usa' }]);
  });
});

// A staged lookup lets a join resolve by name with no filesystem (browser).
describe('registerLookup — join against staged rows', () => {
  it('resolves join.with from the registry instead of reading a file', async () => {
    const runner = createHeadlessRunner({});
    await runner.loadParsed(
      [{ Name: 'Ada', Country: 'uk' }, { Name: 'Grace', Country: 'usa' }],
      { table: 'people.csv', columns: [{ id: 'Name' }, { id: 'Country' }], transformations: [] },
    );
    runner.registerLookup('codes.csv', [
      { Country: 'uk', ISO: 'GB' },
      { Country: 'usa', ISO: 'US' },
    ]);
    await runner.setSpec({
      table: 'people.csv',
      columns: [{ id: 'Name' }, { id: 'Country' }],
      transformations: [
        { kind: 'join', with: 'codes.csv', on: { js: 'leftRow.Country === rightRow.Country' } },
      ],
    });
    // The right table's Country collides with the left's, so it is kept as
    // Country_2; ISO is added. Proves the join read the staged lookup rows.
    const out = runner.currentRows();
    expect(out).toEqual([
      { Name: 'Ada', Country: 'uk', Country_2: 'uk', ISO: 'GB' },
      { Name: 'Grace', Country: 'usa', Country_2: 'usa', ISO: 'US' },
    ]);
  });
});
