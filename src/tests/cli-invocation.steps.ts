// #CliFlags #ReplCmds #BatchExec
import { When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { Readable, Writable } from 'node:stream';
import { join } from 'node:path';
import { runCli } from '@tamedtable/cli';
import { TamedTableWorld, SPEC_TC_DIR, type CapturedInvocation } from './world.ts';

function captureStdout(): { stream: Writable; text: () => string } {
  const chunks: string[] = [];
  const stream = new Writable({ write(chunk, _enc, cb) { chunks.push(chunk.toString()); cb(); } });
  return { stream, text: () => chunks.join('') };
}

function getCapture(world: TamedTableWorld): CapturedInvocation {
  const c = world.lastInvocation;
  if (!c) throw new Error('no prior invocation captured');
  return c;
}

async function runAndCapture(world: TamedTableWorld, argv: string[], extra?: { stdin?: Readable }): Promise<void> {
  const out = captureStdout();
  // Count model calls so a scenario can assert an input was handled locally
  // (an unknown ":" command must never reach the spec editor). The wrapper sits
  // outside whatever fetch the scenario already has: the cassette recorder in
  // replay mode, the real one otherwise.
  const opts = { ...world.runnerOpts };
  world.modelCalls = 0;
  const inner = opts.fetch;
  opts.fetch = ((input: unknown, init?: unknown) => {
    world.modelCalls = (world.modelCalls ?? 0) + 1;
    return inner ? inner(input as never, init as never) : globalThis.fetch(input as never, init as never);
  }) as typeof opts.fetch;
  const result = await runCli(argv, { stdout: out.stream, ...(extra?.stdin ? { stdin: extra.stdin } : {}), ...opts });
  world.lastInvocation = { exitCode: result.exitCode, stdout: out.text(), stderr: result.stderr };
}

function tokenizeCmd(command: string): string[] {
  const tokens = command.trim().split(/\s+/);
  if (tokens[0] !== 'tamedtable') throw new Error(`expected command to start with 'tamedtable', got: ${command}`);
  return tokens.slice(1);
}

When('user invokes {string}', async function (this: TamedTableWorld, command: string) {
  await runAndCapture(this, tokenizeCmd(command));
});

When('user enters the REPL with {string} and types:',
  async function (this: TamedTableWorld, csv: string, lines: string) {
    const stdin = Readable.from([lines.endsWith('\n') ? lines : lines + '\n']);
    await runAndCapture(this, [join(SPEC_TC_DIR, csv)], { stdin });
  }
);

function assertExitCode(world: TamedTableWorld, code: number, label = ''): void {
  const inv = getCapture(world);
  const prefix = label ? `${label} ` : '';
  assert.equal(inv.exitCode, code, `expected ${prefix}exit code ${code}, got ${inv.exitCode}. stderr: ${inv.stderr}`);
}

function assertStreamContains(world: TamedTableWorld, stream: 'stdout' | 'stderr', text: string, label = ''): void {
  const inv = getCapture(world);
  const haystack = inv[stream];
  assert.ok(haystack.includes(text),
    `${label}${label ? ' ' : ''}${stream} missing substring ${JSON.stringify(text)}. ${stream} was:\n${haystack}`);
}

function assertStreamLacks(world: TamedTableWorld, stream: 'stdout' | 'stderr', text: string, label = ''): void {
  const inv = getCapture(world);
  const haystack = inv[stream];
  assert.ok(!haystack.includes(text),
    `${label}${label ? ' ' : ''}${stream} unexpectedly contains substring ${JSON.stringify(text)}. ${stream} was:\n${haystack}`);
}

Then('exit code is {int}',                    function (this: TamedTableWorld, c: number) { assertExitCode(this, c); });
Then('REPL exit code is {int}',               function (this: TamedTableWorld, c: number) { assertExitCode(this, c, 'REPL'); });
Then('stdout contains {string}',              function (this: TamedTableWorld, t: string) { assertStreamContains(this, 'stdout', t); });
Then('stdout does not contain {string}',      function (this: TamedTableWorld, t: string) { assertStreamLacks(this, 'stdout', t); });
Then('stderr contains {string}',              function (this: TamedTableWorld, t: string) { assertStreamContains(this, 'stderr', t); });
Then('REPL stdout contains {string}',         function (this: TamedTableWorld, t: string) { assertStreamContains(this, 'stdout', t, 'REPL'); });
Then('REPL stdout does not contain {string}', function (this: TamedTableWorld, t: string) { assertStreamLacks(this, 'stdout', t, 'REPL'); });

// Slice the LAST table reprint from stdout. A table line is any line containing
// " | " (the renderTable cell separator). The REPL writes its "> " prompt with
// no newline, so a reprint's header line often carries a "> " prefix from the
// previous prompt, which glues consecutive reprints into one contiguous block
// of table lines. Scanning backwards, a prompt-prefixed table line is the
// current reprint's own header: include it and stop there, or an assertion
// about "the last reprint" would silently read the one before it too.
function lastTableReprint(stdout: string): string {
  const lines = stdout.split('\n');
  const isTableLine = (l: string) => / \| /.test(l);
  let end = lines.length;
  while (end > 0 && !isTableLine(lines[end - 1] ?? '')) end--;
  let start = end;
  while (start > 0 && isTableLine(lines[start - 1] ?? '')) {
    start--;
    if ((lines[start] ?? '').startsWith('> ')) break; // this block's header
  }
  return lines.slice(start, end).join('\n');
}

Then('the last REPL table reprint contains {string}', function (this: TamedTableWorld, text: string) {
  const inv = getCapture(this);
  const last = lastTableReprint(inv.stdout);
  assert.ok(last.includes(text),
    `last REPL table reprint missing ${JSON.stringify(text)}. Last reprint was:\n${last}\n\nFull stdout:\n${inv.stdout}`);
});

Then('the last REPL table reprint does not contain {string}', function (this: TamedTableWorld, text: string) {
  const inv = getCapture(this);
  const last = lastTableReprint(inv.stdout);
  assert.ok(!last.includes(text),
    `last REPL table reprint unexpectedly contains ${JSON.stringify(text)}. Last reprint was:\n${last}`);
});

Then('the REPL made no model call', function (this: TamedTableWorld) {
  const inv = getCapture(this);
  assert.equal(this.modelCalls ?? 0, 0,
    `expected the REPL to handle the input locally with no LLM round-trip, but ${this.modelCalls} model call(s) were attempted. Stdout:\n${inv.stdout}`);
});

// The :schema block printed after an :undo. Schema lines start at column 0 (the
// first may carry the "> " prompt glyph); table lines start with a space, so
// they cannot match.
Then('the schema printed after the undo lists {string} before {string}',
  function (this: TamedTableWorld, first: string, second: string) {
    const inv = getCapture(this);
    const after = inv.stdout.slice(inv.stdout.lastIndexOf('undid:'));
    const lines = after.split('\n').map((l) => l.replace(/^> /, ''));
    const at = (col: string) => lines.findIndex((l) => new RegExp(`^${col}\\b`).test(l));
    const firstIdx = at(first);
    const secondIdx = at(second);
    assert.ok(firstIdx !== -1 && secondIdx !== -1 && firstIdx < secondIdx,
      `expected the :schema after the undo to list ${JSON.stringify(first)} before ${JSON.stringify(second)} (found at lines ${firstIdx} and ${secondIdx}). Stdout:\n${inv.stdout}`);
  });

Then('the :history output lists no turns', function (this: TamedTableWorld) {
  const inv = getCapture(this);
  assert.ok(inv.stdout.includes('(no history)'),
    `expected ":history" to print "(no history)"; :show/:find should not enter the journal. Stdout:\n${inv.stdout}`);
});

Then('column {string} was normalized in the final state', function (this: TamedTableWorld, column: string) {
  const inv = getCapture(this);
  const last = lastTableReprint(inv.stdout);
  // Canonical-name proxy: after Normalize country names, USA → "United States" etc.
  // Any one of the canonical English country names should appear.
  const canonical = ['United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Japan', 'Italy'];
  const hit = canonical.some((c) => last.includes(c));
  assert.ok(hit, `expected ${column} to be normalized in the final reprint. Last reprint:\n${last}`);
});
