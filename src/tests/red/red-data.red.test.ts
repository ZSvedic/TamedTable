// RED-DATA-5 — red unit test (bug inventory): hostile-but-real data driven
// through the engine offline (loadInput → setSpec with a deterministic spec;
// no model calls, no API key). Asserts the SPEC-CORRECT behavior and fails on
// current code; the assertion message names the defect. The former RED-DATA-1,
// 2, 3, 4, and 6 in this file were fixed and moved to the green suite
// (src/tests/data-integrity.test.ts).
//
// Cross-package repro (headless engine), so it lives in src/tests/red/ per the
// red-test conventions. Excluded from plain `bun test` by bunfig [test]
// pathIgnorePatterns; run via `bun run test:red:unit`.
import { afterAll, beforeAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
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
