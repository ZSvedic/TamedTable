// #WebUI
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadCsv } from '@tamedtable/core';
import type { FormatId } from '@tamedtable/file-io';
import type { ResolvedConfig } from '@tamedtable/model-config';
import { TamedTableWorld, SPEC_TC_DIR } from './world.ts';
import { webController as controller, webCtx as ctxOf } from './web-file-port.ts';
import { aiMadeColumns } from '../packages/web/src/controller-lazy.ts';

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

Given(
  'the provider {string} has API key {string}',
  async function (this: TamedTableWorld, provider: string, key: string) {
    const partial: Partial<ResolvedConfig> = { provider: provider as ModelProvider };
    // In record mode the request must reach the live API, so a real key from
    // the environment replaces the scenario's placeholder. The key travels in
    // a header, not the fingerprinted body, so replay still matches.
    const recording = process.env.TAMEDTABLE_CASSETTE === 'record';
    if (provider === 'gemini') partial.geminiKey = (recording && process.env.GEMINI_API_KEY) || key;
    else if (provider === 'openai') partial.openaiKey = (recording && process.env.OPENAI_API_KEY) || key;
    else partial.anthropicKey = (recording && process.env.ANTHROPIC_API_KEY) || key;
    await controller(this).setConfig(partial);
  },
);

When('user opens the settings panel', function (this: TamedTableWorld) {
  controller(this).openSettings();
});

When('user saves the API key {string}', function (this: TamedTableWorld, key: string) {
  controller(this).setApiKey(key);
});

Then('the configured API key is {string}', function (this: TamedTableWorld, key: string) {
  assert.equal(controller(this).getConfig().anthropicKey, key);
});

/** A key-only edit — the settings panel's key field, with the provider already
 *  selected. Unlike "the provider X has API key Y" this changes no model, so
 *  it exercises the key change on its own. */
When(
  'user saves the {string} API key {string}',
  async function (this: TamedTableWorld, provider: string, key: string) {
    const field = `${provider}Key` as 'geminiKey' | 'openaiKey' | 'anthropicKey' | 'openrouterKey';
    await controller(this).setConfig({ [field]: key });
  },
);

Then('the last model call carried the API key {string}', function (this: TamedTableWorld, key: string) {
  assert.equal(ctxOf(this).lastCallApiKey, key);
});

// ── Drag & drop onto the empty page ────────────────────────────────────────

When('user drops the file {string} onto the empty page', async function (this: TamedTableWorld, filename: string) {
  const bytes = new Uint8Array(await readFile(join(SPEC_TC_DIR, filename)));
  await controller(this).openDropped(filename, bytes);
});

When(
  'user drops a file named {string} containing {string} onto the empty page',
  async function (this: TamedTableWorld, filename: string, content: string) {
    await controller(this).openDropped(filename, new TextEncoder().encode(content));
  },
);

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
  else if (action === 'Open flow') pending = c.openFlow();
  else if (action === 'Save flow') pending = c.saveFlow();
  else if (action === 'Save data') pending = c.saveData();
  else if (action === 'Save as Flow') pending = c.saveFlow();
  else if (action === 'Save as Python') pending = c.savePython();
  else if (action.startsWith('Save as ')) {
    pending = c.saveDataAs(action.slice('Save as '.length).toLowerCase() as FormatId);
  } else throw new Error(`unknown web action: "${action}"`);
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
  const bytes = new Uint8Array(await readFile(join(SPEC_TC_DIR, filename)));
  await ctx.filePort!.resolveOpen({ name: filename, bytes });
  await settleUnlessPaused(this);
});

/** Await the dialog action started by `user says`, unless the run parks on a
 *  modal only a later step can answer — a flow whose join needs its lookup
 *  file (#LookupJoin) waits there, so awaiting the run itself would deadlock. */
async function settleUnlessPaused(world: TamedTableWorld): Promise<void> {
  const ctx = ctxOf(world);
  if (!ctx.pending) return;
  let settled = false;
  const done = (): void => { settled = true; };
  void ctx.pending.then(done, done);
  while (!settled && !controller(world).lookupDialog) {
    await new Promise((r) => setTimeout(r, 1));
  }
}

When('user saves as {string}', async function (this: TamedTableWorld, filename: string) {
  const ctx = ctxOf(this);
  await ctx.filePort!.resolveSave(filename);
  await ctx.pending;
});

Then('the suggested save name ends with {string}', async function (this: TamedTableWorld, ext: string) {
  const port = ctxOf(this).filePort!;
  // saveData does async serialization before opening the dialog; wait for it.
  const start = Date.now();
  while (!port.saveCalled && Date.now() - start < 5_000) await new Promise((r) => setTimeout(r, 5));
  assert.ok(
    port.lastSaveSuggestedName?.endsWith(ext),
    `suggested save name "${port.lastSaveSuggestedName}" should end with "${ext}"`,
  );
});

Then('table displays the header and at least the first {int} rows', function (this: TamedTableWorld, n: number) {
  const c = controller(this);
  assert.ok(c.displaySpec().columns.length > 0, 'table has no header columns');
  assert.ok(c.displayRows().length >= n, `expected at least ${n} rows, got ${c.displayRows().length}`);
});

Then('the table has {int} rows', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).displayRows().length, n);
});

Then('{string} contains a mutate transformation', function (this: TamedTableWorld, filename: string) {
  const flow = readSavedFlow(this, filename);
  assert.ok(
    flow.spec.transformations.some((t) => t.kind === 'mutate'),
    'saved flow has no mutate transformation',
  );
});

Then('a single undo returns the table to {int} rows', async function (this: TamedTableWorld, n: number) {
  await controller(this).undo();
  assert.equal(controller(this).displayRows().length, n);
});

Then('the flow error dialog shows {string}', function (this: TamedTableWorld, needle: string) {
  const message = controller(this).errorDialog;
  assert.ok(message, 'expected the flow error dialog to be showing');
  assert.ok(message.includes(needle), `error dialog "${message}" should mention "${needle}"`);
});

When('user dismisses the flow error dialog', function (this: TamedTableWorld) {
  controller(this).dismissErrorDialog();
});

// ── Lookup tables a browser join needs (#LookupJoin) ───────────────────────

Then('the lookup dialog asks for {string}', async function (this: TamedTableWorld, name: string) {
  // The run is paused on the dialog, so the openFlow promise is still pending —
  // read the state, don't await it.
  assert.equal(controller(this).lookupDialog?.name, name);
});

Then('no lookup dialog is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).lookupDialog, null);
});

// A join emitted with `with: null` — the user named no file — raises the
// dialog with no filename to show.
Then('the lookup dialog asks for no particular file', function (this: TamedTableWorld) {
  const dialog = controller(this).lookupDialog;
  assert.ok(dialog, 'no lookup dialog is up');
  assert.equal(dialog.name, null);
});

When('user chooses the lookup file {string}', async function (this: TamedTableWorld, filename: string) {
  const ctx = ctxOf(this);
  const choosing = controller(this).chooseLookupFile();
  const bytes = new Uint8Array(await readFile(join(SPEC_TC_DIR, filename)));
  await ctx.filePort!.resolveOpen({ name: filename, bytes });
  await choosing;
  // The paused run resumes on the choice — let it finish before asserting.
  await ctx.pending;
});

When('user dismisses the lookup dialog', async function (this: TamedTableWorld) {
  controller(this).dismissLookupDialog();
  await ctxOf(this).pending;
});

Then('no flow error dialog is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).errorDialog, null);
});

// ── Recents ────────────────────────────────────────────────────────────────

Then(
  'the recents list has {string} tagged {string} first',
  function (this: TamedTableWorld, label: string, kind: string) {
    const first = controller(this).recents()[0];
    assert.ok(first, 'recents list is empty');
    assert.equal(first.label, label);
    assert.equal(first.kind, kind);
  },
);

When('user loads {int} fixture files locally', async function (this: TamedTableWorld, n: number) {
  // Cycle distinct fixture names so each load is a distinct recent entry.
  const fixtures = [
    'customers-input.csv',
    'filter-input.csv',
    'sort-input.csv',
    'dedupe-input.csv',
    'paginate-input.csv',
    'colsplit-fullname-input.csv',
  ];
  assert.ok(n <= fixtures.length, `at most ${fixtures.length} fixtures available`);
  const c = controller(this);
  const ctx = ctxOf(this);
  for (const filename of fixtures.slice(0, n)) {
    const pending = c.openCsv();
    const bytes = new Uint8Array(await readFile(join(SPEC_TC_DIR, filename)));
    await ctx.filePort!.resolveOpen({ name: filename, bytes });
    await pending;
  }
});

Then('the recents list has {int} entries', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).recents().length, n);
});

Then('the file is delivered as a download', function (this: TamedTableWorld) {
  const outcomes = ctxOf(this).filePort?.outcomes ?? [];
  const last = outcomes[outcomes.length - 1];
  assert.ok(last && last.status === 'downloaded', `expected a download, got ${last?.status ?? 'nothing'}`);
});

// ── Chat thread ────────────────────────────────────────────────────────────

Then('the chat shows a user message {string}', function (this: TamedTableWorld, text: string) {
  const messages = controller(this).messages;
  assert.ok(
    messages.some((m) => m.role === 'user' && m.text === text),
    `no user message "${text}". Messages: ${messages.map((m) => `${m.role}: ${m.text}`).join(' | ') || '(none)'}`,
  );
});

Then('the chat has {int} message(s)', function (this: TamedTableWorld, n: number) {
  const messages = controller(this).messages;
  assert.equal(
    messages.length,
    n,
    `expected ${n} chat message(s), got ${messages.length}: ${messages.map((m) => `${m.role}: ${m.text}`).join(' | ') || '(none)'}`,
  );
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

Then('the table columns are {string}', function (this: TamedTableWorld, list: string) {
  const ids = controller(this).displaySpec().columns.map((c) => c.id);
  assert.deepEqual(ids, list.split(',').map((s) => s.trim()));
});

Then('the spec has {int} transformation(s)', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).displaySpec().transformations.length, n);
});

// ── History timeline ───────────────────────────────────────────────────────

When('user redoes the last change', async function (this: TamedTableWorld) {
  await controller(this).redo();
});

When('user jumps to history entry {int}', async function (this: TamedTableWorld, index: number) {
  await controller(this).jumpToHistory(index);
});

Then('the history timeline shows {int} entry/entries', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).historyTimeline().steps.length, n);
});

Then('the history cursor is at entry {int}', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).historyTimeline().cursor, n);
});

Then('history entry {int} is labelled {string}', function (this: TamedTableWorld, i: number, label: string) {
  assert.equal(controller(this).historyTimeline().steps[i]?.label, label);
});

// ── Pagination ─────────────────────────────────────────────────────────────

When('user goes to page {int}', async function (this: TamedTableWorld, page: number) {
  // Opening a page evaluates its lagging rows (#LazyExec) — await that.
  await controller(this).goToPage(page);
});

Then('the table spans {int} page(s)', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).pageCount(), n);
});

Then('the current page is {int}', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).currentPage(), n);
});

Then('the current page shows {int} row(s)', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).pageRows().length, n);
});

Then(
  'the first row on the current page has ID {string}',
  function (this: TamedTableWorld, id: string) {
    assert.equal(controller(this).pageRows()[0]?.ID, id);
  },
);

// ── Cell selection ─────────────────────────────────────────────────────────

When(
  'user selects the cell at row {int} column {string}',
  function (this: TamedTableWorld, row: number, column: string) {
    controller(this).selectCell(row - 1, column);
  },
);

Then(
  'the selected cell is row {int} column {string}',
  function (this: TamedTableWorld, row: number, column: string) {
    assert.deepEqual(controller(this).selection, { row: row - 1, column });
  },
);

Then('no cell is selected', function (this: TamedTableWorld) {
  assert.equal(controller(this).selection, null);
});

// ── Model picker ───────────────────────────────────────────────────────────

Then('the configured model is {string}', function (this: TamedTableWorld, model: string) {
  assert.equal(controller(this).getSettings().model, model);
});

Then('the configured cellModel is {string}', function (this: TamedTableWorld, cellModel: string) {
  assert.equal(controller(this).getSettings().cellModel, cellModel);
});

// ── URL load ───────────────────────────────────────────────────────────────

When('user opens the URL dialog', function (this: TamedTableWorld) {
  controller(this).openUrlDialog();
});

When('user closes the URL dialog', function (this: TamedTableWorld) {
  controller(this).closeUrlDialog();
});

Given('the URL dialog is already open', function (this: TamedTableWorld) {
  controller(this).openUrlDialog();
});

Then('the URL dialog is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).urlDialogOpen, true);
});

Then('the URL dialog is hidden', function (this: TamedTableWorld) {
  assert.equal(controller(this).urlDialogOpen, false);
});

// ── Sample picker ────────────────────────────────────────────────────────────

When('user opens the sample picker', function (this: TamedTableWorld) {
  controller(this).openSampleDialog();
});

When('user closes the sample picker', function (this: TamedTableWorld) {
  controller(this).closeSampleDialog();
});

Given('the sample picker is already open', function (this: TamedTableWorld) {
  controller(this).openSampleDialog();
});

Then('the sample picker is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).sampleDialogOpen, true);
});

Then('the sample picker is hidden', function (this: TamedTableWorld) {
  assert.equal(controller(this).sampleDialogOpen, false);
});

Given(
  'the URL {string} serves {string}',
  async function (this: TamedTableWorld, url: string, fixture: string) {
    const body = await readFile(join(SPEC_TC_DIR, fixture), 'utf8');
    ctxOf(this).urlFixtures.set(url, body);
  },
);

When('user loads from URL {string}', async function (this: TamedTableWorld, url: string) {
  await controller(this).loadFromUrl(url);
});

When('user tries to load URL {string}', async function (this: TamedTableWorld, url: string) {
  try {
    await controller(this).loadFromUrl(url);
    ctxOf(this).lastUrlError = undefined;
  } catch (e) {
    ctxOf(this).lastUrlError = e as Error;
  }
});

Then('loading fails with {string}', function (this: TamedTableWorld, needle: string) {
  const err = ctxOf(this).lastUrlError;
  assert.ok(err, 'expected loadFromUrl to throw, but it succeeded');
  assert.ok(
    err.message.includes(needle),
    `expected error to contain "${needle}", got: ${err.message}`,
  );
});

// ── Settings panel accordion cards ─────────────────────────────────────────

import { ALL_MODELS, type Provider as ModelProvider } from '@tamedtable/model-config';

Then('the settings panel shows {int} provider cards', function (this: TamedTableWorld, n: number) {
  // The four providers are always shown: gemini, openai, anthropic, openrouter
  const providers: ModelProvider[] = ['gemini', 'openai', 'anthropic', 'openrouter'];
  assert.equal(n, providers.length, `expected ${providers.length} provider cards, got ${n}`);
  // Verify the catalogue backs every card
  for (const p of providers) {
    const models = ALL_MODELS.filter((m) => m.provider === p);
    assert.ok(models.length > 0, `No models for provider "${p}" in ALL_MODELS`);
  }
});

Then('no provider card is expanded', function (this: TamedTableWorld) {
  const expanded = controller(this).expandedProvider;
  assert.equal(expanded, null, `expected no card expanded, got "${expanded}"`);
});

When('user clicks the provider card {string}', async function (this: TamedTableWorld, provider: string) {
  await controller(this).clickProviderCard(provider as ModelProvider);
});

Then('the provider card {string} is expanded', function (this: TamedTableWorld, provider: string) {
  const expanded = controller(this).expandedProvider;
  assert.equal(expanded, provider, `expected "${provider}" to be expanded, got "${expanded}"`);
});

Then('the provider card {string} is collapsed', function (this: TamedTableWorld, provider: string) {
  const expanded = controller(this).expandedProvider;
  assert.notEqual(expanded, provider, `expected "${provider}" to be collapsed, but it is expanded`);
});

When('user closes the settings panel', function (this: TamedTableWorld) {
  controller(this).closeSettings();
});

Then('no provider card shows a Saved badge', function (this: TamedTableWorld) {
  const saved = controller(this).savedProvider;
  assert.equal(saved, null, `expected no Saved badge, but "${saved}" shows one`);
});

Then('the provider card {string} shows the Saved badge', function (this: TamedTableWorld, provider: string) {
  const saved = controller(this).savedProvider;
  assert.equal(saved, provider, `expected the Saved badge on "${provider}", got "${saved}"`);
});

Then('the Saved badge has restarted {int} times', function (this: TamedTableWorld, n: number) {
  const seq = controller(this).savedSeq;
  assert.equal(seq, n, `expected the badge to have restarted ${n} times, got ${seq}`);
});

Then('the configured provider is {string}', function (this: TamedTableWorld, provider: string) {
  assert.equal(controller(this).getConfig().provider, provider);
});

Then('the expanded card body shows env hint {string}', function (this: TamedTableWorld, envVar: string) {
  const expanded = controller(this).expandedProvider;
  assert.ok(expanded, 'no provider card is expanded');
  const expectedHint: Record<string, string> = {
    gemini: 'GEMINI_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
  };
  assert.equal(
    expectedHint[expanded],
    envVar,
    `expected env hint "${envVar}" for provider "${expanded}", got "${expectedHint[expanded]}"`,
  );
});

Then(
  'the model list contains {string} with voice tag {word}',
  function (this: TamedTableWorld, modelId: string, voiceTag: string) {
    const expanded = controller(this).expandedProvider;
    assert.ok(expanded, 'no provider card is expanded');
    const model = ALL_MODELS.find((m) => m.id === modelId && m.provider === expanded);
    assert.ok(model, `Model "${modelId}" not found for provider "${expanded}"`);
    const expectedVoice = voiceTag === 'true';
    assert.equal(
      model.voiceInput,
      expectedVoice,
      `expected model "${modelId}" voiceInput=${expectedVoice}, got ${model.voiceInput}`,
    );
  },
);

When('user selects the provider {string}', async function (this: TamedTableWorld, provider: string) {
  // Simulate the user clicking the provider card in the settings panel —
  // both sets the provider and remembers which card was expanded.
  await controller(this).clickProviderCard(provider as ModelProvider);
});

// ── Provider API error simulation ──────────────────────────────────────────

Given('the selected model is {string}', async function (this: TamedTableWorld, modelId: string) {
  await controller(this).setConfig({ model: modelId });
});

Given('the gemini key is set to {string}', async function (this: TamedTableWorld, key: string) {
  await controller(this).setConfig({ geminiKey: key });
});

Given('the openai key is set to {string}', async function (this: TamedTableWorld, key: string) {
  await controller(this).setConfig({ openaiKey: key });
});

Given('the LLM API returns a 429 rate-limit error', function (this: TamedTableWorld) {
  ctxOf(this).mockLlmFetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: 'Resource has been exhausted (e.g. check quota).',
            status: 'RESOURCE_EXHAUSTED',
          },
        }),
        // retry-after: 0 — the SDK honors it, so its retry budget drains in
        // milliseconds instead of minutes of exponential backoff.
        { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '0' } },
      ),
    );
});

Given('the LLM API returns an unrecognized error', function (this: TamedTableWorld) {
  // A non-retryable 400 whose message matches no known pattern — the app-error
  // (reportable) classification's fall-through case.
  ctxOf(this).mockLlmFetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          error: {
            code: 400,
            message: 'The flux capacitor overheated while inlining.',
            status: 'INTERNAL',
          },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    );
});

Given('the LLM API returns a 401 unauthorized error', function (this: TamedTableWorld) {
  ctxOf(this).mockLlmFetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          error: {
            code: 401,
            message: 'API key not valid. Please pass a valid API key.',
            status: 'UNAUTHENTICATED',
          },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );
});

// ── Lazy AI execution (#LazyExec) ────────────────────────────────────────────

/** Poll until `cond` returns truthy (dialogs appear asynchronously while a
 *  request or run is in flight). */
async function waitFor(cond: () => boolean, ms = 30_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > deadline) throw new Error('waitFor: condition not met in time');
    await new Promise((r) => setTimeout(r, 10));
  }
}

Then('the evaluated-rows readout shows {string}', function (this: TamedTableWorld, expected: string) {
  const r = controller(this).evaluatedReadout();
  assert.ok(r, 'expected the evaluated-rows readout to be visible');
  assert.equal(`${r.done} of ${r.total} rows evaluated`, expected);
});

Then('no evaluated-rows readout is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).evaluatedReadout(), null);
});

Then('the pager marks the pages with pending rows', function (this: TamedTableWorld) {
  const pages = controller(this).pendingPages();
  assert.ok(pages.length > 0, 'expected at least one pending page mark');
  assert.ok(!pages.includes(1), 'the evaluated first page must not be marked');
});

Then('no pager button carries a pending mark', function (this: TamedTableWorld) {
  assert.deepEqual(controller(this).pendingPages(), []);
});

Then('no large-file dialog is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).largeFileDialog, null);
});

Then('no estimate dialog is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).runAllDialog, null);
});

// ── Failures + retry ─────────────────────────────────────────────────────────

Given('the LLM API fails for rows {string}', function (this: TamedTableWorld, markers: string) {
  // Fail any model call whose body mentions one of the marked rows; every
  // other call passes through to the cassette recorder (or the live API).
  const marks = markers.split(',').map((s) => s.trim()).filter(Boolean);
  const inner = this.runnerOpts?.fetch;
  ctxOf(this).mockLlmFetch = (input, init) => {
    const body = typeof init?.body === 'string' ? init.body : '';
    if (marks.some((m) => body.includes(m))) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: 400, message: 'Injected cell failure', status: 'INVALID_ARGUMENT' } }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
      );
    }
    if (inner) return Promise.resolve(inner(input, init));
    return fetch(input as Parameters<typeof fetch>[0], init);
  };
});

Given('the LLM API recovers', function (this: TamedTableWorld) {
  ctxOf(this).mockLlmFetch = undefined;
});

Then('exactly {int} rows on the current page are marked failed', function (this: TamedTableWorld, n: number) {
  const failed = controller(this).pageRowStatus().filter((s) => s === 'failed');
  assert.equal(failed.length, n);
});

Then('the readout offers to retry {int} failed row(s)', function (this: TamedTableWorld, n: number) {
  const r = controller(this).evaluatedReadout();
  assert.ok(r, 'expected the evaluated-rows readout to be visible');
  assert.equal(r.failed, n);
});

When('user retries the failed rows', async function (this: TamedTableWorld) {
  await controller(this).retryFailedRows();
});

Then('no row is marked failed', function (this: TamedTableWorld) {
  assert.equal(controller(this).evaluatedReadout()?.failed ?? 0, 0);
});

// ── Run on all rows + the estimate dialog ────────────────────────────────────

When('user starts running on all rows', function (this: TamedTableWorld) {
  const pending = controller(this).runOnAllRows();
  pending.catch(() => {});
  ctxOf(this).pending = pending;
});

When('user runs on all rows', async function (this: TamedTableWorld) {
  await controller(this).runOnAllRows();
});

Then(
  'the estimate dialog shows the rows remaining, estimated tokens, cost, and time',
  async function (this: TamedTableWorld) {
    const c = controller(this);
    await waitFor(() => c.runAllDialog !== null);
    const e = c.runAllDialog!.estimate;
    assert.ok(e.rowsRemaining > 0, 'rowsRemaining must be positive');
    assert.ok(e.estTokens > 0, 'estTokens must be positive');
    assert.ok(e.estUsd > 0, 'estUsd must be positive');
    assert.ok(e.estSeconds > 0, 'estSeconds must be positive');
  },
);

When('user confirms the run', async function (this: TamedTableWorld) {
  controller(this).confirmRunAll();
  await ctxOf(this).pending;
});

When('user confirms the run and cancels after the first chunk', async function (this: TamedTableWorld) {
  const c = controller(this);
  // Cancel synchronously inside the first chunk's notify — deterministic in
  // record and replay: the first wave is already computed (and cached), the
  // next wave's abort check stops the run.
  let cancelled = false;
  const unsubscribe = c.subscribe(() => {
    if (!cancelled && c.runProgress && c.runProgress.rowsDone >= 1) {
      cancelled = true;
      c.cancelRunAll();
    }
  });
  try {
    c.confirmRunAll();
    await ctxOf(this).pending;
  } finally {
    unsubscribe();
  }
  assert.ok(cancelled, 'expected the run to have streamed at least one chunk');
});

// ── The dependency rule ──────────────────────────────────────────────────────

When('query {string} without waiting', function (this: TamedTableWorld, text: string) {
  const pending = controller(this).request(text);
  pending.catch(() => {});
  ctxOf(this).pending = pending;
});

Then('the run-all confirmation is shown', async function (this: TamedTableWorld) {
  const c = controller(this);
  await waitFor(() => c.runAllDialog !== null);
  assert.ok(c.runAllDialog);
});

When('user declines the run-all confirmation', async function (this: TamedTableWorld) {
  controller(this).declineRunAll();
  await ctxOf(this).pending;
});

Then('the spec contains no filter transformation', function (this: TamedTableWorld) {
  const kinds = controller(this).currentSpec().transformations.map((t) => (t as { kind: string }).kind);
  assert.ok(!kinds.includes('filter'), `expected no filter step, got [${kinds.join(', ')}]`);
});

Then('no history entry was added for the declined step', function (this: TamedTableWorld) {
  assert.equal(controller(this).history().length, 1);
});

// ── Undo / redo row state ────────────────────────────────────────────────────

When('user redoes the last change without any model call', async function (this: TamedTableWorld) {
  const c = controller(this);
  const before = c.cellCallCount();
  await c.redo();
  assert.equal(c.cellCallCount(), before, 'redo must be served from the cell cache');
});

// ── The large-file dialog + the shuffled view ────────────────────────────────

Then(
  'the large-file dialog offers {string} and {string}',
  function (this: TamedTableWorld, _primary: string, _secondary: string) {
    const d = controller(this).largeFileDialog;
    assert.ok(d, 'expected the large-file dialog to be showing');
    assert.ok(d.rowCount > 0);
  },
);

When('(user )load(s) the shuffled sample', async function (this: TamedTableWorld) {
  await controller(this).loadShuffled();
});

// Imperative `load …` (a `load "<file>"` resolution) and narrative `user
// loads …` describe the same dialog click; one step def matches both.
When('(user )load(s) the file in original order', async function (this: TamedTableWorld) {
  await controller(this).loadOriginalOrder();
});

Then('the Row # column keeps the original row numbers', function (this: TamedTableWorld) {
  const c = controller(this);
  const nums = c.pageRowNumbers();
  const rows = c.pageRows();
  assert.ok(nums.length > 0);
  assert.ok(!nums.every((n, i) => n === i + 1), 'expected a shuffled view, got sequential row numbers');
  // Each displayed row really is the derived row its number claims.
  const derived = c.displayRows();
  nums.forEach((n, i) => assert.deepEqual(rows[i], derived[n - 1]));
});

When(
  'user sorts column {string} descending from the column menu',
  async function (this: TamedTableWorld, column: string) {
    await controller(this).setViewSort(column, 'desc');
  },
);

Then('the view is sorted by {string} descending', function (this: TamedTableWorld, column: string) {
  const values = controller(this).pageRows().map((r) => Number(r[column]));
  for (let i = 1; i < values.length; i++) {
    assert.ok(values[i - 1]! >= values[i]!, `row ${i} breaks the descending order`);
  }
});

Then('the saved file keeps the original row order', function (this: TamedTableWorld) {
  const port = ctxOf(this).filePort!;
  const saved = [...port.saved.values()].at(-1);
  assert.ok(saved, 'expected a saved file');
  const lines = saved.split('\n');
  // The source is ordered P00001, P00002, … — the shuffled view must not
  // leak into the file.
  assert.ok(lines[1]!.startsWith('P00001,'), `expected P00001 first, got ${lines[1]}`);
  assert.ok(lines[2]!.startsWith('P00002,'), `expected P00002 second, got ${lines[2]}`);
});

Then('every row on the current page has a non-null {string}', function (this: TamedTableWorld, column: string) {
  const rows = controller(this).pageRows();
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.ok(row[column] !== null && row[column] !== undefined && row[column] !== '', 'expected a value');
  }
});

Given('the setting {string} is on', async function (this: TamedTableWorld, setting: string) {
  assert.equal(setting, 'Always run on all rows', `unknown setting "${setting}"`);
  await controller(this).setConfig({ alwaysRunAll: true });
});

When('(user )open(s) the run-on-all estimate dialog', function (this: TamedTableWorld) {
  // Shown, not executed: the estimate dialog opens and waits for a choice.
  const pending = controller(this).runOnAllRows();
  pending.catch(() => {});
  ctxOf(this).pending = pending;
});

When('(user )decline(s) the estimate with {string}', async function (this: TamedTableWorld, choice: string) {
  // The lazy tour's finale: close the estimate dialog with the "Not yet"
  // choice — nothing runs, no model call.
  assert.equal(choice, 'Not yet', `unknown estimate decline "${choice}"`);
  controller(this).declineRunAll();
  await ctxOf(this).pending;
});

// ── Column-menu gates: the evaluated-rows preview (#LazyExec) ────────────────

When(
  'user sorts column {string} descending from the column menu without waiting',
  function (this: TamedTableWorld, column: string) {
    const pending = controller(this).setViewSort(column, 'desc');
    pending.catch(() => {});
    ctxOf(this).pending = pending;
  },
);

When(
  'user sorts column {string} ascending from the column menu without waiting',
  function (this: TamedTableWorld, column: string) {
    const pending = controller(this).setViewSort(column, 'asc');
    pending.catch(() => {});
    ctxOf(this).pending = pending;
  },
);

When('user chooses to apply to evaluated rows only', async function (this: TamedTableWorld) {
  controller(this).applyEvaluatedOnly();
  await ctxOf(this).pending;
});

Then('the current page is sorted by {string} ascending', function (this: TamedTableWorld, column: string) {
  const values = controller(this).pageRows().map((r) => String(r[column] ?? ''));
  assert.ok(values.length > 0);
  for (const v of values) assert.ok(v !== '', 'expected only evaluated rows on the page');
  for (let i = 1; i < values.length; i++) {
    assert.ok(values[i - 1]! <= values[i]!, `row ${i} ("${values[i]}") breaks the ascending order after "${values[i - 1]}"`);
  }
});

Then(
  'the first page is sorted by {string} descending with no blanks',
  function (this: TamedTableWorld, column: string) {
    const values = controller(this).pageRows().map((r) => String(r[column] ?? ''));
    assert.ok(values.length > 0);
    for (const v of values) assert.ok(v !== '', 'expected only evaluated rows on the first page');
    for (let i = 1; i < values.length; i++) {
      assert.ok(values[i - 1]! >= values[i]!, `row ${i} breaks the descending order`);
    }
  },
);

// ── Honest progress + streaming pages (#LazyExec) ────────────────────────────

When(
  'user opens page {int} and sees the streaming banner while it evaluates',
  async function (this: TamedTableWorld, page: number) {
    const c = controller(this);
    let sawStreaming = false;
    const unsubscribe = c.subscribe(() => {
      if (c.streaming) sawStreaming = true;
    });
    try {
      await c.goToPage(page);
    } finally {
      unsubscribe();
    }
    assert.ok(sawStreaming, 'expected the streaming banner while the page evaluated');
  },
);

When('user confirms the run watching its progress', async function (this: TamedTableWorld) {
  const c = controller(this);
  const peak = { done: 0, total: 0 };
  const unsubscribe = c.subscribe(() => {
    if (c.runProgress) {
      peak.done = Math.max(peak.done, c.runProgress.rowsDone);
      peak.total = Math.max(peak.total, c.runProgress.rowsTotal);
    }
  });
  try {
    c.confirmRunAll();
    await ctxOf(this).pending;
  } finally {
    unsubscribe();
  }
  ctxOf(this).runPeak = peak;
});

Then(
  'the run-all progress peaked at {int} of {int} rows',
  function (this: TamedTableWorld, done: number, total: number) {
    const peak = ctxOf(this).runPeak;
    assert.ok(peak, 'no run was watched');
    assert.equal(peak.total, total);
    assert.equal(peak.done, done, `progress peaked at ${peak.done}, expected ${done}`);
  },
);

// ── The post-run save confirmation (#LazyExec) ───────────────────────────────

Then('the save-ready dialog is shown', async function (this: TamedTableWorld) {
  const c = controller(this);
  await waitFor(() => c.saveReadyDialog);
});

Then('no save dialog was opened yet', function (this: TamedTableWorld) {
  assert.ok(!ctxOf(this).filePort?.saveCalled, 'the save picker must wait for a fresh click');
});

When('user clicks Save file in the save-ready dialog', function (this: TamedTableWorld) {
  const pending = controller(this).confirmSaveReady();
  pending.catch(() => {});
  ctxOf(this).pending = pending;
});

Then('the newly evaluated cells carry the changed marker', function (this: TamedTableWorld) {
  const c = controller(this);
  const marked = Object.keys(c.pageChangedCells()).length;
  const rows = c.pageRows().length;
  assert.ok(marked >= rows, `expected ≥${rows} changed-cell marks on the page, got ${marked}`);
});

Then('no cells are marked changed', function (this: TamedTableWorld) {
  const marked = Object.keys(controller(this).pageChangedCells());
  assert.equal(marked.length, 0, `unexpected changed-cell marks: ${marked.join(', ')}`);
});

// Column-scoped marker check — a structurally written column (a validate's
// flag pair, a {js}/{sql} mutate target) tints every filled cell, AI or not.
Then('every cell in column {string} carries the changed marker', function (this: TamedTableWorld, column: string) {
  const c = controller(this);
  const changed = c.pageChangedCells();
  const rows = c.pageRows().length;
  const start = (c.currentPage() - 1) * c.pageSize;
  let unmarked = 0;
  for (let p = 0; p < rows; p++) {
    if (!(`${start + p}:${column}` in changed)) unmarked++;
  }
  assert.equal(unmarked, 0, `${unmarked} cell(s) in "${column}" on the page lack the changed marker`);
});

// ── The reveal scroll (behavior.md § Grid upgrades) ──────────────────────────

Then('the table reveals the {string} column', function (this: TamedTableWorld, column: string) {
  const target = controller(this).revealTarget();
  assert.ok(target, 'no reveal target is set');
  assert.equal(target.column, column);
});

Then('no column is revealed', function (this: TamedTableWorld) {
  const target = controller(this).revealTarget();
  assert.equal(target, null, `unexpected reveal target: ${target?.column}`);
});

// ── The tab guard (#LazyExec — behavior.md § Web UI) ─────────────────────────

Then('leaving the page needs no confirmation', function (this: TamedTableWorld) {
  assert.equal(controller(this).hasUnsavedWork(), false);
});

Then('leaving the page asks for confirmation', function (this: TamedTableWorld) {
  assert.equal(controller(this).hasUnsavedWork(), true);
});

Then(
  'every evaluated cell on the current page carries the changed marker',
  function (this: TamedTableWorld) {
    const c = controller(this);
    const changed = c.pageChangedCells();
    const status = c.pageRowStatus();
    const rows = c.pageRows();
    const aiCols = [...aiMadeColumns(c.displaySpec())];
    const start = (c.currentPage() - 1) * c.pageSize;
    let unmarked = 0;
    for (let p = 0; p < rows.length; p++) {
      if (status[p] !== undefined) continue; // pending/failed — shows no value
      for (const col of aiCols) {
        if (!(`${start + p}:${col}` in changed)) unmarked++;
      }
    }
    assert.equal(unmarked, 0, `${unmarked} filled AI cell(s) on the page lack the changed marker`);
  },
);
