// #NestedCells: a guard test.
//
// Two packages own the same rule for writing a cell as text: `cellDisplay` in
// @tamedtable/table-plan (app code: prompts, filters, sort keys, CSV cells)
// and `cellText` in @tamedtable/table-view (the grid, the editor, the copy).
// The grid package depends on no TamedTable package but ui-kit, so it keeps
// its own copy; this test fails the moment the two answer differently, before
// the app and the grid can disagree about what a cell says.
import { describe, it, expect } from 'bun:test';
// `core` re-exports the whole table-plan surface; the suite depends on core,
// not on the base package directly.
import { cellDisplay } from '@tamedtable/core';
import { cellText } from '@tamedtable/table-view';

const cyclic: Record<string, unknown> = { name: 'loop' };
cyclic.self = cyclic;

const CASES: Array<[label: string, value: unknown]> = [
  ['a list of objects', [{ from: 'human', value: 'Knock knock.' }, { from: 'gpt', value: 'Who is there?' }]],
  ['an empty list', []],
  ['an object', { a: 1, b: [2, 3] }],
  ['a nested null', { a: null }],
  ['a string', 'plain'],
  ['a string that looks like JSON', '[{"a":1}]'],
  ['a number', 42],
  ['a zero', 0],
  ['a boolean', false],
  ['null', null],
  ['undefined', undefined],
  ['a cyclic object', cyclic],
];

describe('cellDisplay and cellText answer the same', () => {
  for (const [label, value] of CASES) {
    it(label, () => {
      expect(cellText(value)).toBe(cellDisplay(value));
    });
  }

  it('writes a list of objects as JSON, never "[object Object]"', () => {
    const chat = [{ from: 'human', value: 'Knock knock.' }];
    expect(cellDisplay(chat)).toBe('[{"from":"human","value":"Knock knock."}]');
    expect(cellDisplay(chat)).not.toContain('[object Object]');
  });
});
