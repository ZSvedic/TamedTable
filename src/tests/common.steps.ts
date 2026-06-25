// #FilterRows #DataNorm #Dedupe #SortRows #TestUtils
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { access, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { readJsonl, type Row } from '@tamedtable/core';
import { runCli } from '@tamedtable/cli';
import { TamedTableWorld, SRC_DIR, SPEC_TC_DIR, TEMP_DIR } from './world.ts';

// A bare name resolves to a committed fixture under spec/test-cases/.
// A name containing a slash is treated as src/-relative (= cwd when cucumber
// runs), so feature files can point generated outputs at ../temp/.
const fixture = (name: string) => (name.includes('/') ? join(SRC_DIR, name) : join(SPEC_TC_DIR, name));

// Generated test outputs (export-as, execute --output) go to temp/, never into
// the committed spec/test-cases/ dir. Golden -expected.jsonl files stay fixtures.
const output = (name: string) => join(TEMP_DIR, basename(name));

Given('load {string}', async function (this: TamedTableWorld, filename: string) {
  this.inputPath = fixture(filename);
  await this.ensureRunner().loadInput(this.inputPath);
});

Given('the expected output is {string}', function (this: TamedTableWorld, filename: string) {
  this.goldenPath = fixture(filename);
});

Given('{string} exists', async function (this: TamedTableWorld, filename: string) {
  await access(fixture(filename));
});

Given(/^"(.+)" exists with join\.with = "(.+)"$/, async function (this: TamedTableWorld, filename: string, joinWith: string) {
  // Descriptive assertion: just confirm the fixture exists and contains the join.with path.
  const content = await readFile(fixture(filename), 'utf8');
  assert.ok(content.includes(joinWith), `${filename} does not reference ${joinWith}`);
});

Then('the first line of {string} is {string}', async function (this: TamedTableWorld, filename: string, expectedFirstLine: string) {
  const text = await readFile(output(filename), 'utf8');
  const first = text.split('\n', 1)[0]!;
  assert.equal(first, expectedFirstLine);
});

Then('{string} contains the line {string}', async function (this: TamedTableWorld, filename: string, expectedLine: string) {
  const text = await readFile(output(filename), 'utf8');
  // Cucumber's {string} captures literal backslash-n; expand it to actual newlines so
  // the assertion can match a multi-line CSV cell.
  const needle = expectedLine.replace(/\\n/g, '\n');
  assert.ok(text.includes(needle), `${filename} missing line:\n${needle}\nFile was:\n${text}`);
});

When('query {string}', async function (this: TamedTableWorld, text: string) {
  // Capture the request's outcome rather than throwing, so scenarios that
  // assert failure via `Then the request fails …` can inspect it. Default
  // to customers-input.csv when a Rule lacks a Background that loads input.
  const runner = this.ensureRunner();
  let specBefore;
  try { specBefore = structuredClone(runner.currentSpec()); }
  catch {
    this.inputPath = this.inputPath ?? join(SPEC_TC_DIR, 'customers-input.csv');
    await runner.loadInput(this.inputPath);
    specBefore = structuredClone(runner.currentSpec());
  }
  try {
    await runner.request(text);
    this.lastRequestOutcome = { ok: true, specBefore, specAfter: runner.currentSpec() };
  } catch (e) {
    this.lastRequestOutcome = { ok: false, error: e as Error, specBefore, specAfter: runner.currentSpec() };
  }
});

When('export as {string}', async function (this: TamedTableWorld, filename: string) {
  await this.ensureRunner().exportAs(output(filename));
});

When('user runs {string}', async function (this: TamedTableWorld, command: string) {
  const tokens = command.trim().split(/\s+/);
  if (tokens[0] !== 'tamedtable') throw new Error(`expected command to start with 'tamedtable', got: ${command}`);
  // Redirect a generated --output into temp/ so it never lands in spec/test-cases/.
  const args = tokens.slice(1).map((tok, i, arr) =>
    i > 0 && arr[i - 1] === '--output' ? output(tok) : tok
  );
  // Capture stdout so later "stdout contains …" steps can assert against it;
  // do NOT throw on non-zero exit — rejection scenarios assert exit 2.
  const chunks: string[] = [];
  const stream = {
    write: (s: string | Buffer) => { chunks.push(s.toString()); return true; },
  } as unknown as NodeJS.WritableStream;
  const result = await runCli(args, { stdout: stream, ...this.runnerOpts });
  this.lastInvocation = { exitCode: result.exitCode, stdout: chunks.join(''), stderr: result.stderr };
});

Then('column {string} matches the expected output', async function (this: TamedTableWorld, column: string) {
  const golden = await readJsonl(this.goldenPath!);
  const actual = this.ensureRunner().currentRows();
  assert.equal(actual.length, golden.length, `row count: actual ${actual.length} vs golden ${golden.length}`);
  for (let i = 0; i < golden.length; i++) {
    assert.deepEqual(actual[i]?.[column], golden[i]?.[column], `row ${i} column "${column}"`);
  }
});

Then('compare with the expected output', async function (this: TamedTableWorld) {
  const golden = await readJsonl(this.goldenPath!);
  const actual = this.ensureRunner().currentRows();
  assert.deepEqual(actual, golden);
});

Then('{string} matches the expected output', async function (this: TamedTableWorld, filename: string) {
  // CSV goldens compare as text (RFC 4180 ordering matters); JSONL goldens compare row-by-row.
  if (this.goldenPath!.endsWith('.csv')) {
    const golden = await readFile(this.goldenPath!, 'utf8');
    const actual = await readFile(output(filename), 'utf8');
    assert.equal(actual.replace(/\r\n/g, '\n').trimEnd(), golden.replace(/\r\n/g, '\n').trimEnd());
    return;
  }
  const golden = await readJsonl(this.goldenPath!);
  const actual = await readJsonl(output(filename));
  assert.deepEqual(actual, golden);
});

Then('{string} matches the expected output ignoring {string}', async function (this: TamedTableWorld, filename: string, ignoreColumn: string) {
  const golden = await readJsonl(this.goldenPath!);
  const actual = await readJsonl(output(filename));
  const strip = (rows: Row[]) =>
    rows.map((r) => {
      const copy = { ...r };
      delete copy[ignoreColumn];
      return copy;
    });
  assert.deepEqual(strip(actual), strip(golden));
});

Given('Phone, Country, and DOB are normalized', async function (this: TamedTableWorld) {
  const runner = this.ensureRunner();
  await runner.request('Normalize phone numbers');
  await runner.request('Normalize country names');
  await runner.request('Normalize DOB formats');
});

Given('duplicates are removed by Email', async function (this: TamedTableWorld) {
  await this.ensureRunner().request('Remove duplicate rows by Email');
});

Given('the table is filtered to USA customers', async function (this: TamedTableWorld) {
  await this.ensureRunner().request('Show only customers in the USA');
});

// Scenarios that drive a REPL session via `user enters the REPL` end with the
// session's runner inaccessible. Fall back to scanning the captured stdout's
// last table reprint header — the column appears iff the spec listed it.
function lastTableHeader(stdout: string): string {
  const lines = stdout.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/ \| /.test(lines[i] ?? '')) {
      // Walk up to the first table line of this block — the header.
      let top = i;
      while (top > 0 && / \| /.test(lines[top - 1] ?? '')) top--;
      return lines[top] ?? '';
    }
  }
  return '';
}

// Pull the column names out of a `"A", "B", "C"` list (the form the plural
// steps take). Falls back to a bare comma-split if the names aren't quoted, so
// either spelling works.
function parseColumnList(list: string): string[] {
  const quoted = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
  return quoted.length ? quoted : list.split(',').map((s) => s.trim()).filter(Boolean);
}

function assertColumnExists(world: TamedTableWorld, column: string): void {
  if (world.runner) {
    try {
      const spec = world.runner.currentSpec();
      const ids = spec.columns.map((c) => c.id);
      if (!ids.includes(column)) {
        throw new Error(`expected column "${column}" in spec.columns. Got: ${ids.join(', ')}`);
      }
      return;
    } catch (e) {
      if (!/no input loaded/.test((e as Error).message)) throw e;
    }
  }
  // Default page is only 5 cols wide so the column may be in the hidden tail
  // of the table — scan plan-emitted "add column 'X'" lines and the schema
  // command output too, in addition to the last header.
  const stdout = world.lastInvocation?.stdout ?? '';
  const inHeader = lastTableHeader(stdout).includes(column);
  const inPlan = new RegExp(`add column ['"\`]${column.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}['"\`]`).test(stdout);
  if (!inHeader && !inPlan) {
    throw new Error(`expected column "${column}" in last REPL table header or plan. Header was: "${lastTableHeader(stdout)}". Full stdout tail:\n${stdout.slice(-800)}`);
  }
}

Then('column {string} exists in the spec', function (this: TamedTableWorld, column: string) {
  assertColumnExists(this, column);
});

// Plural form: one line for a run of columns. `Then columns exist in the spec:
// "A", "B", "C"` replaces a ladder of `And column "X" exists in the spec`.
Then(/^columns exist in the spec: (.+)$/, function (this: TamedTableWorld, list: string) {
  for (const column of parseColumnList(list)) assertColumnExists(this, column);
});

function assertColumnAbsent(world: TamedTableWorld, column: string): void {
  if (world.runner) {
    try {
      const rows = world.runner.currentRows();
      const present = rows.some((r) => column in (r as Record<string, unknown>));
      assert.ok(!present, `expected column "${column}" to be absent from every row`);
      return;
    } catch { /* fall through */ }
  }
  const stdout = world.lastInvocation?.stdout ?? '';
  const header = lastTableHeader(stdout);
  assert.ok(!header.includes(column), `expected column "${column}" absent from last REPL table header. Header was: ${header}`);
}

Then('column {string} is absent from the current rows', function (this: TamedTableWorld, column: string) {
  assertColumnAbsent(this, column);
});

// Plural form, mirroring `columns exist in the spec: …`.
Then(/^columns are absent from the current rows: (.+)$/, function (this: TamedTableWorld, list: string) {
  for (const column of parseColumnList(list)) assertColumnAbsent(this, column);
});

Then('every row has a non-null {string} and {string}', function (this: TamedTableWorld, colA: string, colB: string) {
  const rows = this.ensureRunner().currentRows();
  assert.ok(rows.length > 0, 'no rows to check');
  rows.forEach((r, i) => {
    const a = (r as Record<string, unknown>)[colA];
    const b = (r as Record<string, unknown>)[colB];
    assert.ok(a !== null && a !== undefined && a !== '', `row ${i}: ${colA} is empty/null (got ${JSON.stringify(a)})`);
    assert.ok(b !== null && b !== undefined && b !== '', `row ${i}: ${colB} is empty/null (got ${JSON.stringify(b)})`);
  });
});
