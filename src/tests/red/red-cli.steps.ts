// RED-CLI step definitions — self-contained (no surface hooks, no
// worldParameters). Each When step drives the real runCli with piped stdin and
// an injected fetch: either an offline recorder (counts any model call and
// refuses it) or a cassette replay wired explicitly, mirroring
// src/tests/world.ts runnerOptsFor. See spec/test-cases/red/red-cli.feature.
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { runCli } from '@tamedtable/cli';
import { cassetteFetch } from '../cassette.ts';
import { CASSETTE_DIR, SPEC_TC_DIR, TamedTableWorld } from '../world.ts';

interface RedCliRun {
  stdout: string;
  exitCode: number;
  stderr: string;
  modelCalls: number;
  tmp: string;
}

type RedCliWorld = TamedTableWorld & { redCliRun?: RedCliRun };

function getRun(world: RedCliWorld): RedCliRun {
  if (!world.redCliRun) throw new Error('red-cli: no prior REPL run captured');
  return world.redCliRun;
}

async function driveRepl(
  world: RedCliWorld,
  csv: string,
  script: string,
  fetchImpl: (input: unknown, init?: unknown) => Promise<Response>,
  apiKey: string,
  countCalls: () => number
): Promise<void> {
  const tmp = mkdtempSync(join(tmpdir(), 'red-cli-'));
  const text = script.replaceAll('${TMP}', tmp);
  const chunks: string[] = [];
  const stdout = new Writable({
    write(chunk, _enc, cb) { chunks.push(String(chunk)); cb(); },
  });
  const stdin = Readable.from([text.endsWith('\n') ? text : text + '\n']);
  const result = await runCli([join(SPEC_TC_DIR, csv)], {
    stdout: stdout as unknown as NodeJS.WritableStream,
    stdin: stdin as unknown as NodeJS.ReadableStream,
    fetch: fetchImpl as never,
    apiKey,
  });
  world.redCliRun = {
    stdout: chunks.join(''),
    exitCode: result.exitCode,
    stderr: result.stderr,
    modelCalls: countCalls(),
    tmp,
  };
}

When('the red CLI REPL runs {string} offline with commands:',
  async function (this: RedCliWorld, csv: string, script: string) {
    let calls = 0;
    // Offline recorder: count every attempted model call and refuse it with a
    // non-retryable 400 so no scenario ever needs a key or the network.
    const offlineFetch = async (): Promise<Response> => {
      calls++;
      return new Response(
        JSON.stringify({ error: { message: 'red-cli offline fetch: model calls are disabled in this red test' } }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    };
    await driveRepl(this, csv, script, offlineFetch, 'red-cli-offline-key', () => calls);
  });

When('the red CLI REPL replays cassette {string} over {string} with commands:',
  async function (this: RedCliWorld, cassette: string, csv: string, script: string) {
    // Explicit cassette wiring — the red profile has no surface hooks, so this
    // mirrors runnerOptsFor: replay fetch bound to the named cassette plus the
    // placeholder key (replay serves every call from disk).
    let calls = 0;
    const inner = cassetteFetch({ mode: 'replay', file: join(CASSETTE_DIR, `${cassette}.json`) });
    const replay = async (input: unknown, init?: unknown): Promise<Response> => {
      calls++;
      return inner(input as never, init as never) as Promise<Response>;
    };
    await driveRepl(this, csv, script, replay, 'cassette-replay-placeholder', () => calls);
  });

// Slice the LAST table reprint from stdout (a table line is any line
// containing the " | " cell separator). The REPL writes its "> " prompt with
// no newline, so a reprint's header line often carries a "> " prefix from the
// previous prompt — that glues consecutive reprints into one contiguous block
// of table lines. Scanning backwards, a prompt-prefixed table line is the
// current reprint's own header, so it is included and ends the block.
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

Then('RED-CLI-3: no model call was attempted for the unknown colon command', function (this: RedCliWorld) {
  const run = getRun(this);
  assert.equal(run.modelCalls, 0,
    `RED-CLI-3 (spec/behavior.md:353-355): REPL ":" commands "are handled locally without any LLM round-trip", and the :help screen (behavior.md:476-477) says only lines NOT starting with ":" go to the spec editor — but the mistyped command ":frobnicate" was forwarded to the model as an NL request (${run.modelCalls} model call(s) attempted; session.ts:677-688 returns 'unhandled' for unknown colon commands and index.ts:211-216 forwards it). Stdout:\n${run.stdout}`);
});

Then('RED-CLI-4: the column order set by :reorder survives :undo of the earlier NL turn', function (this: RedCliWorld) {
  const run = getRun(this);
  // Harness sanity (must hold today): the cassette replay committed the NL
  // turn, the reorder applied, and :undo popped that turn.
  assert.ok(run.stdout.includes('reordered columns: Phone'),
    `red-cli harness: ":reorder Phone" did not apply — not the RED-CLI-4 bug. Stdout:\n${run.stdout}`);
  assert.ok(run.stdout.includes('undid: Normalize country names'),
    `red-cli harness: cassette replay of "Normalize country names" did not commit (no "undid:" line) — not the RED-CLI-4 bug. Stdout:\n${run.stdout}`);
  // The :schema after :undo. Schema lines start at column 0 (the first one may
  // carry the "> " prompt glyph); table lines start with a space, so they
  // cannot match.
  const after = run.stdout.slice(run.stdout.lastIndexOf('undid:'));
  const lines = after.split('\n').map((l) => l.replace(/^> /, ''));
  const phoneIdx = lines.findIndex((l) => /^Phone\b/.test(l));
  const idIdx = lines.findIndex((l) => /^ID\b/.test(l));
  assert.ok(phoneIdx !== -1 && idIdx !== -1 && phoneIdx < idIdx,
    `RED-CLI-4 (spec/behavior.md:359-362, :431-438): :undo reverses only "the most recent user turn", and :reorder is "Not recorded in the undo journal" — so undoing the NL turn must keep the Phone-first column order. Instead the whole-spec snapshot restore (session.ts:356/374) reverted the :reorder: the :schema after :undo lists ID first again (Phone at line ${phoneIdx}, ID at line ${idIdx}). Stdout:\n${run.stdout}`);
});

Then('RED-CLI-5: the reprint after :reorder still shows the second row page', function (this: RedCliWorld) {
  const run = getRun(this);
  assert.ok(run.stdout.includes('I011'),
    `red-cli harness: ":show rows next" never reached the second row page — not the RED-CLI-5 bug. Stdout:\n${run.stdout}`);
  const last = lastTableReprint(run.stdout);
  assert.ok(last.includes('I011') && !last.includes('I001'),
    `RED-CLI-5 (spec/behavior.md:341-344): the viewport cursor resets to (0,0) only after ":load, a successful NL request, :undo, or :redo" — an exhaustive list that does not include :reorder — yet the :reorder reprint jumped back to rows 1-10 (session.ts:485 calls resetViewport()). Last reprint:\n${last}`);
});

Then('RED-CLI-6: the reprint after bare :show still wraps the match in asterisks', function (this: RedCliWorld) {
  const run = getRun(this);
  assert.ok(run.stdout.includes('*USA*'),
    `red-cli harness: ":find USA" never produced a highlighted reprint — not the RED-CLI-6 bug. Stdout:\n${run.stdout}`);
  const last = lastTableReprint(run.stdout);
  assert.ok(last.includes('*USA*'),
    `RED-CLI-6 (spec/behavior.md:398-399): the :find highlight "clears on the next viewport- or state-changing event", and bare :show "simply reprints the current viewport" (behavior.md:376-377) — neither kind of event — yet the bare :show reprint dropped the *USA* markers (printTable clears the highlight after every print, session.ts:305-306, and showCmd('') clears it again, session.ts:389). Last reprint:\n${last}`);
});
