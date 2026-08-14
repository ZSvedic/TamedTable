// Codec edge cases: formats & data-integrity regressions that used to be the
// RED-FIO-2..6/8 bug inventory, now fixed and pinned green. Each test asserts
// the spec-correct behavior for a hostile-but-real input the codecs previously
// mishandled (typed Parquet, quoted-newline headers, CR round-trips, non-object
// JSONL lines, `__proto__` columns, zero-column Parquet).
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { csvCodec } from './csv.ts';
import { jsonlCodec } from './jsonl.ts';
import { parquetCodec } from './parquet.ts';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

test('typed Parquet (DATE/TIMESTAMP/DECIMAL) loads as plain scalar cells and stays saveable', async () => {
  // Build a typed parquet file at test time, no committed binary fixture.
  const { DuckDBInstance } = await import('@duckdb/node-api');
  const dir = await mkdtemp(join(tmpdir(), 'fio-typed-'));
  const path = join(dir, 'typed.parquet');
  const instance = await DuckDBInstance.create(':memory:');
  const conn = await instance.connect();
  await conn.run(
    `COPY (SELECT DATE '2024-01-15' AS d,
                  TIMESTAMP '2024-01-15 10:30:00' AS ts,
                  CAST(1.50 AS DECIMAL(10,2)) AS dec,
                  42 AS n, 'hello' AS s)
     TO '${path}' (FORMAT PARQUET)`,
  );
  const bytes = new Uint8Array(await readFile(path));

  const { rows, columns } = await parquetCodec.parse(bytes, 'typed.parquet');
  let saveError: Error | undefined;
  try {
    await csvCodec.serialize(rows, columns);
  } catch (e) {
    saveError = e as Error;
  }
  assert.equal(saveError, undefined, `a loaded typed Parquet table must be saveable, but CSV serialize threw: ${saveError?.message}`);
  const wrapperCells = Object.entries(rows[0] as Record<string, unknown>)
    .filter(([, v]) => v !== null && typeof v === 'object')
    .map(([k]) => k);
  assert.deepEqual(wrapperCells, [], 'DATE/TIMESTAMP/DECIMAL cells must normalize to plain scalars, not DuckDB wrapper objects');
});

test('a quoted newline in a CSV header is valid RFC 4180, parsed as the column list', async () => {
  const { columns } = await csvCodec.parse(enc('"first\nname",age\nAda,36\n'), 't.csv');
  assert.deepEqual(columns, ['first\nname', 'age'], 'the header record spans a quoted newline and must parse as the column list');
});

test('a CSV value ending in CR survives save-then-load, and CR-bearing fields are quoted', async () => {
  const out = dec(await csvCodec.serialize([{ a: 'x\r' }], ['a']));
  const back = await csvCodec.parse(enc(out), 't.csv');
  assert.equal(back.rows[0]?.a, 'x\r', `trailing \\r must survive the CSV round-trip: serialized ${JSON.stringify(out)}, reparsed ${JSON.stringify(back.rows[0])}`);
  const quoted = dec(await csvCodec.serialize([{ a: 'x\ry' }], ['a']));
  assert.ok(quoted.includes('"x\ry"'), `RFC 4180 TEXTDATA excludes CR, so a CR-bearing field must be double-quoted; got ${JSON.stringify(quoted)}`);
});

test('JSONL non-object lines produce a clear file:line error, not a raw TypeError or garbage rows', async () => {
  let nullErr: Error | undefined;
  try {
    await jsonlCodec.parse(enc('{"a":1}\nnull\n'), 't.jsonl');
  } catch (e) {
    nullErr = e as Error;
  }
  assert.ok(nullErr !== undefined && nullErr.message.includes('t.jsonl:2'), `a "null" line must be rejected with the "<name>:<lineNumber> ..." shape; got: ${nullErr ? JSON.stringify(nullErr.message) : 'no error'}`);
  let arrayErr: unknown;
  try {
    await jsonlCodec.parse(enc('[1,2]\n'), 't.jsonl');
  } catch (e) {
    arrayErr = e;
  }
  assert.ok(arrayErr !== undefined, 'an array line [1,2] must be rejected with a clear error, not silently loaded as a garbage row');
});

test('a __proto__ column survives JSONL serialize and CSV parse', async () => {
  const parsed = await jsonlCodec.parse(enc('{"__proto__":"x","b":"y"}\n'), 't.jsonl');
  const out = dec(await jsonlCodec.serialize(parsed.rows, parsed.columns));
  assert.equal(out, '{"__proto__":"x","b":"y"}\n', 'serialize must emit every listed column. The __proto__ column and its value must not vanish');
  const r = await csvCodec.parse(enc('__proto__,b\nx,y\n'), 't.csv');
  const cell = Object.getOwnPropertyDescriptor(r.rows[0] ?? {}, '__proto__')?.value;
  assert.equal(cell, 'x', 'a column listed in the header must carry its cell values: even __proto__');
});

test('saving a zero-column table as Parquet fails with a clean message, not raw DuckDB internals', async () => {
  let err: Error | undefined;
  try {
    await parquetCodec.serialize([], []);
  } catch (e) {
    err = e as Error;
  }
  if (err) {
    assert.ok(
      !/Parser Error/i.test(err.message) && !err.message.includes('must have at least one column'),
      `empty-table Parquet save must fail with a clean, actionable message (or succeed), not leak DuckDB internals: ${JSON.stringify(err.message)}`,
    );
  }
});
