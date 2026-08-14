// Step defs for spec/test-cases/lazy-regressions.feature: the lazy AI
// execution regressions from the red inventory (#LazyExec). Self-contained:
// each scenario builds its own WebController through lazy-harness.util.ts
// (fake FilePort, scripted offline Gemini fetch); no worldParameters, no
// Before-hook coupling, no network, no API key, no real timers.
import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {
  addAiColumnOps,
  liftRpm,
  loadFixture,
  makeApp,
  makeBackend,
  untilRunAllDialog,
  type FakeBackend,
  type RedLazyApp,
} from './lazy-harness.util.ts';

interface RedLazyState {
  be: FakeBackend;
  app: RedLazyApp;
  /** RED-LAZY-1: cell prompts recorded before the page-2 open. */
  promptMark?: number;
  /** RED-LAZY-2: journey observations. */
  reopenCalls?: number;
  redoCalls?: number;
  rowFirstAfterRedo?: unknown;
  readoutAfterRedo?: { done: number; total: number; failed: number } | null;
  /** RED-LAZY-5 / RED-LAZY-6: whether the run-all/dependency gate ever showed. */
  gateSeen?: boolean;
  /** RED-LAZY-6: the group session (sort session lives in `be`/`app`). */
  groupBe?: FakeBackend;
  groupApp?: RedLazyApp;
  /** RED-LAZY-7: toast count before the Save click. */
  toastsBefore?: number;
}

const S = new WeakMap<object, RedLazyState>();

function state(world: object): RedLazyState {
  const s = S.get(world);
  if (!s) throw new Error('lazy-regressions state missing: did the Given step run?');
  return s;
}

/** Auto-answer any run-all/dependency dialog so sendChat never hangs; records
 *  that the gate showed. `choice` decides whether the gated work proceeds. */
function autoAnswerGate(s: { gateSeen?: boolean }, app: RedLazyApp, choice: 'run' | 'skip'): void {
  app.subscribe(() => {
    if (!app.runAllDialog) return;
    s.gateSeen = true;
    if (choice === 'run') app.confirmRunAll();
    else app.declineRunAll();
  });
}

// ── RED-LAZY-1: deterministic step after the AI step mistargets page opens ──

Given('a regression lazy session with an AI column previewed on page 1', async function () {
  liftRpm();
  const be = makeBackend((p) => {
    const m = p.match(/User-(\d+)/);
    return m ? `seg-${m[1]}` : 'x';
  });
  const app = makeApp(be);
  await loadFixture(app, 'paginate-input.csv');
  be.patchQueue.push(addAiColumnOps('Segment', 'Classify {Name}. Reply one word.'));
  await app.sendChat('add a Segment column');
  await app.lazySettle();
  const readout = app.evaluatedReadout();
  if (!readout || readout.done !== 100 || readout.total !== 246) {
    throw new Error(`precondition: page 1 should preview 100 of 246 rows, got ${JSON.stringify(readout)}`);
  }
  S.set(this, { be, app });
});

When('the user sorts by City through chat and opens page 2', async function () {
  const s = state(this);
  s.be.patchQueue.push([
    { op: 'add', path: '/transformations/-', value: { kind: 'sort', by: [{ key: 'City', dir: 'asc' }] } },
  ]);
  await s.app.sendChat('sort by City');
  s.promptMark = s.be.cellPrompts.length;
  await s.app.goToPage(2);
});

Then('page 2 is evaluated and no off-page rows were billed', function () {
  const s = state(this);
  const pendingOnPage = s.app.pageRowStatus().filter((st) => st === 'pending').length;
  const visibleNames = new Set(s.app.pageRows().map((r) => r.Name));
  const prompted = s.be.cellPrompts.slice(s.promptMark!)
    .map((p) => p.match(/User-\d+/)?.[0])
    .filter((n): n is string => Boolean(n));
  const offPage = prompted.filter((n) => !visibleNames.has(n));
  assert.ok(
    pendingOnPage === 0 && offPage.length === 0,
    `RED-LAZY-1 (spec/behavior.md:1390-1398): opening a pending page after a deterministic sort must evaluate exactly that page's lagging rows, the spec explicitly sanctions deterministic steps after the AI step, but page 2 still shows ${pendingOnPage} pending rows and ${offPage.length} of the ${prompted.length} rows the page-open billed are not on the opened page (e.g. ${JSON.stringify(offPage.slice(0, 4))}); derived-row indices are passed where the engine's cellFilter contract wants step-input indices (controller-lazy.ts:269-275, :379 vs headless/index.ts:188-191)`,
  );
});

// ── Field report 2026-07-31: a view sort/filter leaves its page unevaluated ─

When('the user sorts a plain column descending from the column menu', async function () {
  const s = state(this);
  await s.app.setViewSort('Name', 'desc');
  await s.app.lazySettle();
});

When('the user filters a plain column from the column menu', async function () {
  const s = state(this);
  await s.app.setViewFilter('Name', 'User-2');
  await s.app.lazySettle();
});

function assertPageEvaluated(s: RedLazyState, view: string): void {
  const pending = s.app.pageRowStatus().filter((st) => st === 'pending').length;
  const missing = s.app.pageRows().filter((r) => !r.Segment).length;
  assert.ok(
    pending === 0 && missing === 0,
    `behavior.md § Grid upgrades: a view change evaluates the rows it brings into view like a page open, but after the ${view} the current page still shows ${pending} pending rows and ${missing} empty Segment cells; setViewSort/setViewFilter never schedule the visible page's evaluation (controller.ts) while goToPage does`,
  );
}

Then('the sorted first page is fully evaluated without paging away', function () {
  assertPageEvaluated(state(this), 'column-menu sort');
});

Then('the narrowed first page is fully evaluated without paging away', function () {
  assertPageEvaluated(state(this), 'column-menu filter');
});

// ── RED-LAZY-2: {llm} split sits outside all lazy machinery ─────────────────

Given('a regression lazy session with an AI split previewed on page 1', async function () {
  liftRpm();
  const be = makeBackend((p) => {
    const m = p.match(/User-(\d+)/);
    return m ? `A${m[1]}, B${m[1]}` : 'A, B';
  });
  const app = makeApp(be);
  await loadFixture(app, 'paginate-input.csv');
  be.patchQueue.push([
    { op: 'add', path: '/columns/-', value: { id: 'First' } },
    { op: 'add', path: '/columns/-', value: { id: 'Second' } },
    {
      op: 'add',
      path: '/transformations/-',
      value: { kind: 'split', from: 'Name', into: ['First', 'Second'], on: { llm: 'Split {Name} into two parts.' } },
    },
  ]);
  await app.sendChat('split Name into two parts with AI');
  await app.lazySettle();
  const readout = app.evaluatedReadout();
  const first = app.displayRows()[0]?.First;
  if (!readout || readout.done !== 100 || first !== 'A1') {
    throw new Error(`precondition: split should preview page 1 (100 done, row 0 First = "A1"), got ${JSON.stringify(readout)}, First=${JSON.stringify(first)}`);
  }
  S.set(this, { be, app });
});

When('the user pages away and back, then undoes and redoes the split', async function () {
  const s = state(this);
  await s.app.goToPage(2);
  const beforeReopen = s.be.cellCalls;
  await s.app.goToPage(1);
  s.reopenCalls = s.be.cellCalls - beforeReopen;
  const beforeRedo = s.be.cellCalls;
  await s.app.undo();
  await s.app.redo();
  await s.app.lazySettle();
  s.redoCalls = s.be.cellCalls - beforeRedo;
  s.rowFirstAfterRedo = s.app.displayRows()[0]?.First;
  s.readoutAfterRedo = s.app.evaluatedReadout();
});

Then("the split's evaluated cells refill from the cell cache with no new AI calls", function () {
  const s = state(this);
  const restored = s.rowFirstAfterRedo === 'A1' && (s.readoutAfterRedo?.done ?? 0) >= 100;
  assert.ok(
    s.reopenCalls === 0 && restored,
    `RED-LAZY-2 (spec/behavior.md:1390-1396, 1408-1410): an {llm} split's evaluated cells must refill free from the cell cache and "redo restores it from the cell cache with no new AI calls", but re-opening page 1 spent ${s.reopenCalls} fresh cell calls on rows already paid for, and redo-after-undo left row 0's First = ${JSON.stringify(s.rowFirstAfterRedo)} with readout ${JSON.stringify(s.readoutAfterRedo)} (${s.redoCalls} calls); applySplitLlm never reads or writes the cell cache and is unwired from every lazy pass (headless/index.ts:1401-1433 vs the mutate path's cache at :1457-1462)`,
  );
});

// ── RED-LAZY-5: non-append patches bypass the dependency rule ───────────────

Given('a regression lazy session with an AI column previewed and a sort step appended', async function () {
  liftRpm();
  const be = makeBackend((p) => {
    const m = p.match(/User-(\d+)/);
    return m && Number(m[1]) % 2 === 0 ? 'business' : 'consumer';
  });
  const app = makeApp(be);
  const s: RedLazyState = { be, app, gateSeen: false };
  autoAnswerGate(s, app, 'skip');
  await loadFixture(app, 'paginate-input.csv');
  be.patchQueue.push(addAiColumnOps('Segment', 'Classify {Name} as consumer or business.'));
  await app.sendChat('add a Segment column');
  be.patchQueue.push([
    { op: 'add', path: '/transformations/-', value: { kind: 'sort', by: [{ key: 'Name', dir: 'asc' }] } },
  ]);
  await app.sendChat('sort by Name');
  const readout = app.evaluatedReadout();
  if (!readout || readout.done !== 100 || app.displayRows().length !== 246) {
    throw new Error(`precondition: 246 rows with 100 evaluated expected, got ${JSON.stringify(readout)}, rows=${app.displayRows().length}`);
  }
  if (s.gateSeen) throw new Error('precondition: neither the AI column nor the deterministic sort should be gated');
  S.set(this, s);
});

When("the model's patch replaces the sort with a filter reading the AI column", async function () {
  const s = state(this);
  // spec/prompt-app-edit.md licenses replace ops ("unless the user says undo
  // or replace"): this is realistic model output, not a synthetic patch.
  s.be.patchQueue.push([
    { op: 'replace', path: '/transformations/1', value: { kind: 'filter', pred: { js: "row.Segment === 'business'" } } },
  ]);
  await s.app.sendChat('instead of sorting, keep only the business rows');
});

Then('the dependency confirmation gates the replace patch and pending rows survive', function () {
  const s = state(this);
  const rows = s.app.displayRows().length;
  assert.ok(
    s.gateSeen === true && rows === 246,
    `RED-LAZY-5 (spec/behavior.md:1477-1481; code-contract.md:1080-1084): "the dependency rule applies at patch commit" for any patch shape, but a replace patch introducing an AI-reading {js} filter committed ungated (confirmation shown: ${String(s.gateSeen)}) and the filter compared 146 pending sentinel rows against the predicate, silently deleting them. Table now has ${rows} of 246 rows, readout ${JSON.stringify(s.app.evaluatedReadout())}; newStepsReadAiColumns diffs only steps appended beyond the previous spec's length (controller-lazy.ts:646-650)`,
  );
});

// ── RED-LAZY-6: {llm} sort keys / group aggregates escape the lazy machinery ─

Given('two regression lazy sessions on the paginated fixture', async function () {
  liftRpm();
  // Session A: fresh table, will receive an {llm} sort key.
  const be = makeBackend(() => '1');
  const app = makeApp(be);
  const s: RedLazyState = { be, app, gateSeen: false };
  autoAnswerGate(s, app, 'skip');
  await loadFixture(app, 'paginate-input.csv');
  // Session B: AI column pending, will receive an {llm} group aggregate.
  const groupBe = makeBackend((p) => (p.includes('Classify') ? 'consumer' : 'a summary'));
  const groupApp = makeApp(groupBe);
  autoAnswerGate(s, groupApp, 'skip');
  await loadFixture(groupApp, 'paginate-input.csv');
  groupBe.patchQueue.push(addAiColumnOps('Segment', 'Classify {Name} as consumer or business.'));
  await groupApp.sendChat('add a Segment column');
  const readout = groupApp.evaluatedReadout();
  if (!readout || readout.done !== 100) {
    throw new Error(`precondition: group session should have 146 pending rows, got ${JSON.stringify(readout)}`);
  }
  s.groupBe = groupBe;
  s.groupApp = groupApp;
  S.set(this, s);
});

When('one requests an AI sort and the other an AI group summary through chat', async function () {
  const s = state(this);
  s.be.patchQueue.push([
    {
      op: 'add',
      path: '/transformations/-',
      value: { kind: 'sort', by: [{ key: { llm: 'How far north is {City}? Reply a number.' }, dir: 'asc' }] },
    },
  ]);
  await s.app.sendChat('sort rows by how far north the city is');
  const groupApp = s.groupApp!;
  s.groupBe!.patchQueue.push([
    {
      op: 'add',
      path: '/transformations/-',
      value: { kind: 'group', by: ['City'], agg: { Summary: { llm: 'Summarize these rows: {*}' } } },
    },
  ]);
  await groupApp.sendChat('summarize each city with AI');
});

Then('the AI sort is estimate-gated and no outgoing prompt carries the pending sentinel', function () {
  const s = state(this);
  const sortPrompts = s.be.cellPrompts.length;
  const leaked = s.groupBe!.cellPrompts.filter((p) => p.includes('__ttPending'));
  assert.ok(
    s.gateSeen === true && leaked.length === 0,
    `RED-LAZY-6 (spec/behavior.md:1361-1363, 1388, 1452-1456): "an AI step runs on the page you are looking at, not on the whole table" and more than a page of AI work shows the estimate dialog first, but the {llm} sort ran ${sortPrompts} cell prompts table-wide with no gate (dialog shown: ${String(s.gateSeen)}; Simple mode DOES gate this same request via specHasLlmCell, proving the omission), and ${leaked.length} group {*} prompts serialized the {"__ttPending":true} sentinel to the model as data (fragment: ${JSON.stringify(leaked[0]?.slice(0, 120) ?? '')}); evalSortKey and applyGroup never receive the lazy cellFilter (headless/index.ts:1283, 1343-1353) and readsAiColumns exempts llm aggregates (controller-lazy.ts:635)`,
  );
});

// ── RED-LAZY-7: Save silently abandoned when the gated run has failures ─────

Given('a regression lazy session with an AI column previewed and two rows rigged to fail', async function () {
  liftRpm();
  const be = makeBackend((p) => {
    const m = p.match(/User-(\d+)/);
    return m ? `seg-${m[1]}` : 'x';
  });
  const app = makeApp(be);
  await loadFixture(app, 'paginate-input.csv');
  be.patchQueue.push(addAiColumnOps('Segment', 'Classify {Name}. Reply one word.'));
  await app.sendChat('add a Segment column');
  const readout = app.evaluatedReadout();
  if (!readout || readout.done !== 100) {
    throw new Error(`precondition: 146 rows should be pending before Save, got ${JSON.stringify(readout)}`);
  }
  be.failCells = (p) => p.includes('User-205') || p.includes('User-210');
  S.set(this, { be, app, toastsBefore: app.toasts.length });
});

When('the user saves and confirms the estimate dialog', async function () {
  const s = state(this);
  const save = s.app.saveData();
  const gateShown = await untilRunAllDialog(s.app);
  if (!gateShown || s.app.runAllDialog?.reason !== 'save') {
    throw new Error(`precondition: Save with pending rows must raise the estimate dialog (reason "save"), got ${JSON.stringify(s.app.runAllDialog)}`);
  }
  s.app.confirmRunAll();
  await save;
  await s.app.lazySettle();
});

Then('the Save click ends with a save-ready confirmation or a visible message', function () {
  const s = state(this);
  const readout = s.app.evaluatedReadout();
  if (!readout || readout.failed !== 2) {
    throw new Error(`precondition: the run should end with exactly 2 failed rows, got ${JSON.stringify(readout)}`);
  }
  const newToasts = s.app.toasts.slice(s.toastsBefore!);
  const saveMessages = s.app.messages.filter((m) => /save/i.test(m.text));
  const anyFeedback = s.app.saveGate || newToasts.length > 0 || saveMessages.length > 0;
  assert.ok(
    anyFeedback,
    `RED-LAZY-7 (spec/behavior.md:1469-1471): "when the run was started from Save, a save-ready confirmation follows the run", the user clicked Save, confirmed a paid run that finished ${readout.done}/${readout.total} with ${readout.failed} failed rows, and got nothing: saveGate=${JSON.stringify(s.app.saveGate)}, new toasts=${newToasts.length}, save-related chat messages=${saveMessages.length}; saveGated bails silently on any run with failures (controller-files.ts:413)`,
  );
});
