// Data-integrity regressions — hostile-but-real data driven through the engine
// offline (loadInput → setSpec with deterministic specs → exportAs; no model
// calls, no API key). These used to be the RED-DATA-1/2/3/4/6 bug inventory,
// now fixed and pinned green: a leading-blank-line CSV, the `in`-operator
// prototype leak, `__proto__`-named columns, a NUL byte in a {sql} step, and
// the JSONL/CSV undefined-cell schema agreement.
import { afterAll, beforeAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner } from '@tamedtable/headless';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'data-integrity-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const writeData = (name: string, content: string) => {
  const p = join(dir, name);
  writeFileSync(p, content);
  return p;
};

test('CSV with one leading blank line loads its real header and a load→save keeps the data', async () => {
  const p = writeData('blank-lead.csv', '\nName,Amount\nalice,10\nbob,20\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  const out = join(dir, 'blank-lead-out.csv');
  await r.exportAs(out);
  const saved = readFileSync(out, 'utf8');
  assert.ok(
    saved.includes('alice') && saved.includes('Name'),
    `a CSV starting with one blank line must load its real header and keep the data on load→save; saved CSV was ${JSON.stringify(saved)}`,
  );
  assert.deepEqual(
    r.currentSpec().columns.map((c) => c.id),
    ['Name', 'Amount'],
    'columns must be the real header row [Name, Amount], not [""]',
  );
});

test('`in`-operator prototype leak is closed — toString column and constructor select behave', async () => {
  // Union-of-keys JSONL: only the first row owns `toString`.
  const p = writeData('tostring.jsonl', '{"a":"1","toString":"T1"}\n{"a":"2"}\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  const out = join(dir, 'tostring-out.csv');
  await r.exportAs(out);
  const saved = readFileSync(out, 'utf8');
  assert.ok(
    !saved.includes('[native code]'),
    `a row missing the "toString" key must write an empty cell, never Object.prototype.toString's source; saved CSV was ${JSON.stringify(saved)}`,
  );

  const p2 = writeData('ctor.csv', 'a\n1\n');
  const r2 = createHeadlessRunner({});
  await r2.loadInput(p2);
  await r2.setSpec({
    table: p2,
    columns: [{ id: 'a' }, { id: 'constructor' }],
    transformations: [{ kind: 'select', columns: ['a', 'constructor'] }],
  });
  const cell = r2.currentRows()[0]?.['constructor'];
  assert.equal(cell, null, `select of a column named "constructor" that no row has must yield null; got ${String(cell)}`);
});

test('writes to a column named __proto__ are own properties; a __proto__ pivot on-value stays data', async () => {
  // (a) mutate into __proto__ must write an own property.
  const p = writeData('mutproto.csv', 'a\n1\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  await r.setSpec({
    table: p,
    columns: [{ id: 'a' }],
    transformations: [{ kind: 'mutate', columns: '__proto__', value: { js: '"X"' } }],
  });
  const own = Object.getOwnPropertyDescriptor(r.currentRows()[0]!, '__proto__')?.value;
  assert.equal(own, 'X', 'a mutate targeting a column named "__proto__" must write an own property "X"');

  // (b) pivot on-value "__proto__" with an object cell — output rows must keep
  // Object.prototype as their prototype and inherit no data keys.
  const p2 = writeData(
    'pivotproto.jsonl',
    '{"id":"1","attr":"__proto__","val":{"approved":true}}\n' +
      '{"id":"1","attr":"color","val":"red"}\n' +
      '{"id":"2","attr":"color","val":"blue"}\n',
  );
  const r2 = createHeadlessRunner({});
  await r2.loadInput(p2);
  await r2.setSpec({
    table: p2,
    columns: [{ id: 'id' }, { id: 'attr' }, { id: 'val' }],
    transformations: [{ kind: 'pivot', index: ['id'], on: 'attr', values: 'val' }],
  });
  const rows = r2.currentRows();
  const injected = rows.find((row) => Object.getPrototypeOf(row) !== Object.prototype);
  assert.equal(injected, undefined, `pivot output rows must have Object.prototype as their prototype; row ${JSON.stringify(injected)} got its pivoted cell's object installed as prototype`);
});

test('one NUL byte in any cell does not break a {sql} step', async () => {
  const p = writeData('nul.jsonl', '{"x":"a\\u0000b"}\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  let err: Error | undefined;
  try {
    await r.setSpec({
      table: p,
      columns: [{ id: 'x' }, { id: 'u' }],
      transformations: [{ kind: 'mutate', columns: 'u', value: { sql: 'upper(x)' } }],
    });
  } catch (e) {
    err = e as Error;
  }
  assert.equal(err, undefined, `a valid {sql} fragment must run over rows containing a NUL byte; instead it threw: ${err?.message.split('\n')[0]}`);
});

test('a mutate writing undefined saves as null in JSONL, matching the CSV empty cell', async () => {
  const p = writeData('undef.csv', 'v\nx\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  await r.setSpec({
    table: p,
    columns: [{ id: 'v' }, { id: 'out' }],
    transformations: [{ kind: 'mutate', columns: 'out', value: { js: 'undefined' } }],
  });
  const outJl = join(dir, 'undef-out.jsonl');
  await r.exportAs(outJl);
  const line = readFileSync(outJl, 'utf8').trim().split('\n')[0]!;
  assert.deepEqual(
    JSON.parse(line),
    { v: 'x', out: null },
    `the JSONL save must carry the "out" key as null — matching the CSV save — but the row was ${line}`,
  );
});
