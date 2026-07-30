// Transformation semantics the engine must hold whatever the data looks like:
// the sort comparator's total order, the join's column-collision rules and its
// read-once right table, the output-name collisions pivot/unpivot/group can
// derive from data or from a default, and the validate threshold message. These
// used to be the RED-CORE-1/2/3/5/6 bug inventory, now fixed and pinned green.
// Everything runs offline through createHeadlessRunner + loadInput + setSpec
// (deterministic specs, no model calls, no API key). RED-CORE-7's OpenRouter
// cell-model fallback is pinned in cell-model.test.ts, and RED-CORE-4's {sql}
// value normalization in sql-values.test.ts.
import { afterAll, beforeAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { unlinkSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner } from './index.ts';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'transform-semantics-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const writeData = (name: string, content: string) => {
  const p = join(dir, name);
  writeFileSync(p, content);
  return p;
};

// ── Sort: a total order, not a per-pair coercion ─────────────────────────────
// A comparator that answers "equal" for every number-vs-word pair is
// non-transitive, and Array.sort then emits an arbitrary order — numbers
// wrongly ordered among themselves included.

/** The spec's own "numeric-aware" test (spec/code-contract.md § Sorting). */
const numeric = (v: unknown): number | null =>
  typeof v === 'number'
    ? v
    : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))
      ? Number(v)
      : null;

test('sorting a mixed numeric/text column obeys the documented pair rules', async () => {
  const vals: unknown[] = [1, 42, 2, 7, 'pear', 10, 5, 'kiwi', 33, 'apple', 'fig', 'zed'];
  const p = writeData('mixed.jsonl', vals.map((v) => JSON.stringify({ v })).join('\n') + '\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  await r.setSpec({
    table: p,
    columns: [{ id: 'v' }],
    transformations: [{ kind: 'sort', by: [{ key: 'v', dir: 'asc' }] }],
  });
  const out = r.currentRows().map((row) => row.v);
  // Check every pair rule: both-numeric pairs compare by magnitude
  // (behavior.md: "2 comes before 10, never '10' before '2'"), both-text pairs
  // compare as text.
  const violations: string[] = [];
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i];
      const b = out[j];
      const an = numeric(a);
      const bn = numeric(b);
      if (an !== null && bn !== null) {
        if (an > bn) violations.push(`${String(a)} before ${String(b)}`);
      } else if (an === null && bn === null) {
        if (String(a) > String(b)) violations.push(`${String(a)} before ${String(b)}`);
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `numeric pairs must order by magnitude and text pairs as text in EVERY output pair; sorting ${JSON.stringify(vals)} asc produced ${JSON.stringify(out)}. Violating pairs: ${violations.join(', ')}`,
  );
});

test('ascending sort puts every number ahead of every word', async () => {
  const p = writeData('mixed2.jsonl', '{"v":"pear"}\n{"v":10}\n{"v":"apple"}\n{"v":2}\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  await r.setSpec({
    table: p,
    columns: [{ id: 'v' }],
    transformations: [{ kind: 'sort', by: [{ key: 'v', dir: 'asc' }] }],
  });
  assert.deepEqual(
    r.currentRows().map((row) => row.v),
    [2, 10, 'apple', 'pear'],
    'the three value classes rank number < text < empty (spec/behavior.md § Sorting), so "sort by X" on a mixed column reads numbers-by-magnitude first, then the words as text',
  );
});

test('a null between two strings still leaves the strings sorted', async () => {
  const p = writeData('nulls.jsonl', '{"v":"b"}\n{"v":null}\n{"v":"a"}\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  await r.setSpec({
    table: p,
    columns: [{ id: 'v' }],
    transformations: [{ kind: 'sort', by: [{ key: 'v', dir: 'asc' }] }],
  });
  const out = r.currentRows().map((row) => row.v);
  assert.ok(
    out.indexOf('a') < out.indexOf('b'),
    `ascending sort must put "a" before "b" whatever nulls sit nearby; sorting ["b", null, "a"] produced ${JSON.stringify(out)}`,
  );
  assert.equal(out[out.length - 1], null, 'empty cells sort last in ascending order');
});

// ── Join: collision renaming and the read-once right table ───────────────────

test("a join rename target avoids the right table's own <name>_2 column", async () => {
  const left = writeData('j2-left.csv', 'id,code\n1,LC1\n');
  const right = writeData('j2-right.csv', 'id,code,code_2\n1,RC1,RC2\n');
  const r = createHeadlessRunner({});
  await r.loadInput(left);
  await r.setSpec({
    table: left,
    columns: [{ id: 'id' }, { id: 'code' }],
    transformations: [{ kind: 'join', with: right, on: { js: 'leftRow.id === rightRow.id' } }],
  });
  const row = r.currentRows()[0]!;
  const values = Object.values(row);
  assert.ok(
    values.includes('RC1') && values.includes('RC2'),
    `collision rename must pick a FREE name ("so no column silently overwrites another", spec/behavior.md § join) — right "code" (RC1) and right "code_2" (RC2) must both survive the join; got row ${JSON.stringify(row)}`,
  );
});

test('a join derives its left columns from every row, not just the first', async () => {
  const left = writeData('j2-left.jsonl', '{"id":1}\n{"id":2,"note":"LEFT-note-must-survive"}\n');
  const right = writeData('j2-right2.csv', 'id,note\n1,right-note-1\n2,right-note-2\n');
  const r = createHeadlessRunner({});
  await r.loadInput(left);
  await r.setSpec({
    table: left,
    columns: [{ id: 'id' }, { id: 'note' }],
    transformations: [
      { kind: 'join', with: right, on: { js: 'String(leftRow.id) === String(rightRow.id)' } },
    ],
  });
  const row2 = r.currentRows().find((row) => String(row.id) === '2');
  assert.equal(
    row2?.note,
    'LEFT-note-must-survive',
    `"note" is a left column (spec columns; present on row 2), so the right "note" must be renamed note_2 rather than overwrite it; got ${JSON.stringify(row2)}`,
  );
});

test("undo of an unrelated later step does not re-read the join's right table", async () => {
  const left = writeData('j3-left.csv', 'id,name\n1,ann\n2,bob\n');
  const right = writeData('j3-right.csv', 'id,city\n1,Oslo\n2,Rome\n');
  const r = createHeadlessRunner({});
  await r.loadInput(left);
  const base = { table: left, columns: [{ id: 'id' }, { id: 'name' }] };
  const joinT = { kind: 'join', with: right, on: { js: 'leftRow.id === rightRow.id' } } as const;
  const filterT = { kind: 'filter', pred: { js: "row.id === '1'" } } as const;

  // Turn 1: join. Turn 2: join + filter — exactly how two committed turns
  // leave the journal; prevSpec is what cli/session.ts hands to setSpec on
  // :undo of the filter.
  await r.setSpec({ ...base, transformations: [joinT] });
  const prevSpec = structuredClone(r.currentSpec());
  const rowsAfterTurn1 = structuredClone(r.currentRows());
  await r.setSpec({ ...base, transformations: [joinT, filterT] });

  // The right file moves away — the join itself is NOT being undone.
  unlinkSync(right);
  let err: Error | undefined;
  try {
    await r.setSpec(prevSpec);
  } catch (e) {
    err = e as Error;
  }
  assert.equal(
    err,
    undefined,
    `spec/behavior.md § join: "A join's right table is *not* re-read on :undo/:redo" — undoing the FILTER must not touch ${right}: ${err?.message.split('\n')[0]}`,
  );
  assert.deepEqual(
    r.currentRows(),
    rowsAfterTurn1,
    'after undoing the filter, the rows must be exactly the rows the join produced before the filter was added',
  );
});

// ── Reshaping steps: a derived output name never overwrites a key column ─────

test('a pivot on-VALUE equal to an index column name keeps the index values', async () => {
  const p = writeData('p5.csv', 'region,metric,amount\nnorth,sales,10\nnorth,region,99\nsouth,sales,20\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  await r.setSpec({
    table: p,
    columns: [{ id: 'region' }, { id: 'metric' }, { id: 'amount' }],
    transformations: [{ kind: 'pivot', index: ['region'], on: 'metric', values: 'amount' }],
  });
  const regions = r.currentRows().map((row) => row.region);
  assert.deepEqual(
    regions,
    ['north', 'south'],
    `pivot output rows are "keyed by the index tuple" (spec/behavior.md § pivot) — the region keys north/south must survive a metric value that happens to equal "region"; got region column ${JSON.stringify(regions)} (rows ${JSON.stringify(r.currentRows())})`,
  );
});

test('the unpivot names_to default keeps an id column named "name"', async () => {
  const p = writeData('u5.jsonl', '{"name":"alice","q1":1,"q2":2}\n{"name":"bob","q1":3,"q2":4}\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  await r.setSpec({
    table: p,
    columns: [{ id: 'name' }, { id: 'q1' }, { id: 'q2' }],
    transformations: [{ kind: 'unpivot', id: ['name'], measures: ['q1', 'q2'] }],
  });
  const rows = r.currentRows();
  const values = rows.flatMap((row) => Object.values(row));
  assert.ok(
    values.includes('alice') && values.includes('bob'),
    `unpivot output columns are "id + [names_to, values_to]" (spec/behavior.md § unpivot) — the id values alice/bob must survive the names_to default "name"; got rows ${JSON.stringify(rows)}`,
  );
});

test('a group aggregate named like a by column keeps the group key', async () => {
  const p = writeData('g5.csv', 'cat\na\na\nb\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  await r.setSpec({
    table: p,
    columns: [{ id: 'cat' }],
    transformations: [{ kind: 'group', by: ['cat'], agg: { cat: { js: 'rows.length' } } }],
  });
  const rows = r.currentRows();
  const values = rows.flatMap((row) => Object.values(row));
  assert.ok(
    values.includes('a') && values.includes('b'),
    `group emits "one output row per distinct by-value tuple" and the by-keys survive into the output (spec/behavior.md § group) — the keys a/b must not vanish when an agg column shares the by name; got rows ${JSON.stringify(rows)}`,
  );
});

// Used to be RED-HL-5: both compile paths bound only `rows`, so an aggregate
// referencing the group key threw "key is not defined".
test('a JS group aggregate binds the contracted (rows, key, allGroups) signature', async () => {
  const p = writeData('agg-args.csv', 'c,n\nx,1\nx,2\ny,3\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  let err: Error | undefined;
  try {
    await r.setSpec({
      table: p,
      columns: [{ id: 'c' }, { id: 'k' }, { id: 'share' }],
      transformations: [
        {
          kind: 'group',
          by: ['c'],
          agg: {
            k: { js: 'rows.length + " in " + key' },
            share: { js: 'rows.length / allGroups.reduce((a, g) => a + g.rows.length, 0)' },
          },
        },
      ],
    });
  } catch (e) {
    err = e as Error;
  }
  assert.equal(
    err,
    undefined,
    `spec/code-contract.md § group: agg JS expressions are contracted as "(rows, key, allGroups) => …"; an aggregate reading the key threw: ${err?.message}`,
  );
  assert.deepEqual(
    r.currentRows().map((row) => row.k),
    ['2 in x', '1 in y'],
    'the group key is bound as `key` inside a JS aggregate',
  );
  assert.deepEqual(
    r.currentRows().map((row) => row.share),
    [2 / 3, 1 / 3],
    '`allGroups` reaches every group as { key, rows }, so an aggregate can compute a share of the whole table',
  );
});

// ── Validate: the threshold message states a true inequality ─────────────────

test('the validate threshold error states a true inequality', async () => {
  // 49 rows, 10 failures: rate 20.4% > threshold 20% — aborts, correctly.
  const p = writeData(
    'v6.csv',
    'v\n' + Array.from({ length: 49 }, (_, i) => (i < 10 ? '0' : '1')).join('\n') + '\n',
  );
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  let err: Error | undefined;
  try {
    await r.setSpec({
      table: p,
      columns: [{ id: 'v' }],
      transformations: [{ kind: 'validate', pred: { js: "row.v === '1'" }, threshold: 0.2 }],
    });
  } catch (e) {
    err = e as Error;
  }
  assert.ok(err, 'precondition: a 20.4% failure rate over a 20% threshold must abort the request');
  const m = /validation failed: ([\d.]+)% > ([\d.]+)%/.exec(err!.message);
  assert.ok(m, `the message matches the spec format; got ${JSON.stringify(err!.message)}`);
  assert.ok(
    Number(m![1]) > Number(m![2]),
    `the abort message "validation failed: <rate>% > <threshold>%" must state a TRUE inequality — the same string feeds the recovery model; got "${err!.message}"`,
  );
});
