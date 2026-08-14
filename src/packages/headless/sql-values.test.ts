// {sql} value normalization: a regression that used to be RED-CORE-4, now
// fixed and pinned green. A {sql} step producing a DuckDB DATE/TIMESTAMP/DECIMAL
// wrapper (e.g. via try_strptime, which the engine's recovery guidance steers
// the model toward) must commit as a plain scalar so every save format works.
// Runs offline through createHeadlessRunner + loadInput + setSpec.
import { afterAll, beforeAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner } from './index.ts';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'sql-values-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

test('{sql} try_strptime commits a plain scalar and every save format works', async () => {
  const p = join(dir, 'sql.jsonl');
  writeFileSync(p, '{"d":"15/01/2024"}\n{"d":"20/02/2024"}\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  // The exact shape the engine's own recovery guidance steers the model toward.
  await r.setSpec({
    table: p,
    columns: [{ id: 'd' }],
    transformations: [{ kind: 'mutate', columns: 'ts', value: { sql: "try_strptime(d, ['%d/%m/%Y'])" } }],
  });
  const cell = r.currentRows()[0]!.ts;
  const plain = cell === null || ['string', 'number', 'boolean'].includes(typeof cell);
  assert.ok(
    plain,
    `a {sql} timestamp cell must commit as a plain scalar; got ${Object.prototype.toString.call(cell)} (${(cell as object)?.constructor?.name})`,
  );
  let err: Error | undefined;
  try {
    await r.exportAs(join(dir, 'sql-out.jsonl'));
  } catch (e) {
    err = e as Error;
  }
  assert.equal(err, undefined, `after the commit succeeded, :save must work; instead it threw: ${err?.message.split('\n')[0]}`);
});
