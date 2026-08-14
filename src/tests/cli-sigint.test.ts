// Interactive Ctrl-C, under a real terminal. spec/behavior.md § REPL:
// "Ctrl-C while a request runs cancels it and rolls back the half-applied
// transformation … the session survives the cancel. Ctrl-C while idle closes
// the REPL. This holds in a real terminal, where the keypress never reaches
// the process as a signal."
//
// That last clause is what needs a PTY. Interactive mode creates readline with
// terminal:true, which puts stdin in raw mode, so ^C never becomes a process
// SIGINT: with only `process.on('SIGINT')` wired (the RED-CLI-1 bug inventory,
// now fixed) readline saw the keypress, closed its interface, and the input
// loop, the whole session, died without the abort controller ever being
// touched. The fix registers `rl.on('SIGINT')` too; see the CLI section of
// spec/code-contract.md.
//
// No Gherkin surface can reach this (the cucumber harness always pipes stdin),
// so this drives the real runCli under a real PTY: a Python driver
// (cli-sigint.pty.py) forks `bun cli-sigint.child.ts` with pty.fork, types an
// NL request replayed from cassettes/repl-commands.json (each response delayed
// 3 s so the request stays in flight), sends \x03 mid-flight, then queues
// ":history" + "exit", which only run if the loop survived.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

const TESTS_DIR = import.meta.dirname;
const SRC_DIR = join(TESTS_DIR, '..');

interface PtyResult {
  childExited: boolean;
  cancelledLine: boolean;
  requestCompleted: boolean;
  historyProcessed: boolean;
  runcliReturned: boolean;
  startupSeen: boolean;
}

test('interactive Ctrl-C cancels the in-flight request and the session stays alive', async () => {
  const proc = Bun.spawn(
    ['python3', join(TESTS_DIR, 'cli-sigint.pty.py'), join(TESTS_DIR, 'cli-sigint.child.ts'), SRC_DIR],
    { stdout: 'pipe', stderr: 'pipe' },
  );
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exit = await proc.exited;
  assert.equal(exit, 0, `PTY harness failed (exit ${exit}).\nstderr:\n${stderr}\nstdout:\n${stdout}`);

  const marker = stdout.split('\n').find((l) => l.startsWith('PTY-RESULT:'));
  assert.ok(marker, `PTY harness printed no result line.\nstdout:\n${stdout}`);
  const result = JSON.parse(marker.slice('PTY-RESULT:'.length)) as PtyResult;
  assert.ok(result.startupSeen,
    `PTY harness: the REPL never reached its startup banner.\ntranscript:\n${stdout}`);

  assert.ok(result.cancelledLine && !result.requestCompleted,
    'spec/behavior.md § REPL: "Ctrl-C while a request runs cancels it and rolls back the half-applied transformation". In a real terminal the ^C keypress must reach the abort controller through the readline SIGINT listener ' +
    `(cancelledLine=${result.cancelledLine}, requestCompleted=${result.requestCompleted}).\ntranscript:\n${stdout}`);

  assert.ok(result.historyProcessed,
    'spec/behavior.md § REPL: after a mid-request Ctrl-C the session must stay alive (only an *idle* Ctrl-C closes the REPL), so the queued ":history" must still be processed.\n' +
    `transcript:\n${stdout}`);
}, 90_000);
