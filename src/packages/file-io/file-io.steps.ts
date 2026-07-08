// #FileIO
// Step defs for the @headless file-io scenarios — pure API calls, no browser.
// The package's own steps live next to the code (see spec/packages/README.md);
// they import nothing from the app harness.
import { Given, Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { tableFromArrays, tableToIPC } from 'apache-arrow';
import type { Row, TablePlan } from '@tamedtable/table-plan';
import {
  detectFormat,
  fetchTable,
  parseTable,
  sampleNameFromUrl,
  serializeFlow,
  type FetchLike,
  type FormatId,
  type PickedFile,
} from './index.ts';
import { warnIfHuge } from './codecs/values.ts';

/** Quoted step arguments write newlines as the two characters `\n`. */
const unescape = (s: string): string => s.replaceAll('\\n', '\n');

interface FileIoWorld {
  _fio?: {
    fetchStub?: FetchLike;
    spec?: TablePlan;
    format?: FormatId | null;
    name?: string;
    picked?: PickedFile;
    flow?: { version: number; source: string; spec: TablePlan };
    error?: Error;
    parsed?: { rows: Row[]; spec: TablePlan };
    arrowFile?: PickedFile;
    warning?: string;
    pickerErrorName?: string;
    pickResult?: PickedFile | null;
  };
}

function ctx(world: FileIoWorld): NonNullable<FileIoWorld['_fio']> {
  world._fio ??= {};
  return world._fio;
}

// ── detectFormat / sampleNameFromUrl ─────────────────────────────────────────

When(
  'detectFormat is called with path {string} and content type {string}',
  function (this: FileIoWorld, path: string, contentType: string) {
    ctx(this).format = detectFormat(path, contentType);
  },
);

When(
  'detectFormat is called with path {string} and no content type',
  function (this: FileIoWorld, path: string) {
    ctx(this).format = detectFormat(path, null);
  },
);

Then('the detected format is {string}', function (this: FileIoWorld, expected: string) {
  assert.equal(ctx(this).format, expected);
});

Then('no format is detected', function (this: FileIoWorld) {
  assert.equal(ctx(this).format, null);
});

When(
  'sampleNameFromUrl is called with {string} and format {string}',
  function (this: FileIoWorld, url: string, format: string) {
    ctx(this).name = sampleNameFromUrl(new URL(url), format as FormatId);
  },
);

Then('the derived name is {string}', function (this: FileIoWorld, expected: string) {
  assert.equal(ctx(this).name, expected);
});

// ── fetchTable ───────────────────────────────────────────────────────────────

Given(
  'a stub fetch serving {string} with body {string} and content type {string}',
  function (this: FileIoWorld, url: string, body: string, contentType: string) {
    ctx(this).fetchStub = async (input) => {
      assert.equal(String(input), url);
      return new Response(unescape(body), {
        status: 200,
        headers: { 'content-type': contentType },
      });
    };
  },
);

Given(
  'a stub fetch serving {string} with status {int} {string}',
  function (this: FileIoWorld, url: string, status: number, statusText: string) {
    ctx(this).fetchStub = async (input) => {
      assert.equal(String(input), url);
      return new Response('', { status, statusText });
    };
  },
);

Given('a stub fetch that fails with {string}', function (this: FileIoWorld, message: string) {
  ctx(this).fetchStub = async () => {
    throw new TypeError(message);
  };
});

When('fetchTable is called with {string}', async function (this: FileIoWorld, url: string) {
  const c = ctx(this);
  // A scenario without a stub must fail before any network call is made, so
  // the fallback fetch throws instead of going online.
  const offline: FetchLike = async () => {
    throw new Error('file-io steps: unexpected network call');
  };
  try {
    c.picked = await fetchTable(url, c.fetchStub ?? offline);
  } catch (e) {
    c.error = e as Error;
  }
});

Then('the picked file is named {string}', function (this: FileIoWorld, expected: string) {
  assert.ok(ctx(this).picked, ctx(this).error?.message);
  assert.equal(ctx(this).picked!.name, expected);
});

Then('the picked file text is {string}', function (this: FileIoWorld, expected: string) {
  assert.equal(new TextDecoder().decode(ctx(this).picked!.bytes), unescape(expected));
});

Then('fetchTable fails with {string}', function (this: FileIoWorld, expected: string) {
  assert.ok(ctx(this).error, 'expected fetchTable to fail, but it succeeded');
  assert.equal(ctx(this).error!.message, expected);
});

Then('fetchTable fails mentioning {string}', function (this: FileIoWorld, fragment: string) {
  assert.ok(ctx(this).error, 'expected fetchTable to fail, but it succeeded');
  assert.ok(
    ctx(this).error!.message.includes(fragment),
    `expected "${ctx(this).error!.message}" to mention "${fragment}"`,
  );
});

// ── parseTable: codec edge cases ─────────────────────────────────────────────

async function parseNamed(world: FileIoWorld, name: string, bytes: Uint8Array): Promise<void> {
  const c = ctx(world);
  try {
    c.parsed = await parseTable(name, bytes);
  } catch (e) {
    c.error = e as Error;
  }
}

When(
  'a file {string} with body {string} is parsed',
  async function (this: FileIoWorld, name: string, body: string) {
    await parseNamed(this, name, new TextEncoder().encode(unescape(body)));
  },
);

When(
  'a file {string} with a UTF-8 BOM and body {string} is parsed',
  async function (this: FileIoWorld, name: string, body: string) {
    await parseNamed(this, name, new TextEncoder().encode(String.fromCharCode(0xfeff) + unescape(body)));
  },
);

Then('the parsed columns are {string}', function (this: FileIoWorld, columns: string) {
  const c = ctx(this);
  assert.ok(c.parsed, c.error?.message);
  assert.deepEqual(
    c.parsed!.spec.columns.map((col) => col.id),
    columns.split(',').map((s) => s.trim()),
  );
});

Then('parsing fails mentioning {string}', function (this: FileIoWorld, fragment: string) {
  assert.ok(ctx(this).error, 'expected parsing to fail, but it succeeded');
  assert.ok(
    ctx(this).error!.message.includes(fragment),
    `expected "${ctx(this).error!.message}" to mention "${fragment}"`,
  );
});

Given(
  'an Arrow file {string} with int64 column {string} holding {string} and {string}',
  function (this: FileIoWorld, name: string, column: string, first: string, second: string) {
    const table = tableFromArrays({ [column]: new BigInt64Array([BigInt(first), BigInt(second)]) });
    ctx(this).arrowFile = { name, bytes: tableToIPC(table, 'file') };
  },
);

When('the Arrow file is parsed', async function (this: FileIoWorld) {
  const file = ctx(this).arrowFile!;
  await parseNamed(this, file.name, file.bytes);
});

Then(
  'row {int} cell {string} is the string {string}',
  function (this: FileIoWorld, row: number, column: string, expected: string) {
    assert.deepEqual(ctx(this).parsed!.rows[row - 1][column], expected);
  },
);

Then(
  'row {int} cell {string} is the number {int}',
  function (this: FileIoWorld, row: number, column: string, expected: number) {
    assert.deepEqual(ctx(this).parsed!.rows[row - 1][column], expected);
  },
);

// ── warnIfHuge ───────────────────────────────────────────────────────────────

When(
  'the size guard checks a {int} GB file named {string}',
  function (this: FileIoWorld, gb: number, name: string) {
    // Only `length` is read, so a 3 GB buffer never has to be allocated.
    const bytes = { length: gb * 1024 * 1024 * 1024 } as Uint8Array;
    const original = console.warn;
    let captured = '';
    console.warn = (message: unknown) => {
      captured = String(message);
    };
    try {
      warnIfHuge(bytes, name);
    } finally {
      console.warn = original;
    }
    ctx(this).warning = captured;
  },
);

Then('a console warning mentions {string}', function (this: FileIoWorld, fragment: string) {
  assert.ok(
    ctx(this).warning?.includes(fragment),
    `expected warning "${ctx(this).warning}" to mention "${fragment}"`,
  );
});

// ── BrowserFilePort error mapping ────────────────────────────────────────────

Given('a browser open dialog that throws {string}', function (this: FileIoWorld, errorName: string) {
  ctx(this).pickerErrorName = errorName;
});

When('pickOpen runs against that browser', async function (this: FileIoWorld) {
  const c = ctx(this);
  const failure = new Error('picker failure');
  failure.name = c.pickerErrorName!;
  const globals = globalThis as { window?: unknown };
  const previous = globals.window;
  globals.window = { showOpenFilePicker: async () => { throw failure; } };
  try {
    const { BrowserFilePort } = await import('./browser-fs.ts');
    c.pickResult = await new BrowserFilePort().pickOpen(['.csv']);
  } catch (e) {
    c.error = e as Error;
  } finally {
    globals.window = previous;
  }
});

Then('pickOpen resolves with no file', function (this: FileIoWorld) {
  const c = ctx(this);
  assert.equal(c.error, undefined, c.error?.message);
  assert.equal(c.pickResult, null);
});

Then('pickOpen rethrows an error named {string}', function (this: FileIoWorld, errorName: string) {
  assert.ok(ctx(this).error, 'expected pickOpen to throw, but it resolved');
  assert.equal(ctx(this).error!.name, errorName);
});

// ── serializeFlow ────────────────────────────────────────────────────────────

const specWithColumns = (table: string | undefined, columns: string): TablePlan => ({
  ...(table === undefined ? {} : { table }),
  columns: columns.split(',').map((c) => ({ id: c.trim() })),
  transformations: [],
});

Given(
  'a spec for table {string} with columns {string}',
  function (this: FileIoWorld, table: string, columns: string) {
    ctx(this).spec = specWithColumns(table, columns);
  },
);

Given('a spec with no table and columns {string}', function (this: FileIoWorld, columns: string) {
  ctx(this).spec = specWithColumns(undefined, columns);
});

When('serializeFlow is called', function (this: FileIoWorld) {
  const c = ctx(this);
  const text = serializeFlow(c.spec!);
  assert.ok(text.endsWith('}\n'), 'flow output ends with a trailing newline');
  c.flow = JSON.parse(text);
});

Then('the flow JSON has version {int}', function (this: FileIoWorld, version: number) {
  assert.equal(ctx(this).flow!.version, version);
});

Then('the flow JSON has source {string}', function (this: FileIoWorld, source: string) {
  assert.equal(ctx(this).flow!.source, source);
});

Then('the flow JSON spec has columns {string}', function (this: FileIoWorld, columns: string) {
  const expected = columns.split(',').map((c) => c.trim());
  assert.deepEqual(
    ctx(this).flow!.spec.columns.map((c) => c.id),
    expected,
  );
});
