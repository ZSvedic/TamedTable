// RED-DATA-1..6 — red unit tests (bug inventory): hostile-but-real data driven
// through the engine offline (loadInput → setSpec with deterministic specs →
// exportAs; no model calls, no API key). Each test asserts the SPEC-CORRECT
// behavior and fails on current code; the assertion message names the defect.
//
// Cross-package repros (headless engine + file-io codecs), so they live in
// src/tests/red/ per the red-test conventions. Excluded from plain `bun test`
// by bunfig [test] pathIgnorePatterns; run via `bun run test:red:unit`.
import { afterAll, beforeAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner } from '@tamedtable/headless';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'red-data-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const writeData = (name: string, content: string) => {
  const p = join(dir, name);
  writeFileSync(p, content);
  return p;
};

// RED-DATA-1 (critical). Cause: file-io/codecs/csv.ts:23 — the header is
// recovered by a second parse without skip_empty_lines, so a leading blank
// line yields columns [""] while the row parse keys off the real header.
// Every writer keys off spec.columns, so a plain :load → :save of the file
// writes only newlines — total silent data loss.
test('RED-DATA-1: CSV with one leading blank line loads with columns [""] and :save writes only newlines', async () => {
  const p = writeData('blank-lead.csv', '\nName,Amount\nalice,10\nbob,20\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  const out = join(dir, 'blank-lead-out.csv');
  await r.exportAs(out);
  const saved = readFileSync(out, 'utf8');
  assert.ok(
    saved.includes('alice') && saved.includes('Name'),
    `RED-DATA-1 (spec/packages/file-io/formats/csv.md:13-17): a CSV starting with one blank line must load its real header ("blank lines skipped") and a plain load→save must keep the data; instead the saved CSV is ${JSON.stringify(saved)} — every value silently gone`,
  );
  assert.deepEqual(
    r.currentSpec().columns.map((c) => c.id),
    ['Name', 'Amount'],
    'RED-DATA-1 (spec/packages/file-io/formats/csv.md:13-17): columns must be the real header row [Name, Amount]; the header re-parse (csv.ts:23) omits skip_empty_lines and returns [""]',
  );
});

// RED-DATA-2 (major). Cause: `col in row ? row[col] : null` walks the
// prototype chain — csv.ts:29, jsonl.ts:42, engine.ts:81 (applySelect). A row
// that lacks a `toString` key inherits Object.prototype.toString, so the
// saved CSV carries native function source; a select of a column named
// `constructor` that no row has fabricates the Object constructor.
test('RED-DATA-2: `in`-operator prototype leak — a toString column round-trips as native function source; select of `constructor` fabricates a value', async () => {
  // Union-of-keys JSONL: only the first row owns `toString`.
  const p = writeData('tostring.jsonl', '{"a":"1","toString":"T1"}\n{"a":"2"}\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  const out = join(dir, 'tostring-out.csv');
  await r.exportAs(out);
  const saved = readFileSync(out, 'utf8');
  assert.ok(
    !saved.includes('[native code]'),
    `RED-DATA-2 (spec/packages/file-io/formats/csv.md:31, spec/behavior.md:601-602): a row missing the "toString" key must write an empty cell, never Object.prototype.toString's source; saved CSV was ${JSON.stringify(saved)}`,
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
  assert.equal(
    cell,
    null,
    `RED-DATA-2 (spec/behavior.md:601-602): select of a column named "constructor" that no row has must yield null, not an inherited Object.prototype member; got ${String(cell)}`,
  );
});

// RED-DATA-3 (major). Cause: plain-object accumulators assigned by
// data-derived key (engine.ts mutate/pivot paths) — assigning to the key
// "__proto__" on a plain object hits the prototype setter, so the write is
// silently dropped, and a pivot on-value "__proto__" whose cell is an object
// installs that object as the output row's PROTOTYPE.
test('RED-DATA-3: writes to a column named __proto__ are dropped; a __proto__ pivot on-value becomes the output row prototype', async () => {
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
  assert.equal(
    own,
    'X',
    'RED-DATA-3 (unspecified — plainly wrong; engine.ts mutate assignment): a mutate targeting a column named "__proto__" must write an own property "X"; the write was silently dropped by the prototype setter',
  );

  // (b) pivot on-value "__proto__" with an object cell — output rows must
  // keep Object.prototype as their prototype and inherit no data keys.
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
  assert.equal(
    injected,
    undefined,
    `RED-DATA-3 (unspecified — plainly wrong; engine.ts pivot out[onVal] assignment): pivot output rows must have Object.prototype as their prototype; row ${JSON.stringify(injected)} got its pivoted cell's object installed as prototype — it inherits approved=${String((injected as Record<string, unknown> | undefined)?.approved)} although no column carries "approved"`,
  );
});

// RED-DATA-4 (medium). Cause: sql.ts:89-93 — cell values are inlined into
// INSERT ... VALUES literals with only apostrophes doubled; one NUL byte
// terminates the literal inside DuckDB's parser, so EVERY {sql} step fails
// with "unterminated quoted string" attributed to the user's fragment.
test('RED-DATA-4: one NUL byte in any cell makes every {sql} step throw a parser error blamed on the fragment', async () => {
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
  assert.equal(
    err,
    undefined,
    `RED-DATA-4 (spec/code-contract.md:686-700): a valid {sql} fragment must run over rows containing a NUL byte — errors are promised to flow from the FRAGMENT, not from unrelated data; instead the INSERT literal building (sql.ts:89-93) broke every {sql} step with: ${err?.message.split('\n')[0]}`,
  );
});

// RED-DATA-5 (medium). Cause: engine.ts:94-95 — the multi-column mutate
// branch indexes the JS result by column NAME, so an array-returning body
// yields undefined for every target although the spec says that shape works.
test('RED-DATA-5: multi-column mutate with an array-returning {js} body writes undefined to every target', async () => {
  const p = writeData('names.csv', 'name\nJane Doe\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  await r.setSpec({
    table: p,
    columns: [{ id: 'name' }, { id: 'first' }, { id: 'last' }],
    transformations: [
      { kind: 'mutate', columns: ['first', 'last'], value: { js: "row.name.split(' ')" } },
    ],
  });
  const row = r.currentRows()[0]!;
  assert.deepEqual(
    [row.first, row.last],
    ['Jane', 'Doe'],
    'RED-DATA-5 (spec/behavior.md:678-679): "a mutate with columns: string[] and a JS array-returning body already does" — the array result must fill the target columns positionally; every cell came back undefined because the result is indexed by column name (engine.ts:94-95)',
  );
});

// RED-DATA-6 (minor). Cause: jsonl.ts:42 stores an own undefined value and
// JSON.stringify then omits the key — while the CSV save of the same table
// writes the column with an empty cell, so the two save formats disagree
// about one table's schema.
test('RED-DATA-6: a mutate writing undefined saves as a missing JSONL key but an empty CSV cell — the two formats disagree', async () => {
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
    `RED-DATA-6 (spec/packages/file-io/formats/jsonl.md:24-26): the JSONL save must carry the "out" key as null — matching the CSV save of the same table, which writes an empty "out" cell — but the JSONL row omits the key entirely (${line}), so the two save formats describe different schemas for one table`,
  );
});
