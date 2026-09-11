// #TablePick
// Step defs for open-tables.feature: opening a workbook or a web page through
// the shared Runner (headless, CLI, web) and, on @web, the table picker. The
// picker steps go through WebController's public surface only.
import { When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { cellAt } from '@tamedtable/core';
import { parseTable, splitTableSelector } from '@tamedtable/file-io';
import { TamedTableWorld, fixturePath } from './world.ts';
import { webController, webCtx } from './web-file-port.ts';

const loadErrors = new WeakMap<TamedTableWorld, Error>();

When('loading {string} is attempted', async function (this: TamedTableWorld, filename: string) {
  try {
    if (this.surface === 'web') {
      const { source, table } = splitTableSelector(filename);
      const bytes = new Uint8Array(await readFile(fixturePath(source)));
      await webController(this).loadFromBytes(basename(source), bytes, table);
    } else {
      await this.ensureRunner().loadInput(fixturePath(filename));
    }
  } catch (e) {
    loadErrors.set(this, e as Error);
  }
});

Then('the load fails mentioning {string}', function (this: TamedTableWorld, fragment: string) {
  const err = loadErrors.get(this);
  assert.ok(err, 'expected the load to fail, but it succeeded');
  assert.ok(err.message.includes(fragment), `expected "${err.message}" to mention "${fragment}"`);
});

function cell(world: TamedTableWorld, column: string, row: number): unknown {
  const rows = world.ensureRunner().currentRows();
  assert.ok(rows[row - 1], `row ${row} does not exist (${rows.length} rows)`);
  return cellAt(rows[row - 1]!, column);
}

Then('cell {string} of row {int} is {string}', function (this: TamedTableWorld, column: string, row: number, expected: string) {
  assert.deepEqual(cell(this, column, row), expected);
});

Then('cell {string} of row {int} is the number {float}', function (this: TamedTableWorld, column: string, row: number, expected: number) {
  assert.deepEqual(cell(this, column, row), expected);
});

// ── The web app's table picker ───────────────────────────────────────────────

Then('the table picker lists {string}', function (this: TamedTableWorld, names: string) {
  const dialog = webController(this).tablePickerDialog;
  assert.ok(dialog, 'expected the table picker to be showing');
  assert.deepEqual(dialog.candidates.map((c) => c.name), names.split(',').map((s) => s.trim()));
});

Then('the table picker is for {string}', function (this: TamedTableWorld, name: string) {
  assert.equal(webController(this).tablePickerDialog?.name, name);
});

Then('no table picker is shown', function (this: TamedTableWorld) {
  assert.equal(webController(this).tablePickerDialog, null);
});

When('user picks the table {string}', async function (this: TamedTableWorld, name: string) {
  const dialog = webController(this).tablePickerDialog;
  assert.ok(dialog, 'expected the table picker to be showing');
  const candidate = dialog.candidates.find((c) => c.name === name);
  assert.ok(candidate, `no candidate named "${name}": ${dialog.candidates.map((c) => c.name).join(', ')}`);
  await webController(this).pickTable(candidate.index);
});

When('user cancels the table picker', function (this: TamedTableWorld) {
  webController(this).dismissTablePicker();
});

Then('the chat shows an assistant message {string}', function (this: TamedTableWorld, text: string) {
  const messages = webController(this).messages;
  assert.ok(
    messages.some((m) => m.role === 'assistant' && m.text === text),
    `no assistant message "${text}". Messages: ${messages.map((m) => `${m.role}: ${m.text}`).join(' | ') || '(none)'}`,
  );
});

/** The bytes the stub Save dialog captured, parsed back through file-io: a
 *  workbook the app wrote lists one table and reloads without a pick. */
Then('the saved {string} reloads as one table with {int} rows', async function (this: TamedTableWorld, name: string, n: number) {
  const bytes = webCtx(this).filePort?.savedBytes.get(name);
  assert.ok(bytes, `nothing saved as ${name}`);
  const { rows } = await parseTable(name, bytes);
  assert.equal(rows.length, n);
});
