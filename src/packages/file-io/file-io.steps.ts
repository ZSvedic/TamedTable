// #FileIO
// Step defs for the @headless file-io scenarios — pure API calls, no browser.
// The package's own steps live next to the code (see spec/packages/README.md);
// they import nothing from the app harness.
import { Given, Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import type { TablePlan } from '@tamedtable/table-plan';
import {
  detectFormat,
  fetchTable,
  sampleNameFromUrl,
  serializeFlow,
  type FetchLike,
  type FormatId,
  type PickedFile,
} from './index.ts';

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
