// Red step definitions for spec/test-cases/red/red-fio.feature — the file-io
// bug inventory. Self-contained: each scenario builds its own controller or
// runner inline (no green hooks, no worldParameters), per the red-suite
// conventions. Every Then asserts the SPEC-CORRECT behavior and fails today,
// with a message naming the defect.
import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWebController } from '@tamedtable/web';
import { createHeadlessRunner } from '@tamedtable/headless';

type WebCtrl = ReturnType<typeof createWebController>;
type Runner = ReturnType<typeof createHeadlessRunner>;

interface RedFioWorld {
  redFioController?: WebCtrl;
  redFioUrl?: string;
  redFioLoadError?: Error;
  redFioRunner?: Runner;
  redFioCsvPath?: string;
}

// A do-nothing FilePort — these scenarios never open a dialog.
const stubFilePort = {
  hasFileSystemAccess: true,
  pickOpen: async () => null,
  pickSave: async (name: string) => ({ status: 'saved' as const, name }),
};

// ── RED-FIO-1 ──────────────────────────────────────────────────────────────

Given(
  'a red web session whose fetch serves CSV as {string} at {string}',
  function (this: RedFioWorld, contentType: string, url: string) {
    const stubFetch = (input: string | URL | Request): Promise<Response> => {
      const requested = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (requested !== url) return Promise.reject(new Error(`unexpected fetch: ${requested}`));
      return Promise.resolve(
        new Response('a,b\n1,2\n', { status: 200, headers: { 'content-type': contentType } }),
      );
    };
    this.redFioUrl = url;
    this.redFioController = createWebController({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      file: stubFilePort as any,
      fetch: stubFetch,
      env: {},
    });
  },
);

When('the user loads that extension-less URL into the web app', async function (this: RedFioWorld) {
  try {
    await this.redFioController!.loadFromUrl(this.redFioUrl!);
    this.redFioLoadError = undefined;
  } catch (e) {
    this.redFioLoadError = e as Error;
  }
});

Then(
  'the Content-Type fallback loads the table with columns {string}',
  function (this: RedFioWorld, columnList: string) {
    assert.equal(
      this.redFioLoadError,
      undefined,
      `RED-FIO-1 (spec/behavior.md:968-970): format "is detected from the path extension first and from the Content-Type header as a fallback" — but an extension-less URL served as text/csv cannot load; loadFromUrl threw: ${this.redFioLoadError?.message}`,
    );
    const ids = this.redFioController!.displaySpec().columns.map((c) => c.id);
    assert.deepEqual(
      ids,
      columnList.split(','),
      'RED-FIO-1 (spec/behavior.md:968-970): the fetched CSV must load with its header columns',
    );
  },
);

// ── RED-FIO-7 ──────────────────────────────────────────────────────────────

Given(
  'a red headless session whose first column carries the label {string}',
  async function (this: RedFioWorld, label: string) {
    const runner = createHeadlessRunner({ apiKey: 'dummy' });
    await runner.loadParsed(
      [{ full_name: 'Ada', age: '36' }],
      {
        table: 'people.csv',
        columns: [{ id: 'full_name', label }, { id: 'age' }],
        transformations: [],
      },
    );
    this.redFioRunner = runner;
  },
);

When('the session exports the table to a temporary CSV file', async function (this: RedFioWorld) {
  const dir = await mkdtemp(join(tmpdir(), 'red-fio-'));
  this.redFioCsvPath = join(dir, 'out.csv');
  await this.redFioRunner!.exportAs(this.redFioCsvPath);
});

Then('the exported CSV header row is {string}', async function (this: RedFioWorld, expected: string) {
  const text = await readFile(this.redFioCsvPath!, 'utf8');
  const header = text.split('\n')[0];
  assert.equal(
    header,
    expected,
    `RED-FIO-7 (spec/behavior.md:601-602): "the header row is the spec's column order (using label when set, otherwise id)" — export wrote the raw id instead of the label; got header ${JSON.stringify(header)}`,
  );
});
