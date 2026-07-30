// RED-CLI-1 — red unit test (bug inventory): Ctrl-C during an in-flight
// request in interactive (TTY) mode neither cancels the request nor keeps the
// session alive. spec/behavior.md:485-486 — "Ctrl-C while a request runs
// cancels it and rolls back the half-applied transformation. Ctrl-C while
// idle closes the REPL." (also the :help screen, behavior.md:480).
//
// Cause: index.ts:203-204 wires cancellation only as process.on('SIGINT') —
// but interactive mode creates readline with terminal:true, which puts stdin
// in raw mode: ^C never becomes a process SIGINT. Readline sees the keypress
// itself and, with no 'SIGINT' listener on the rl interface, closes the
// interface — so the abort controller is never touched AND the input loop
// dies, killing the session once the request finishes.
//
// No Gherkin surface can reach this (the cucumber harness always pipes
// stdin), so it drives the real runCli under a real PTY: a Python driver
// (cli-sigint.pty.py) forks `bun cli-sigint.child.ts` with pty.fork, types an
// NL request replayed from cassettes/repl-commands.json (each response
// delayed 3 s so the request stays in flight), sends \x03 mid-flight, then
// queues ":history" + "exit".
// Runs via `bun run test:red:unit`; excluded from the green `bun test` by
// bunfig [test] pathIgnorePatterns.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

const RED_DIR = import.meta.dirname;
const SRC_DIR = join(RED_DIR, '..', '..');

interface PtyResult {
  childExited: boolean;
  cancelledLine: boolean;
  requestCompleted: boolean;
  historyProcessed: boolean;
  runcliReturned: boolean;
  startupSeen: boolean;
}

test('RED-CLI-1: interactive Ctrl-C cancels the in-flight request and the session stays alive', async () => {
  const proc = Bun.spawn(
    ['python3', join(RED_DIR, 'cli-sigint.pty.py'), join(RED_DIR, 'cli-sigint.child.ts'), SRC_DIR],
    { stdout: 'pipe', stderr: 'pipe' },
  );
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exit = await proc.exited;
  assert.equal(exit, 0, `RED-CLI-1 harness: PTY driver failed (exit ${exit}) — not the bug itself.\nstderr:\n${stderr}\nstdout:\n${stdout}`);

  const marker = stdout.split('\n').find((l) => l.startsWith('RED-CLI-1-RESULT:'));
  assert.ok(marker, `RED-CLI-1 harness: PTY driver printed no result line — not the bug itself.\nstdout:\n${stdout}`);
  const result = JSON.parse(marker.slice('RED-CLI-1-RESULT:'.length)) as PtyResult;
  assert.ok(result.startupSeen,
    `RED-CLI-1 harness: REPL never reached its startup banner under the PTY — not the bug itself.\ntranscript:\n${stdout}`);

  assert.ok(result.cancelledLine && !result.requestCompleted,
    'RED-CLI-1 (spec/behavior.md:485-486): "Ctrl-C while a request runs cancels it and rolls back the half-applied transformation" — but in interactive (TTY) mode the ^C keypress never reaches the SIGINT-only wiring (index.ts:203-204; raw-mode readline swallows it): no "Cancelled." line was printed and the request ran to completion ' +
    `(cancelledLine=${result.cancelledLine}, requestCompleted=${result.requestCompleted}).\ntranscript:\n${stdout}`);

  assert.ok(result.historyProcessed,
    'RED-CLI-1 (spec/behavior.md:485-486): after a mid-request Ctrl-C the session must stay alive (only an *idle* Ctrl-C closes the REPL) — but readline closed its interface on the ^C keypress, so the queued ":history" was never processed and the session died once the request finished.\n' +
    `transcript:\n${stdout}`);
}, 90_000);
