import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadCsv } from '@tamedtable/core';
import type { WebController } from '@tamedtable/web';
import { TamedTableWorld, SPEC_TC_DIR } from './world.ts';
import { webScenarios, type WebScenarioCtx } from './web-file-port.ts';

function controller(world: TamedTableWorld): WebController {
  return world.ensureRunner() as unknown as WebController;
}

function ctxOf(world: TamedTableWorld): WebScenarioCtx {
  const ctx = webScenarios.get(world);
  if (!ctx) throw new Error('web scenario context missing — is the @web Before hook wired?');
  return ctx;
}

interface SavedFlow {
  version: number;
  source: string;
  spec: { transformations: Array<{ kind: string }> };
}

function readSavedFlow(world: TamedTableWorld, filename: string): SavedFlow {
  const content = ctxOf(world).filePort?.saved.get(filename);
  assert.ok(content, `"${filename}" was not saved`);
  const flow = JSON.parse(content) as SavedFlow;
  assert.equal(flow.version, 2, 'saved flow is not version 2');
  return flow;
}

// ── Web app + settings panel ───────────────────────────────────────────────

Given('the TamedTable web app', function (this: TamedTableWorld) {
  // Marker: the @web Before hook has bound the controller factory. The
  // controller itself is built lazily on first use.
});

Given('the TamedTable web app without File System Access support', function (this: TamedTableWorld) {
  ctxOf(this).noFsa = true;
});

Given('the API key has not been set', function (this: TamedTableWorld) {
  controller(this).clearApiKey();
});

When('user opens the settings panel', function (this: TamedTableWorld) {
  controller(this).openSettings();
});

When('user saves the API key {string}', function (this: TamedTableWorld, key: string) {
  controller(this).setApiKey(key);
});

Then('the configured API key is {string}', function (this: TamedTableWorld, key: string) {
  assert.equal(controller(this).getSettings().apiKey, key);
});

// ── Chat ───────────────────────────────────────────────────────────────────

When('user sends the chat message {string}', async function (this: TamedTableWorld, text: string) {
  await controller(this).sendChat(text);
});

// ── File dialogs ───────────────────────────────────────────────────────────

When('user says {string}', function (this: TamedTableWorld, action: string) {
  const c = controller(this);
  const ctx = ctxOf(this);
  let pending: Promise<unknown>;
  if (action === 'Load CSV file') pending = c.openCsv();
  else if (action === 'Save flow') pending = c.saveFlow();
  else if (action === 'Save data') pending = c.saveData();
  else throw new Error(`unknown web action: "${action}"`);
  pending.catch(() => {});
  ctx.pending = pending;
});

Then('display Open File dialog', function (this: TamedTableWorld) {
  assert.equal(controller(this).dialog, 'open', 'expected the Open File dialog to be showing');
  assert.ok(ctxOf(this).filePort?.openCalled, 'file port pickOpen was not called');
});

Then('display Save File dialog', function (this: TamedTableWorld) {
  const dialog = controller(this).dialog;
  assert.ok(dialog === 'save-flow' || dialog === 'save-data', `expected a Save dialog, got ${dialog}`);
  assert.ok(ctxOf(this).filePort?.saveCalled, 'file port pickSave was not called');
});

When('user selects {string}', async function (this: TamedTableWorld, filename: string) {
  const ctx = ctxOf(this);
  const text = await readFile(join(SPEC_TC_DIR, filename), 'utf8');
  await ctx.filePort!.resolveOpen({ name: filename, text });
  await ctx.pending;
});

When('user saves as {string}', async function (this: TamedTableWorld, filename: string) {
  const ctx = ctxOf(this);
  await ctx.filePort!.resolveSave(filename);
  await ctx.pending;
});

Then('table displays the header and at least the first {int} rows', function (this: TamedTableWorld, n: number) {
  const c = controller(this);
  assert.ok(c.displaySpec().columns.length > 0, 'table has no header columns');
  assert.ok(c.displayRows().length >= n, `expected at least ${n} rows, got ${c.displayRows().length}`);
});

Then('the table has {int} rows', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).displayRows().length, n);
});

Then('{string} contains normalization steps', function (this: TamedTableWorld, filename: string) {
  const flow = readSavedFlow(this, filename);
  assert.ok(flow.spec.transformations.length > 0, 'saved flow has no transformations');
});

Then('{string} contains a mutate transformation', function (this: TamedTableWorld, filename: string) {
  const flow = readSavedFlow(this, filename);
  assert.ok(
    flow.spec.transformations.some((t) => t.kind === 'mutate'),
    'saved flow has no mutate transformation',
  );
});

Then('the file is delivered as a download', function (this: TamedTableWorld) {
  const outcomes = ctxOf(this).filePort?.outcomes ?? [];
  const last = outcomes[outcomes.length - 1];
  assert.ok(last && last.status === 'downloaded', `expected a download, got ${last?.status ?? 'nothing'}`);
});

// ── Toasts ─────────────────────────────────────────────────────────────────

Then('a toast shows {string}', function (this: TamedTableWorld, needle: string) {
  const toasts = controller(this).toasts;
  assert.ok(
    toasts.some((t) => t.message.includes(needle)),
    `no toast contains "${needle}". Toasts: ${toasts.map((t) => t.message).join('; ') || '(none)'}`,
  );
});

Then('no toast is shown', function (this: TamedTableWorld) {
  const toasts = controller(this).toasts;
  assert.equal(toasts.length, 0, `unexpected toast(s): ${toasts.map((t) => t.message).join('; ')}`);
});

// ── Browser gestures ───────────────────────────────────────────────────────

When(
  'user edits cell at row {int} column {string} to {string}',
  async function (this: TamedTableWorld, row: number, column: string, value: string) {
    await controller(this).editCell(row - 1, column, value);
  },
);

Then(
  'cell at row {int} column {string} shows {string}',
  function (this: TamedTableWorld, row: number, column: string, value: string) {
    assert.equal(controller(this).displayRows()[row - 1]?.[column], value);
  },
);

Then(
  'cell at row {int} column {string} shows the original value',
  async function (this: TamedTableWorld, row: number, column: string) {
    const { rows } = await loadCsv(this.inputPath!);
    assert.equal(controller(this).displayRows()[row - 1]?.[column], rows[row - 1]?.[column]);
  },
);

When('user undoes the last change', async function (this: TamedTableWorld) {
  await controller(this).undo();
});

When('user reorders columns so {string} comes first', async function (this: TamedTableWorld, column: string) {
  await controller(this).reorderColumns([column]);
});

Then('the first column is {string}', function (this: TamedTableWorld, column: string) {
  assert.equal(controller(this).displaySpec().columns[0]?.id, column);
});

Then('the spec has {int} transformation(s)', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).displaySpec().transformations.length, n);
});
