// RED-CORE-1..7 — red unit tests (bug inventory) for the core runner: sort
// comparator, join collision-rename, join re-read on undo, {sql} value
// normalization, pivot/unpivot/group output-column collisions, the validate
// threshold message, and the OpenRouter cell-model fallback. Everything runs
// offline through createHeadlessRunner + loadInput + setSpec (deterministic
// specs, no model calls, no API key). Each test asserts the SPEC-CORRECT
// behavior and fails on current code; the assertion message names the defect.
//
// Excluded from plain `bun test` by bunfig [test] pathIgnorePatterns; run via
// `bun run test:red:unit`.
import { afterAll, beforeAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { unlinkSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner, resolveCellModelId } from './index.ts';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'red-core-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const writeData = (name: string, content: string) => {
  const p = join(dir, name);
  writeFileSync(p, content);
  return p;
};

// ── RED-CORE-1 ───────────────────────────────────────────────────────────────
// Cause: headless/index.ts:1301-1320 (applySortT) — when asNumber succeeds for
// only one side, `av < bv` / `av > bv` on number-vs-string (or null) are both
// false via NaN coercion, so the comparator returns 0; a non-transitive
// comparator makes Array.sort emit an arbitrary order.

/** True when the value is a number or a numeric string — the spec's own
 *  "numeric-aware" test (spec/code-contract.md:1149-1152). */
const numeric = (v: unknown): number | null =>
  typeof v === 'number'
    ? v
    : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))
      ? Number(v)
      : null;

test('RED-CORE-1: sorting a mixed numeric/text column emits an order that violates the documented pair rules', async () => {
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
  // Check every UNCONTESTED pair rule: both-numeric pairs compare by magnitude
  // (behavior.md: "2 comes before 10, never '10' before '2'"), both-text pairs
  // compare as text. Mixed number-vs-word pairs are left out of the check.
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
    `RED-CORE-1 (spec/behavior.md:1882-1885): numeric pairs must order by magnitude and text pairs as text in EVERY output pair; sorting ${JSON.stringify(vals)} asc produced ${JSON.stringify(out)} — the one-sided-numeric comparator (index.ts:1301-1320) returns 0 for number-vs-word pairs, making Array.sort non-transitive. Violating pairs: ${violations.join(', ')}`,
  );
});

test('RED-CORE-1: a null between two strings leaves the strings unsorted', async () => {
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
    `RED-CORE-1 (spec/behavior.md:1882-1885): ascending sort must put "a" before "b" whatever nulls sit nearby; sorting ["b", null, "a"] produced ${JSON.stringify(out)} — null-vs-string pairs return 0 (index.ts:1301-1320), so the comparator never moves "a" past null`,
  );
});

// ── RED-CORE-2 ───────────────────────────────────────────────────────────────
// Cause: headless/engine.ts:323-332 (applyJoin) — the `<name>_2` rename target
// is probed only against LEFT columns, never against the right table's own
// columns, and leftCols is built from Object.keys(rows[0]) only.

test('RED-CORE-2: join rename target collides with the right table\'s real <name>_2 column — right values lost', async () => {
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
    `RED-CORE-2 (spec/behavior.md:649-651): collision rename must pick a FREE name ("so no column silently overwrites another") — right "code" (RC1) and right "code_2" (RC2) must both survive the join; got row ${JSON.stringify(row)} — right "code" was renamed to "code_2" without checking the right table's own columns (engine.ts:323-332), so the real code_2 overwrote it`,
  );
});

test('RED-CORE-2: join collision set derived from the first left row only — sparse JSONL left column silently overwritten', async () => {
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
    `RED-CORE-2 (spec/behavior.md:649-651): "note" is a left column (spec columns; present on row 2), so the right "note" must be renamed note_2 — instead the collision set comes from Object.keys(rows[0]) only (engine.ts:323), and the right table overwrote left row 2's note: ${JSON.stringify(row2)}`,
  );
});

// ── RED-CORE-3 ───────────────────────────────────────────────────────────────
// Cause: headless/index.ts:1210-1216 — the prefix cache requires
// next.length >= prev.length, so ANY undo (shrinking list) replays from
// source, and applyJoin (engine.ts:314-320) re-reads t.with from disk.

test('RED-CORE-3: undo of an unrelated later step re-reads the join\'s right table — throws when the file is gone', async () => {
  const left = writeData('j3-left.csv', 'id,name\n1,ann\n2,bob\n');
  const right = writeData('j3-right.csv', 'id,city\n1,Oslo\n2,Rome\n');
  const r = createHeadlessRunner({});
  await r.loadInput(left);
  const base = { table: left, columns: [{ id: 'id' }, { id: 'name' }] };
  const joinT = { kind: 'join', with: right, on: { js: 'leftRow.id === rightRow.id' } } as const;
  const filterT = { kind: 'filter', pred: { js: "row.id === '1'" } } as const;

  // Turn 1: join. Turn 2: join + filter — exactly how two committed turns
  // leave the journal; prevSpec is what cli/session.ts:356 hands to setSpec
  // on :undo of the filter.
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
    `RED-CORE-3 (spec/behavior.md:653-655): "A join's right table is *not* re-read on :undo/:redo" — undoing the FILTER must not touch ${right}; instead the shrinking spec disables the prefix cache (index.ts:1210-1216) and applyJoin re-reads from disk: ${err?.message.split('\n')[0]}`,
  );
  assert.deepEqual(
    r.currentRows(),
    rowsAfterTurn1,
    'RED-CORE-3 (spec/behavior.md:653-655): after undoing the filter, the rows must be exactly the rows the join produced before the filter was added',
  );
});

// ── RED-CORE-4 ───────────────────────────────────────────────────────────────
// Cause: headless/sql.ts:20-25 — normalizeSqlValue unwraps only top-level
// bigints; DuckDBTimestampValue (bigint micros inside), DuckDBDateValue,
// DuckDBListValue pass through into committed rows. Related to RED-FIO-2
// (same wrapper leak on the Parquet LOAD path in file-io values.ts); this is
// the {sql} MUTATE path.

test('RED-CORE-4: {sql} try_strptime commits DuckDB wrapper objects, then every save format crashes on BigInt', async () => {
  const p = writeData('sql.jsonl', '{"d":"15/01/2024"}\n{"d":"20/02/2024"}\n');
  const r = createHeadlessRunner({});
  await r.loadInput(p);
  // The exact shape the engine's own RECOVERY_GUIDANCE (index.ts:462-467)
  // steers the model toward: try_strptime(col, [fmt, ...]).
  await r.setSpec({
    table: p,
    columns: [{ id: 'd' }],
    transformations: [{ kind: 'mutate', columns: 'ts', value: { sql: "try_strptime(d, ['%d/%m/%Y'])" } }],
  });
  const cell = r.currentRows()[0]!.ts;
  const plain =
    cell === null || ['string', 'number', 'boolean'].includes(typeof cell);
  assert.ok(
    plain,
    `RED-CORE-4 (spec/code-contract.md {sql}: a scalar subquery whose values flow to the table like any cell; related to RED-FIO-2 — same wrapper leak on the Parquet load path): a {sql} timestamp cell must commit as a plain scalar; got ${Object.prototype.toString.call(cell)} (${(cell as object)?.constructor?.name}) with a BigInt inside — normalizeSqlValue (sql.ts:20-25) unwraps only top-level bigints`,
  );
  let err: Error | undefined;
  try {
    await r.exportAs(join(dir, 'sql-out.jsonl'));
  } catch (e) {
    err = e as Error;
  }
  assert.equal(
    err,
    undefined,
    `RED-CORE-4 (spec/code-contract.md {sql}; related to RED-FIO-2): after the commit SUCCEEDED, :save must work — instead every save format dies on the leaked wrapper: ${err?.message.split('\n')[0]}`,
  );
});

// ── RED-CORE-5 ───────────────────────────────────────────────────────────────
// Cause: headless/engine.ts:276-299 — applyPivot writes out[onVal] over
// out[indexCol]; applyUnpivot writes r[namesTo] over r[idCol]; applyGroupJs
// (engine.ts:155-160) writes out[aggCol] over out[byName].

test('RED-CORE-5a: pivot on-VALUE equal to an index column name destroys the index values', async () => {
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
    `RED-CORE-5a (spec/behavior.md:733-739): pivot output rows are "keyed by the index tuple" — the region keys north/south must survive a metric value that happens to equal "region"; got region column ${JSON.stringify(regions)} (rows ${JSON.stringify(r.currentRows())}) — out[onVal] overwrote out[indexCol] (engine.ts:276-285), and the row WITHOUT that metric got null`,
  );
});

test('RED-CORE-5b: unpivot default names_to "name" destroys an id column named "name"', async () => {
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
    `RED-CORE-5b (spec/behavior.md:741-746): unpivot output columns are "id + [names_to, values_to]" — the id values alice/bob must survive the names_to default "name"; got rows ${JSON.stringify(rows)} — r[namesTo] overwrote r[idCol] (engine.ts:292-299)`,
  );
});

test('RED-CORE-5c: group aggregate output named like a by column overwrites the group key', async () => {
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
    `RED-CORE-5c (spec/behavior.md:616-620): group emits "one output row per distinct by-value tuple" and the by-keys survive into the output — the keys a/b must not vanish when an agg column shares the by name; got rows ${JSON.stringify(rows)} — out[aggCol] overwrote out[byName] (engine.ts:155-160)`,
  );
});

// ── RED-CORE-6 ───────────────────────────────────────────────────────────────
// Cause: headless/engine.ts:116-118 — both sides of the threshold message are
// rendered with (x * 100).toFixed(0), so a 20.4% rate over a 20% threshold
// prints the false inequality "20% > 20%".

test('RED-CORE-6: validate threshold error prints the false inequality "20% > 20%"', async () => {
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
  assert.ok(m, `precondition: message matches the spec format; got ${JSON.stringify(err!.message)}`);
  assert.ok(
    Number(m![1]) > Number(m![2]),
    `RED-CORE-6 (spec/behavior.md:695-697): the abort message "validation failed: <rate>% > <threshold>%" must state a TRUE inequality (the same string feeds the recovery model); got "${err!.message}" — both sides are rounded with toFixed(0) (engine.ts:116-118)`,
  );
});

// ── RED-CORE-7 ───────────────────────────────────────────────────────────────
// Cause: headless/index.ts:274 — PROVIDER_CELL_FALLBACKS.openrouter is
// 'meta-llama/llama-3.3-70b-instruct:free', which is not in the model-config
// catalogue and contradicts the contract; contract and models.json agree on
// cohere/north-mini-code:free (same-commit drift, code is the odd one out).

test('RED-CORE-7: OpenRouter cell-model fallback is an un-catalogued model instead of the contract\'s cohere/north-mini-code:free', () => {
  const got = resolveCellModelId('qwen/qwen3-coder:free');
  assert.equal(
    got,
    'cohere/north-mini-code:free',
    `RED-CORE-7 (spec/code-contract.md:333 + model-config models.json openrouter secondary): a cross-provider cell model on an OpenRouter main must coerce to the provider text default cohere/north-mini-code:free; got ${got} (index.ts:274) — a model absent from the catalogue entirely`,
  );
});
