// Red step defs for spec/test-cases/red/red-web.feature — the web-controller
// bug inventory. Self-contained: each scenario builds its own WebController
// with a minimal in-memory FilePort and an injected fetch; no worldParameters,
// no Before-hook coupling, no network, no API key.
import { Given, When, Then, After } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {
  createWebController,
  type WebController,
  type FilePort,
  type PickedFile,
  type SaveOutcome,
} from '@tamedtable/web';

/** Minimal FilePort: pickOpen hands back whatever `next` holds, saves succeed. */
class RedFilePort {
  readonly hasFileSystemAccess = true;
  next: PickedFile | null = null;
  pickOpen(): Promise<PickedFile | null> {
    return Promise.resolve(this.next);
  }
  pickSave(name: string): Promise<SaveOutcome> {
    return Promise.resolve({ status: 'saved', name });
  }
}

interface RedWebState {
  port: RedFilePort;
  c: WebController;
  /** RED-WEB-4: the in-flight sendChat and the gate holding its model call open. */
  inflight?: Promise<void>;
  release?: () => void;
  /** RED-WEB-5: one controller per browser fetch-failure message. */
  sessions?: { label: string; c: WebController }[];
}

const S = new WeakMap<object, RedWebState>();

function state(world: object): RedWebState {
  const s = S.get(world);
  if (!s) throw new Error('red-web state missing — did the Given step run?');
  return s;
}

function newController(port: RedFilePort, extra?: object): WebController {
  return createWebController({ file: port as unknown as FilePort, env: {}, ...extra });
}

function flowFile(name: string, transformations: object[]): PickedFile {
  return {
    name,
    bytes: new TextEncoder().encode(
      JSON.stringify({
        version: 2,
        source: 't.csv',
        spec: { columns: [{ id: 'x' }, { id: 'y' }], transformations },
      }),
    ),
  };
}

// ── RED-WEB-1 / RED-WEB-2: flow replay replies ───────────────────────────────

Given('a red web session with a two-row table loaded', async function () {
  const port = new RedFilePort();
  const c = newController(port);
  await c.loadFromText('t.csv', 'x,y\n5,6\n7,8\n');
  S.set(this, { port, c });
});

When('the user replays a saved flow of {int} deterministic steps', async function (count: number) {
  const { port, c } = state(this);
  const steps = Array.from({ length: count }, () => ({
    kind: 'mutate',
    columns: 'x',
    value: { js: 'Number(row.x) + 1' },
  }));
  port.next = flowFile('many-steps.flow', steps);
  await c.openFlow();
});

Then('the flow reply shows at most 7 numbered lines plus an overflow line', function () {
  const { c } = state(this);
  const reply = c.messages[c.messages.length - 1]!;
  const numbered = reply.text.split('\n').filter((l) => /^\d+\. /.test(l)).length;
  const hasOverflow = /… and \d+ more/.test(reply.text);
  assert.ok(
    numbered <= 7 && hasOverflow,
    `RED-WEB-1 (spec/behavior.md:1126-1131): a flow replay's reply takes the same shape as a chat reply — up to 7 numbered lines with overflow rendered as "… and N more"; got ${numbered} numbered lines and overflow line present: ${hasOverflow}`,
  );
});

When('the user replays a saved flow that throws mid-run', async function () {
  const { port, c } = state(this);
  port.next = flowFile('boom.flow', [
    { kind: 'mutate', columns: 'x', value: { js: 'Number(row.x)' } }, // runs fine
    { kind: 'mutate', columns: 'y', value: { js: 'definitelyNotDefined.at.all' } }, // throws
  ]);
  await c.openFlow();
});

Then('the flow failure reply carries the Report bug action', function () {
  const { c } = state(this);
  const reply = c.messages[c.messages.length - 1]!;
  assert.equal(
    reply.reportable,
    true,
    `RED-WEB-2 (spec/behavior.md:1091-1097, 1155-1157): an unclassified mid-run flow failure is an app error, so its chat reply must carry Report bug (reportable === true); got reportable=${String(reply.reportable)} on reply ${JSON.stringify(reply.text.slice(0, 70))}`,
  );
});

// ── RED-WEB-3: diagnostics with readable-but-unwritable localStorage ─────────

let storageShimmed = false;
let savedStorageDescriptor: PropertyDescriptor | undefined;

function shimReadOnlyStorage(): void {
  savedStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: () => {
      // Legacy Safari private mode / full origin quota: reads work, writes throw.
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: shim,
    configurable: true,
    writable: true,
  });
  storageShimmed = true;
}

function restoreStorage(): void {
  if (!storageShimmed) return;
  if (savedStorageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', savedStorageDescriptor);
  } else {
    delete (globalThis as Record<string, unknown>).localStorage;
  }
  storageShimmed = false;
}

// Safety net: never leak the storage shim into the next scenario, even when a
// step throws. Runs only for @red scenarios, so green profiles are untouched.
After({ tags: '@red' }, function () {
  restoreStorage();
});

Given('a red web session whose browser storage rejects writes', function () {
  shimReadOnlyStorage();
  const port = new RedFilePort();
  S.set(this, { port, c: newController(port) });
});

When('two error toasts are pushed into the session', function () {
  const { c } = state(this);
  c.pushToast('error', 'first red toast');
  c.pushToast('error', 'second red toast');
});

Then('the diagnostics log still lists both error events', function () {
  const { c } = state(this);
  const events = c.diagnosticsEvents();
  restoreStorage();
  const hits = events.filter((e) => e.message.includes('red toast')).length;
  assert.equal(
    hits,
    2,
    `RED-WEB-3 (spec/behavior.md:1333-1335): where the browser hides storage the log must keep working in memory — expected both error toasts in the diagnostics log, got ${hits} of 2 (total events: ${events.length})`,
  );
});

// ── RED-WEB-4: provider switch while a chat request streams ─────────────────

/** Canned Gemini function-call turn: append a filter keeping rows where n < 3. */
const GEMINI_FILTER_TURN = JSON.stringify({
  candidates: [
    {
      content: {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'apply_spec_patch',
              id: 'c1',
              args: {
                operations: [
                  {
                    op: 'add',
                    path: '/transformations/-',
                    value: JSON.stringify({ kind: 'filter', pred: { js: 'Number(row.n) < 3' } }),
                  },
                ],
              },
            },
          },
        ],
      },
      finishReason: 'STOP',
    },
  ],
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
});

Given('a red web session with a chat request held mid-flight', async function () {
  const port = new RedFilePort();
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const fetchStub = async (): Promise<Response> => {
    await gate;
    return new Response(GEMINI_FILTER_TURN, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const c = newController(port, { fetch: fetchStub, config: { geminiKey: 'k' } });
  await c.loadFromText('n.csv', 'n\n1\n2\n3\n');
  const inflight = c.sendChat('keep rows below 3');
  await new Promise((r) => setTimeout(r, 30));
  if (!c.streaming) throw new Error('precondition: chat request should be streaming while its model call is held open');
  S.set(this, { port, c, inflight, release });
});

When('the user switches provider before the held reply lands', async function () {
  const { c, inflight, release } = state(this);
  c.openSettings();
  await c.clickProviderCard('anthropic');
  release!();
  await inflight;
});

Then('the table shows the step the chat reply claims was executed', function () {
  const { c } = state(this);
  const reply = c.messages[c.messages.length - 1]!;
  const claimed = reply.text.startsWith('Executed steps:');
  const applied = c.currentSpec().transformations.length;
  const rows = c.currentRows().length;
  assert.ok(
    claimed && applied === 1 && rows === 2,
    `RED-WEB-4 (spec/behavior.md:1058-1060, 1139-1141): a provider switch rebuilds the engine "so the table on screen is preserved" and the thread never claims a step the table doesn't show — chat claims Executed steps: ${claimed}, but the visible spec has ${applied} transformation(s) and ${rows} row(s) (the committed filter should leave 2)`,
  );
});

// ── RED-WEB-5: Safari / Firefox network-failure classification ──────────────

Given('red web sessions whose fetch fails with the Safari and Firefox network messages', function () {
  const sessions = [
    { label: 'Safari ("Load failed")', message: 'Load failed' },
    { label: 'Firefox ("NetworkError when attempting to fetch resource.")', message: 'NetworkError when attempting to fetch resource.' },
  ].map(({ label, message }) => {
    const port = new RedFilePort();
    const c = newController(port, {
      fetch: () => Promise.reject(new TypeError(message)),
      config: { geminiKey: 'k' },
    });
    return { label, c };
  });
  const port = new RedFilePort();
  S.set(this, { port, c: sessions[0]!.c, sessions });
});

When('the user sends a chat request in each session', async function () {
  const { sessions } = state(this);
  for (const { c } of sessions!) {
    await c.loadFromText('n.csv', 'n\n1\n');
    await c.sendChat('do something');
  }
});

Then('each reply shows the network guidance sentence and no Report bug action', function () {
  const { sessions } = state(this);
  for (const { label, c } of sessions!) {
    const reply = c.messages[c.messages.length - 1]!;
    const guided = reply.text.includes('Network error. Could not reach the Google API.');
    assert.ok(
      guided && reply.reportable !== true,
      `RED-WEB-5 (spec/behavior.md:1080-1081, 1088-1090): a ${label} network failure must read "Network error. Could not reach the Google API." and stay a guidance error (no Report bug); got ${JSON.stringify(reply.text.slice(0, 80))} with reportable=${String(reply.reportable)}`,
    );
  }
});

// ── RED-WEB-6: stale pinned sort after a committed cell edit ─────────────────

Given('a red web session sorted descending on a numeric column', async function () {
  const port = new RedFilePort();
  const c = newController(port);
  await c.loadFromText('s.csv', 'a\n20\n5\n40\n');
  await c.setViewSort('a', 'desc');
  const col = c.viewRows().map((r) => String(r.a));
  if (col.join(',') !== '40,20,5') {
    throw new Error(`precondition: descending sort should read 40,20,5 — got ${col.join(',')}`);
  }
  S.set(this, { port, c });
});

When('the user edits a sorted cell so its rank changes', async function () {
  // View row 1 holds 20; editing it to 1 must sink it below 5 in a live desc sort.
  await state(this).c.editCell(1, 'a', '1');
});

Then('the column still reads in descending order', function () {
  const { c } = state(this);
  const col = c.viewRows().map((r) => String(r.a));
  assert.deepEqual(
    col,
    ['40', '5', '1'],
    `RED-WEB-6 (spec/behavior.md:1549-1552): with the sort indicator still active (${JSON.stringify(c.viewSort())}) the view must fold the edited row back into order once the commit settles; view reads ${JSON.stringify(col)} instead of ["40","5","1"]`,
  );
});
