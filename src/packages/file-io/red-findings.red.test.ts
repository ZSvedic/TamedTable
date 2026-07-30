// Red unit tests — file-io codec bug inventory (RED-FIO-2..6, RED-FIO-8).
// Every test here documents one confirmed open defect and FAILS by design:
// each assertion states the SPEC-CORRECT behavior and its message names the
// defect. Excluded from `bun test` by bunfig pathIgnorePatterns; run with
// `bun run test:red:unit`. Surface-reachable file-io defects (RED-FIO-1,
// RED-FIO-7) live in spec/test-cases/red/red-fio.feature instead.
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { csvCodec } from './codecs/csv.ts';
import { jsonlCodec } from './codecs/jsonl.ts';
import { parquetCodec } from './codecs/parquet.ts';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

test('RED-FIO-2: typed Parquet (DATE/TIMESTAMP/DECIMAL) must load as plain scalar cells and stay saveable', async () => {
  // Build a typed parquet file at test time — no committed binary fixture.
  const { DuckDBInstance } = await import('@duckdb/node-api');
  const dir = await mkdtemp(join(tmpdir(), 'red-fio-'));
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
  assert.equal(
    saveError,
    undefined,
    `RED-FIO-2 (spec/packages/file-io/formats/parquet.md:29-33; codecs/values.ts:9): a loaded typed Parquet table must be saveable, but CSV serialize threw: ${saveError?.message}`,
  );
  const wrapperCells = Object.entries(rows[0] as Record<string, unknown>)
    .filter(([, v]) => v !== null && typeof v === 'object')
    .map(([k]) => k);
  assert.deepEqual(
    wrapperCells,
    [],
    'RED-FIO-2 (codecs/values.ts:9): DATE/TIMESTAMP/DECIMAL cells must normalize to plain scalars; these columns loaded as DuckDB wrapper objects (render as [object Object] and crash every save)',
  );
});

test('RED-FIO-3: a quoted newline in a CSV header is valid RFC 4180, not "has no header row"', async () => {
  const { columns } = await csvCodec.parse(enc('"first\nname",age\nAda,36\n'), 't.csv');
  assert.deepEqual(
    columns,
    ['first\nname', 'age'],
    'RED-FIO-3 (spec/packages/file-io/formats/csv.md:12-14; codecs/csv.ts:23): the header record spans a quoted newline and must parse as the column list — the to_line:1 re-parse truncates it mid-record, so parseTable falsely reports "has no header row"',
  );
});

test('RED-FIO-4: a CSV value ending in CR must survive save-then-load, and CR-bearing fields must be quoted', async () => {
  const out = dec(await csvCodec.serialize([{ a: 'x\r' }], ['a']));
  const back = await csvCodec.parse(enc(out), 't.csv');
  assert.equal(
    back.rows[0]?.a,
    'x\r',
    `RED-FIO-4 (spec/behavior.md:605-607; codecs/csv.ts:32): trailing \\r is silently lost on the app's own CSV round-trip — serialized ${JSON.stringify(out)}, reparsed row ${JSON.stringify(back.rows[0])}`,
  );
  const quoted = dec(await csvCodec.serialize([{ a: 'x\ry' }], ['a']));
  assert.ok(
    quoted.includes('"x\ry"'),
    `RED-FIO-4 (spec/behavior.md:605-607): RFC 4180 TEXTDATA excludes CR, so a CR-bearing field must be double-quoted; got unquoted output ${JSON.stringify(quoted)}`,
  );
});

test('RED-FIO-5: JSONL non-object lines must produce a clear file:line error, not a raw TypeError or garbage rows', async () => {
  let nullErr: Error | undefined;
  try {
    await jsonlCodec.parse(enc('{"a":1}\nnull\n'), 't.jsonl');
  } catch (e) {
    nullErr = e as Error;
  }
  assert.ok(
    nullErr !== undefined && nullErr.message.includes('t.jsonl:2'),
    `RED-FIO-5 (spec/packages/file-io/formats/jsonl.md:10-14; codecs/jsonl.ts:19): a "null" line must be rejected with the spec'd "<name>:<lineNumber> ..." shape; got: ${nullErr ? JSON.stringify(nullErr.message) : 'no error'} (a raw TypeError naming neither file nor line)`,
  );
  let arrayErr: unknown;
  let arrayResult: { rows: unknown[]; columns: string[] } | undefined;
  try {
    arrayResult = await jsonlCodec.parse(enc('[1,2]\n'), 't.jsonl');
  } catch (e) {
    arrayErr = e;
  }
  assert.ok(
    arrayErr !== undefined,
    `RED-FIO-5 (codecs/jsonl.ts:19): an array line [1,2] must be rejected with a clear error, not silently loaded as a garbage row — got rows ${JSON.stringify(arrayResult?.rows)} with columns ${JSON.stringify(arrayResult?.columns)}`,
  );
});

test('RED-FIO-6: a __proto__ column must survive JSONL serialize and CSV parse', async () => {
  // 6a — JSONL serialize drops the column (codecs/jsonl.ts:42 plain assignment
  // hits the prototype setter instead of creating an own property).
  const parsed = await jsonlCodec.parse(enc('{"__proto__":"x","b":"y"}\n'), 't.jsonl');
  const out = dec(await jsonlCodec.serialize(parsed.rows, parsed.columns));
  assert.equal(
    out,
    '{"__proto__":"x","b":"y"}\n',
    'RED-FIO-6a (spec/packages/file-io/formats/jsonl.md:22-28; codecs/jsonl.ts:42): serialize must emit every listed column — the __proto__ column and its value vanish from the output',
  );
  // 6b — CSV parse swallows the cell values (codecs/csv.ts:22, same mechanism
  // inside csv-parse's row building).
  const r = await csvCodec.parse(enc('__proto__,b\nx,y\n'), 't.csv');
  const cell = Object.getOwnPropertyDescriptor(r.rows[0] ?? {}, '__proto__')?.value;
  assert.equal(
    cell,
    'x',
    'RED-FIO-6b (spec/packages/file-io/formats/csv.md:12-13; codecs/csv.ts:22): a column listed in the header must carry its cell values — __proto__ cells are unrecoverable on every row',
  );
});

test('RED-FIO-8: saving a zero-column table as Parquet must not surface raw DuckDB parser internals', async () => {
  let err: Error | undefined;
  try {
    await parquetCodec.serialize([], []);
  } catch (e) {
    err = e as Error;
  }
  if (err) {
    assert.ok(
      !/Parser Error/i.test(err.message) && !err.message.includes('must have at least one column'),
      `RED-FIO-8 (codecs/parquet-engine.ts:75; spec/behavior.md save path promises messages "the host can show as-is"): empty-table Parquet save leaks a raw DuckDB message: ${JSON.stringify(err.message)} — it must either succeed (Arrow round-trips zero columns) or fail with a clean, actionable message`,
    );
  }
});
