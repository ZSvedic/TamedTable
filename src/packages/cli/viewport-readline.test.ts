import { describe, it, expect, beforeAll } from 'bun:test';
import { Writable, Readable } from 'node:stream';
import { join } from 'node:path';
import {
  createCliRunner,
  replReadlineOptions,
  REPL_FALLBACK_COLS,
  REPL_FALLBACK_ROWS,
  type CliRunner,
} from './index.ts';
import { loadEnv } from '@tamedtable/core';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const SPEC_TC = join(REPO_ROOT, 'spec/test-cases');

beforeAll(() => { loadEnv(); });

// A small stand-in for process.stdout when we want to simulate a terminal of
// a specific size. `isTTY`, `rows`, `columns` are the same fields Node's tty
// streams expose; readline / our viewport code only ever reads those three.
function fakeTty(rows: number | undefined, columns: number | undefined): Writable {
  const stream = new Writable({ write(_c, _e, cb) { cb(); } }) as Writable & {
    isTTY?: boolean; rows?: number; columns?: number;
  };
  stream.isTTY = true;
  if (rows !== undefined) stream.rows = rows;
  if (columns !== undefined) stream.columns = columns;
  return stream;
}

function fakeTtyReadable(): Readable {
  const r = Readable.from([]) as Readable & { isTTY?: boolean };
  r.isTTY = true;
  return r;
}

async function loadedRunner(stdout: NodeJS.WritableStream): Promise<CliRunner> {
  const runner = createCliRunner({ stdout, quiet: true });
  await runner.loadInput(join(SPEC_TC, 'datanorm-input.csv'));
  return runner;
}

function readSummary(s: string): { rows: number; cols: number } {
  // Matches "viewport: 10 rows (auto) × 5 cols (auto)" — accepts ASCII "x" too.
  const m = s.match(/viewport:\s+(\d+)\s+rows.*?[×x]\s+(\d+)\s+cols/);
  if (!m) throw new Error(`unparseable viewportSummary: ${s}`);
  return { rows: Number(m[1]), cols: Number(m[2]) };
}

describe('CliRunner viewport auto-detection', () => {
  it('a wide TTY (200 cols) shows more columns than the narrow fallback', async () => {
    const runner = await loadedRunner(fakeTty(50, 200));
    const { cols } = readSummary(runner.viewportSummary());
    expect(cols).toBeGreaterThan(REPL_FALLBACK_COLS);
  });

  it('a wider TTY shows at least as many columns as a narrower TTY', async () => {
    const narrow = await loadedRunner(fakeTty(50, 80));
    const wide   = await loadedRunner(fakeTty(50, 200));
    expect(readSummary(wide.viewportSummary()).cols).toBeGreaterThan(
      readSummary(narrow.viewportSummary()).cols
    );
  });

  it('a non-TTY stdout falls back to REPL_FALLBACK_COLS', async () => {
    const runner = await loadedRunner(new Writable({ write(_c, _e, cb) { cb(); } }));
    const { cols } = readSummary(runner.viewportSummary());
    expect(cols).toBe(REPL_FALLBACK_COLS);
  });

  it('autoRows scales with TTY height (regression check)', async () => {
    const tall = await loadedRunner(fakeTty(50, 200));
    const { rows } = readSummary(tall.viewportSummary());
    expect(rows).toBeGreaterThan(REPL_FALLBACK_ROWS);
  });
});

describe('REPL readline options', () => {
  it('enables terminal mode (history + arrow keys) when both streams are TTY', () => {
    const opts = replReadlineOptions(fakeTtyReadable(), fakeTty(50, 200));
    expect(opts.terminal).toBe(true);
  });

  it('asks readline to keep some command history when interactive', () => {
    const opts = replReadlineOptions(fakeTtyReadable(), fakeTty(50, 200));
    expect(opts.historySize).toBeGreaterThan(0);
  });

  it('disables terminal mode when stdin is not a TTY (piped input, tests)', () => {
    const stdin = Readable.from(['hello\n']);
    const opts = replReadlineOptions(stdin, fakeTty(50, 200));
    expect(opts.terminal).toBe(false);
  });

  it('disables terminal mode when stdout is not a TTY (output redirected)', () => {
    const stdout = new Writable({ write(_c, _e, cb) { cb(); } });
    const opts = replReadlineOptions(fakeTtyReadable(), stdout);
    expect(opts.terminal).toBe(false);
  });
});
