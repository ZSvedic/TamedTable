// #NestedCells
// Step defs for nested.feature: a cell holding a JSON list or object. The
// structural steps go through the shared Runner interface, so one scenario
// runs on @headless, @cli, and @web; the view steps below are @web only and
// read the controller's public page rows.
import { Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { cellDisplay, type Row } from '@tamedtable/core';
import { TamedTableWorld } from './world.ts';
import { webController } from './web-file-port.ts';

function cellAtRow(world: TamedTableWorld, row: number, column: string): unknown {
  const r = world.ensureRunner().currentRows()[row - 1];
  assert.ok(r, `no row ${row} in the current table`);
  return r[column];
}

Then(
  'the cell at row {int} column {string} holds a list of {int} item(s)',
  function (this: TamedTableWorld, row: number, column: string, n: number) {
    const v = cellAtRow(this, row, column);
    assert.ok(Array.isArray(v), `expected a list in ${column}, got ${typeof v}: ${cellDisplay(v)}`);
    assert.equal(v.length, n);
  },
);

Then(
  'the cell at row {int} column {string} holds no list',
  function (this: TamedTableWorld, row: number, column: string) {
    const v = cellAtRow(this, row, column);
    assert.ok(!Array.isArray(v), `expected no list in ${column}, got ${cellDisplay(v)}`);
  },
);

Then(
  'the cell at row {int} column {string} holds the string {string}',
  function (this: TamedTableWorld, row: number, column: string, expected: string) {
    const v = cellAtRow(this, row, column);
    assert.equal(typeof v, 'string', `expected a string in ${column}, got ${typeof v}`);
    assert.equal(v, expected);
  },
);

Then(
  'the cell at row {int} column {string} displays {string}',
  function (this: TamedTableWorld, row: number, column: string, expected: string) {
    assert.equal(cellDisplay(cellAtRow(this, row, column)), expected);
  },
);

Then(
  'the cell at row {int} column {string} has the own key {string}',
  function (this: TamedTableWorld, row: number, column: string, key: string) {
    const v = cellAtRow(this, row, column);
    assert.ok(v !== null && typeof v === 'object', `expected an object in ${column}, got ${cellDisplay(v)}`);
    assert.ok(
      Object.hasOwn(v as object, key),
      `expected an own key "${key}" on the cell, got ${cellDisplay(v)}`,
    );
  },
);

Then('no row inherits a {string} key', function (this: TamedTableWorld, key: string) {
  const rows: Row[] = this.ensureRunner().currentRows();
  for (const [i, row] of rows.entries()) {
    for (const [column, value] of Object.entries(row)) {
      if (value === null || typeof value !== 'object') continue;
      assert.ok(
        !(key in (value as object)) || Object.hasOwn(value as object, key),
        `row ${i + 1} column "${column}" inherits "${key}" from its prototype`,
      );
    }
  }
});

// The reported symptom, pinned: no cell anywhere in the table may render as
// JavaScript's default object text.
Then('no cell displays {string}', function (this: TamedTableWorld, needle: string) {
  const rows: Row[] = this.ensureRunner().currentRows();
  for (const [i, row] of rows.entries()) {
    for (const [column, value] of Object.entries(row)) {
      const text = cellDisplay(value);
      assert.ok(!text.includes(needle), `row ${i + 1} column "${column}" displays "${text}"`);
    }
  }
});

Then(
  'the page rows are in descending {string} display order',
  function (this: TamedTableWorld, column: string) {
    const texts = webController(this).pageRows().map((r) => cellDisplay(r[column]));
    assert.ok(texts.length > 1, 'expected a page with rows to check');
    for (let i = 1; i < texts.length; i++) {
      assert.ok(
        texts[i - 1]! >= texts[i]!,
        `row ${i} breaks the descending order: "${texts[i - 1]}" then "${texts[i]}"`,
      );
    }
  },
);
