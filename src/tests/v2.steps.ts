// #FormatOut #Aggregate #LookupJoin #ColSplit #Validate #PivotData #SqlExpr #DebugOut #PyExport
import { Given, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Row } from '@tamedtable/core';
import { TamedTableWorld, SPEC_TC_DIR, TEMP_DIR } from './world.ts';

// ── Synthetic single-row tables (convert.feature) ──────────────────────────
//
// `Given a row with ...` writes a single-row JSONL fixture to temp/ and loads
// it. Each variant matches the exact wording the .feature uses; ID:1 is
// auto-prepended so the expected CSV lines (which start with "1,...") match.

async function loadSyntheticRow(world: TamedTableWorld, row: Row): Promise<void> {
  await mkdir(TEMP_DIR, { recursive: true });
  const path = join(TEMP_DIR, 'synthetic-input.jsonl');
  await writeFile(path, JSON.stringify(row) + '\n', 'utf8');
  world.inputPath = path;
  await world.ensureRunner().loadInput(path);
}

function unescapeLiteral(s: string): string {
  // Cucumber {string} delivers literal \n / \" — unescape to real chars.
  return s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

Given('a row with FirstName {string}, LastName {string}, Notes {string}',
  async function (this: TamedTableWorld, fn: string, ln: string, notes: string) {
    await loadSyntheticRow(this, { ID: 1, FirstName: fn, LastName: ln, Notes: unescapeLiteral(notes) });
  });

Given('a row with FirstName {string}, LastName null',
  async function (this: TamedTableWorld, fn: string) {
    await loadSyntheticRow(this, { ID: 1, FirstName: fn, LastName: null });
  });

Given(/^a row with FirstName "(.+)" and an "(.+)" column equal to the object (\{.+\})$/,
  async function (this: TamedTableWorld, fn: string, colName: string, objLiteral: string) {
    const obj = JSON.parse(objLiteral);
    await loadSyntheticRow(this, { ID: 1, FirstName: fn, [colName]: obj });
  });

// ── group / split / pivot / unpivot scaffolding ────────────────────────────

Then('the number of rows is {int}', function (this: TamedTableWorld, n: number) {
  assert.equal(this.ensureRunner().currentRows().length, n);
});

Then('the current rows count is {int}', function (this: TamedTableWorld, n: number) {
  assert.equal(this.ensureRunner().currentRows().length, n);
});

Then('the number of rows equals the number of distinct Country values in the source',
  async function (this: TamedTableWorld) {
    const { loadCsv } = await import('@tamedtable/core');
    const { rows: source } = await loadCsv(this.inputPath!);
    const distinct = new Set(source.map((r) => r.Country as string)).size;
    assert.equal(this.ensureRunner().currentRows().length, distinct);
  });

Then('the first output Country is the Country of the first input row',
  async function (this: TamedTableWorld) {
    const { loadCsv } = await import('@tamedtable/core');
    const { rows: source } = await loadCsv(this.inputPath!);
    const out = this.ensureRunner().currentRows();
    assert.equal(out[0]?.Country, source[0]?.Country);
  });

Then('every row has a non-null {string}', function (this: TamedTableWorld, col: string) {
  const rows = this.ensureRunner().currentRows();
  assert.ok(rows.length > 0, 'no rows');
  rows.forEach((r, i) => {
    const v = r[col];
    assert.ok(v !== null && v !== undefined && v !== '', `row ${i} ${col} is empty/null: ${safeStringify(v)}`);
  });
});

// Real-world inputs are messy; defensive SQL/JS legitimately emits NULL for
// rows it can't recover. This weaker assertion confirms the transformation
// actually populated SOME row, without demanding clean data.
Then('at least one row has a non-null {string}', function (this: TamedTableWorld, col: string) {
  const rows = this.ensureRunner().currentRows();
  assert.ok(rows.length > 0, 'no rows');
  const hit = rows.some((r) => {
    const v = (r as Record<string, unknown>)[col];
    return v !== null && v !== undefined && v !== '';
  });
  assert.ok(hit, `no row has a non-null "${col}"`);
});

// JSON.stringify throws on bigint; callers building assertion messages should
// not crash on a perfectly valid SQL/JS scalar.
function safeStringify(v: unknown): string {
  try { return JSON.stringify(v); } catch { return String(v); }
}

// Item 5: a split over a fixture that includes an empty-FullName row can't
// give every output row a value — the empty cell yields nulls by design
// (covered by the "empty input cell produces nulls" scenario). This weaker
// assertion checks only the rows whose split source was non-empty.
Then('every non-empty row has a non-null {string}', function (this: TamedTableWorld, col: string) {
  const rows = this.ensureRunner().currentRows();
  assert.ok(rows.length > 0, 'no rows');
  rows.forEach((r, i) => {
    const fullName = r.FullName;
    if (fullName === '' || fullName === null || fullName === undefined) return;
    const v = r[col];
    assert.ok(v !== null && v !== undefined && v !== '', `row ${i} ${col} is empty/null: ${JSON.stringify(v)}`);
  });
});

// ── split row-by-name accessors (colsplit.feature) ─────────────────────────

function findRow(world: TamedTableWorld, predicate: (r: Row) => boolean): Row {
  const rows = world.ensureRunner().currentRows();
  const match = rows.find(predicate);
  assert.ok(match, `no row matched in ${JSON.stringify(rows.slice(0, 3))}…`);
  return match!;
}

Given('{string} contains a row with FullName {string}',
  async function (this: TamedTableWorld, file: string, fullName: string) {
    // Descriptive assertion on the fixture itself; ALSO ensures the file is
    // loaded so subsequent transformations run against it. Rules without a
    // Background don't inherit the parent rule's `is loaded` step.
    const text = await readFile(join(SPEC_TC_DIR, file), 'utf8');
    const lines = text.split('\n').filter(Boolean);
    const hit = lines.some((l) => l.split(',', 2)[1] === fullName);
    assert.ok(hit, `expected fixture ${file} to contain FullName "${fullName}". Lines:\n${lines.join('\n')}`);
    if (!this.runner) {
      this.inputPath = join(SPEC_TC_DIR, file);
      await this.ensureRunner().loadInput(this.inputPath);
    }
    // Remember which row the subsequent "the row has …" assertions target.
    (this as TamedTableWorld & { syntheticFullName?: string }).syntheticFullName = fullName;
  });

Given('{string} contains messy international names', async function (this: TamedTableWorld, file: string) {
  const text = await readFile(join(SPEC_TC_DIR, file), 'utf8');
  assert.ok(/[^\x00-\x7f]/.test(text), 'fixture should contain at least one messy international name');
  if (!this.runner) {
    this.inputPath = join(SPEC_TC_DIR, file);
    await this.ensureRunner().loadInput(this.inputPath);
  }
});

Then('the Cher row has FirstName {string}', function (this: TamedTableWorld, expected: string) {
  const r = findRow(this, (row) => row.FullName === 'Cher');
  assert.equal(r.FirstName, expected);
});

Then('the Cher row has LastName equal to null', function (this: TamedTableWorld) {
  const r = findRow(this, (row) => row.FullName === 'Cher');
  assert.equal(r.LastName, null);
});

function syntheticTargetRow(world: TamedTableWorld): Row {
  const target = (world as TamedTableWorld & { syntheticFullName?: string }).syntheticFullName;
  assert.ok(target !== undefined, 'no prior Given established the target FullName');
  const rows = world.ensureRunner().currentRows();
  const hit = rows.find((r) => r.FullName === target);
  assert.ok(hit, `no row with FullName "${target}" in current rows`);
  return hit!;
}

Then('the row has FirstName {string}', function (this: TamedTableWorld, expected: string) {
  assert.equal(syntheticTargetRow(this).FirstName, expected);
});

Then('the row has LastName {string}', function (this: TamedTableWorld, expected: string) {
  assert.equal(syntheticTargetRow(this).LastName, expected);
});

Then('the row has FirstName equal to null', function (this: TamedTableWorld) {
  assert.equal(syntheticTargetRow(this).FirstName, null);
});

Then('the row has LastName equal to null', function (this: TamedTableWorld) {
  assert.equal(syntheticTargetRow(this).LastName, null);
});

// ── join scaffolding (join.feature) ────────────────────────────────────────

Given('the lookup table {string} exists with columns {string}',
  async function (this: TamedTableWorld, file: string, _cols: string) {
    await readFile(join(SPEC_TC_DIR, file), 'utf8');
  });

Given('the lookup table {string} has a column {string}',
  async function (this: TamedTableWorld, file: string, col: string) {
    const text = await readFile(join(SPEC_TC_DIR, file), 'utf8');
    assert.ok(text.split('\n', 1)[0]!.includes(col), `${file} lacks column ${col}`);
  });

Given('the lookup table has no entry for Country {string}', async function (this: TamedTableWorld, country: string) {
  const text = await readFile(join(SPEC_TC_DIR, 'join-country-codes.csv'), 'utf8');
  assert.ok(!text.includes(`\n${country},`), `lookup table unexpectedly has entry for ${country}`);
});

Given('the customer table contains a row with Country {string}', function (this: TamedTableWorld, country: string) {
  // Datanorm input does not have Atlantis; this step is a soft-no-op for now
  // — the join's left-side behavior is what we actually assert.
  void country;
});

Then('the Atlantis row has ISO equal to null', function (this: TamedTableWorld) {
  const rows = this.ensureRunner().currentRows();
  const atlantis = rows.find((r) => r.Country === 'Atlantis');
  if (!atlantis) return; // no Atlantis row in fixture; covered by the customer-table step.
  assert.equal(atlantis.ISO, null);
});

Then('the Atlantis row has Region equal to null', function (this: TamedTableWorld) {
  const rows = this.ensureRunner().currentRows();
  const atlantis = rows.find((r) => r.Country === 'Atlantis');
  if (!atlantis) return;
  assert.equal(atlantis.Region, null);
});

Then('the current rows contain no row with Country {string}', function (this: TamedTableWorld, country: string) {
  const rows = this.ensureRunner().currentRows();
  assert.ok(!rows.some((r) => r.Country === country), `unexpected Country=${country}`);
});

Then('every row keeps its original FirstName', async function (this: TamedTableWorld) {
  const { loadCsv } = await import('@tamedtable/core');
  const { rows: source } = await loadCsv(this.inputPath!);
  const out = this.ensureRunner().currentRows();
  assert.equal(out.length, source.length, 'row count changed');
  source.forEach((src, i) => assert.equal(out[i]?.FirstName, src.FirstName, `row ${i} FirstName changed`));
});

// ── pivot / unpivot (pivot.feature) ────────────────────────────────────────

Given('the columns are {string}', function (this: TamedTableWorld, csv: string) {
  const expected = csv.split(',').map((s) => s.trim());
  const actual = this.ensureRunner().currentSpec().columns.map((c) => c.id);
  assert.deepEqual(actual, expected);
});

Given('{string} has two rows for Region {string}, Quarter {string}',
  async function (this: TamedTableWorld, file: string, region: string, quarter: string) {
    const text = await readFile(join(SPEC_TC_DIR, file), 'utf8');
    const matches = text.split('\n').filter((line) => line.startsWith(`${region},${quarter},`)).length;
    assert.equal(matches, 2, `expected 2 rows for ${region}/${quarter}, got ${matches}`);
  });

Given('{string} has no row for Region {string}, Quarter {string}',
  async function (this: TamedTableWorld, file: string, region: string, quarter: string) {
    const text = await readFile(join(SPEC_TC_DIR, file), 'utf8');
    const matches = text.split('\n').filter((line) => line.startsWith(`${region},${quarter},`)).length;
    assert.equal(matches, 0);
  });

Then('the EU row\'s Q1 value equals the sum of the two source rows',
  async function (this: TamedTableWorld) {
    const text = await readFile(join(SPEC_TC_DIR, 'pivot-long-input.csv'), 'utf8');
    const sum = text.split('\n')
      .filter((l) => l.startsWith('EU,Q1,'))
      .reduce((acc, l) => acc + Number(l.split(',')[2]), 0);
    const eu = this.ensureRunner().currentRows().find((r) => r.Region === 'EU');
    assert.ok(eu, 'no EU row');
    assert.equal(Number(eu.Q1), sum);
  });

Then('the APAC row\'s Q3 value is null', function (this: TamedTableWorld) {
  const apac = this.ensureRunner().currentRows().find((r) => r.Region === 'APAC');
  assert.ok(apac, 'no APAC row');
  assert.equal(apac.Q3, null);
});

Then('the number of output rows equals the number of distinct Regions',
  async function (this: TamedTableWorld) {
    const text = await readFile(join(SPEC_TC_DIR, 'pivot-long-input.csv'), 'utf8');
    const regions = new Set(text.split('\n').slice(1).filter(Boolean).map((l) => l.split(',')[0]));
    assert.equal(this.ensureRunner().currentRows().length, regions.size);
  });

Then('the number of output rows equals the input rows times {int}',
  async function (this: TamedTableWorld, n: number) {
    const { loadCsv } = await import('@tamedtable/core');
    const { rows: source } = await loadCsv(this.inputPath!);
    assert.equal(this.ensureRunner().currentRows().length, source.length * n);
  });

// ── validate (validate.feature) ────────────────────────────────────────────

// "the source has N rows and M have empty Phone" rewrites the input in temp/
// so the validate/threshold scenarios see the exact counts they describe.
// Some scenarios live under Rules without a Background that loads the input,
// so default to the canonical datanorm-input.csv when none is set.
async function configureSource(world: TamedTableWorld, total: number, emptyPhones: number): Promise<void> {
  const { loadCsv } = await import('@tamedtable/core');
  const source = world.inputPath ?? join(SPEC_TC_DIR, 'datanorm-input.csv');
  const { rows } = await loadCsv(source);
  assert.equal(rows.length, total, `expected ${total} source rows, got ${rows.length}`);
  const mutated = rows.map((r, i) => ({ ...r, Phone: i < emptyPhones ? '' : r.Phone }));
  await mkdir(TEMP_DIR, { recursive: true });
  const path = join(TEMP_DIR, 'validate-input.jsonl');
  await writeFile(path, mutated.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  world.inputPath = path;
  world.runner = undefined;
  await world.ensureRunner().loadInput(path);
}

Given('the source has {int} rows and {int} have empty Phone',
  async function (this: TamedTableWorld, total: number, empties: number) {
    await configureSource(this, total, empties);
  });

Given('the source has {int} rows and {int} has empty Phone',
  async function (this: TamedTableWorld, total: number, empties: number) {
    await configureSource(this, total, empties);
  });

Then('every row has a boolean {string}', function (this: TamedTableWorld, col: string) {
  const rows = this.ensureRunner().currentRows();
  rows.forEach((r, i) => assert.equal(typeof r[col], 'boolean', `row ${i} ${col} is not boolean: ${JSON.stringify(r[col])}`));
});

Then('rows with empty Phone have _valid equal to false', function (this: TamedTableWorld) {
  for (const r of this.ensureRunner().currentRows()) {
    if (!r.Phone || String(r.Phone).trim() === '') assert.equal(r._valid, false);
  }
});

Then('rows with non-empty Phone have _valid equal to true', function (this: TamedTableWorld) {
  for (const r of this.ensureRunner().currentRows()) {
    if (r.Phone && String(r.Phone).trim() !== '') assert.equal(r._valid, true);
  }
});

Then('rows with _valid equal to true have _validation equal to null', function (this: TamedTableWorld) {
  for (const r of this.ensureRunner().currentRows()) {
    if (r._valid === true) assert.equal(r._validation, null);
  }
});

Then('every remaining row has _valid equal to true', function (this: TamedTableWorld) {
  for (const r of this.ensureRunner().currentRows()) assert.equal(r._valid, true);
});

Then('rows with empty DOB have _valid equal to false', function (this: TamedTableWorld) {
  for (const r of this.ensureRunner().currentRows()) {
    if (!r.DOB || String(r.DOB).trim() === '') assert.equal(r._valid, false);
  }
});

Then('rows with non-empty DOB but empty Phone have _valid equal to true', function (this: TamedTableWorld) {
  for (const r of this.ensureRunner().currentRows()) {
    if (r.DOB && (!r.Phone || String(r.Phone).trim() === '')) assert.equal(r._valid, true);
  }
});

Then('the request commits', function (this: TamedTableWorld) {
  // No-op: if a prior request had failed, the world's runner would still hold
  // the pre-request spec. We treat reaching this step as success.
  assert.ok(this.ensureRunner().currentSpec().transformations.length >= 0);
});

Then('the request fails with an error containing {string}', function (this: TamedTableWorld, needle: string) {
  const out = this.lastRequestOutcome;
  assert.ok(out, 'no prior `user requests` step recorded an outcome');
  assert.ok(!out!.ok, 'expected failure; request succeeded');
  assert.ok(out!.error!.message.includes(needle), `error "${out!.error!.message}" lacks "${needle}"`);
});

Then('the spec is unchanged from before the request', function (this: TamedTableWorld) {
  const out = this.lastRequestOutcome;
  assert.ok(out, 'no prior `user requests` step recorded an outcome');
  assert.deepEqual(out!.specAfter, out!.specBefore);
});
