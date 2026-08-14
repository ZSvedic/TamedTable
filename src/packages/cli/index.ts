#!/usr/bin/env -S bun run
// Binary surface: flags, the `execute` subcommand, and the REPL input loop.
// Session state and colon commands live in session.ts; the table renderer in
// render.ts; the two usage screens in help.ts.
import * as readline from 'node:readline/promises';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { loadEnv, validateTablePlan, type TablePlan } from '@tamedtable/core';
import { createHeadlessRunner } from '@tamedtable/headless';
import { resolveConfig, keyFor } from '@tamedtable/model-config';
import { readConfigFromEnv } from '@tamedtable/model-config/env';
import pkg from './package.json' with { type: 'json' };
import { CLI_USAGE_TEXT } from './help.ts';
import { createCliRunner, handleColonCommand, renderError, type CliRunnerOptions } from './session.ts';

export {
  createCliRunner,
  handleColonCommand,
  debugEnabled,
  renderModelName,
  formatDebugBlock,
  type CliRunner,
  type CliRunnerOptions,
  type ColonCommandAction,
} from './session.ts';
export {
  renderTable,
  REPL_FALLBACK_ROWS,
  REPL_FALLBACK_COLS,
  REPL_PAGE_SIZE,
  REPL_COL_PAGE_SIZE,
} from './render.ts';

export interface RunCliResult {
  exitCode: number;
  stderr: string;
}

/** Build the option object for `readline.createInterface` used by the REPL.
 *  Exported so tests (and any embedder) can verify terminal-mode wiring
 *  without standing up the full REPL loop. `terminal: true` enables
 *  Node's line editor (Up/Down for history, Left/Right for cursor) and
 *  requires both streams to be real TTYs; non-TTY streams (piped input,
 *  redirected output, the test harness) keep `terminal: false`. */
export function replReadlineOptions(
  stdin: NodeJS.ReadableStream,
  stdout: NodeJS.WritableStream
): { input: NodeJS.ReadableStream; output: NodeJS.WritableStream; terminal: boolean; historySize: number } {
  const inTTY  = Boolean((stdin  as { isTTY?: boolean }).isTTY);
  const outTTY = Boolean((stdout as { isTTY?: boolean }).isTTY);
  return {
    input: stdin,
    output: stdout,
    terminal: inTTY && outTTY,
    historySize: 200,
  };
}

// Version line for `--version` / `-v`, sourced from this package's manifest so
// it stays in sync with a single bump. See behavior.md §CLI/Discovery.
const VERSION_TEXT = `tamedtable ${pkg.version}\n`;

// ── Entry point: runCli + subcommands ──────────────────────────────────────
// #MainLoop

function makeFail(stderr: string[]) {
  return (code: number, msg: string): RunCliResult => {
    stderr.push(msg);
    return { exitCode: code, stderr: stderr.join('\n') };
  };
}

// #CliFlags
export async function runCli(argv: string[], opts: CliRunnerOptions = {}): Promise<RunCliResult> {
  const stderr: string[] = [];
  const fail = makeFail(stderr);

  if (argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    (opts.stdout ?? process.stdout).write(CLI_USAGE_TEXT);
    return { exitCode: 0, stderr: '' };
  }
  if (argv[0] === '--version' || argv[0] === '-v') {
    (opts.stdout ?? process.stdout).write(VERSION_TEXT);
    return { exitCode: 0, stderr: '' };
  }
  if (argv.length === 0) return fail(1, 'tamedtable: REPL mode requires a CSV or JSONL path. Try --help for usage.');
  if (argv[0] === 'execute') return runExecute(argv.slice(1), opts, stderr);
  if (argv[0]?.startsWith('-')) return fail(1, `tamedtable: unrecognized option ${argv[0]} (try --help)`);
  return runRepl(argv, opts, stderr);
}

// #CliParse
function parseExecuteFlags(rest: string[]): { flow?: string; input?: string; output?: string; err?: string } {
  if (rest.length === 0) return { err: 'missing <flow> argument' };
  const out: { flow?: string; input?: string; output?: string; err?: string } = { flow: rest[0] };
  for (let i = 1; i < rest.length; i++) {
    const a = rest[i]!;
    const eq = a.indexOf('=');
    const key = eq < 0 ? a : a.slice(0, eq);
    const inline = eq < 0 ? undefined : a.slice(eq + 1);
    if (key === '--input') out.input = inline ?? rest[++i];
    else if (key === '--output') out.output = inline ?? rest[++i];
    else return { err: `unrecognized argument ${a}` };
  }
  return out;
}

// #BatchExec
async function runExecute(rest: string[], opts: CliRunnerOptions, stderr: string[]): Promise<RunCliResult> {
  const fail = makeFail(stderr);
  const flags = parseExecuteFlags(rest);
  if (flags.err) return fail(1, `tamedtable execute: ${flags.err}`);
  if (!flags.output) return fail(1, 'tamedtable execute: --output is required');

  const flowPath = await resolveFile(flags.flow!);
  if (!flowPath) return fail(2, `tamedtable execute: cannot read ${flags.flow}`);
  const flowDir = path.dirname(flowPath);

  let flow: { version?: number; source?: string; spec?: unknown };
  try {
    flow = JSON.parse(await readFile(flowPath, 'utf8'));
  } catch (e) {
    return fail(2, `tamedtable execute: ${flowPath}: invalid JSON: ${(e as Error).message}`);
  }
  if (flow.version !== 1 && flow.version !== 2) {
    return fail(2, `tamedtable execute: ${flowPath}: version must be 1 or 2 (got ${flow.version ?? 'undefined'})`);
  }

  let spec: TablePlan;
  try {
    spec = validateTablePlan(flow.spec);
  } catch (e) {
    return fail(2, `tamedtable execute: ${flowPath}: ${(e as Error).message}`);
  }

  const csvCandidate = flags.input ?? flow.source;
  if (!csvCandidate) return fail(1, 'tamedtable execute: no input CSV (no --input and flow has no source)');
  // --input and --output are shell paths (relative to cwd, like the <flow> arg);
  // only the .flow file's embedded `source` is relative to the flow's own dir.
  const csvPath = flags.input !== undefined
    ? (await resolveFile(flags.input)) ?? flags.input
    : (path.isAbsolute(flow.source!) ? flow.source! : path.join(flowDir, flow.source!));
  const outputPath = path.isAbsolute(flags.output) ? flags.output : path.resolve(flags.output);

  // execute doesn't need an API key (no LLM call), but pass one if available so
  // the headless provider can build without throwing on a missing key.
  if (!opts.apiKey) {
    const cfg = resolveConfig(readConfigFromEnv(), {});
    const envKey = keyFor(cfg);
    if (envKey) opts = { ...opts, apiKey: envKey, provider: cfg.provider };
  }
  const runner = createHeadlessRunner(opts);
  try { await runner.loadInput(csvPath); } catch (e) { return fail(3, `tamedtable execute: ${(e as Error).message}`); }
  try { await runner.setSpec(spec); }      catch (e) { return fail(3, `tamedtable execute: ${(e as Error).message}`); }
  try { await runner.exportAs(outputPath); } catch (e) { return fail(4, `tamedtable execute: ${(e as Error).message}`); }
  return { exitCode: 0, stderr: stderr.join('\n') };
}

async function resolveFile(p: string): Promise<string | undefined> {
  // The spec/test-cases/ fallback is a dev convenience so feature files can
  // name a flow by bare filename; harmless for real users (path won't exist).
  const candidates = path.isAbsolute(p) ? [p] : [p, path.join('..', 'spec', 'test-cases', p)];
  for (const cand of candidates) {
    try { await readFile(cand, 'utf8'); return cand; } catch {}
  }
  return undefined;
}

// #MainLoop
async function runRepl(argv: string[], opts: CliRunnerOptions, stderr: string[]): Promise<RunCliResult> {
  const stdin = opts.stdin ?? process.stdin;
  const stdout = opts.stdout ?? process.stdout;
  // Resolve provider/key/model from env; let opts override (tests inject
  // apiKey/model directly). The provider travels with the key it belongs to:
  // the engine is told, not left to infer it from the model id.
  if (!opts.apiKey) {
    const cfg = resolveConfig(readConfigFromEnv(), {});
    const envKey = keyFor(cfg);
    if (envKey) opts = { ...opts, apiKey: envKey, provider: cfg.provider };
    if (!opts.model) opts = { ...opts, model: cfg.model };
    if (!opts.cellModel) opts = { ...opts, cellModel: cfg.cellModel };
  }
  const runner = createCliRunner({ ...opts, quiet: false, stdout });
  try {
    await runner.loadInput(argv[0]!);
  } catch (e) {
    stderr.push(`tamedtable: ${(e as Error).message}`);
    return { exitCode: 3, stderr: stderr.join('\n') };
  }
  let activeRequest: AbortController | null = null;
  const rlOpts = replReadlineOptions(stdin as NodeJS.ReadableStream, stdout as NodeJS.WritableStream);
  const rl = readline.createInterface(rlOpts);
  rl.setPrompt('> ');
  // The "> " glyph: in terminal mode rl.prompt() lets readline own the
  // line-redraw (a manual write would fight it). In batch mode the piped
  // stdin ends at once, so readline closes while the loop is still draining
  // buffered lines: rl.prompt() then throws ERR_USE_AFTER_CLOSE, and its
  // redraw is moot anyway, so write the glyph directly.
  let rlClosed = false;
  rl.on('close', () => { rlClosed = true; });
  const prompt = () => {
    if (rlOpts.terminal) { if (!rlClosed) rl.prompt(); }
    else stdout.write('> ');
  };
  const onSigint = () => { activeRequest ? activeRequest.abort() : rl.close(); };
  // Wired twice on purpose. A terminal-mode readline holds stdin in raw mode,
  // so ^C never becomes a process SIGINT: readline sees the keypress and, with
  // no 'SIGINT' listener of ours, closes the interface, which ends the `for
  // await` loop and takes the whole session down. A piped run is the mirror
  // image: no readline SIGINT event, only the process signal. Both paths reach
  // the same handler (see spec/code-contract.md § CLI).
  rl.on('SIGINT', onSigint);
  process.on('SIGINT', onSigint);
  stdout.write('Type :help for commands. Ctrl-C cancels a running request (or exits when idle).\n');
  try {
    prompt();
    for await (const line of rl) {
      const text = line.trim();
      if (!text) { prompt(); continue; }
      const action = await handleColonCommand(text, runner, stdout);
      if (action === 'exit') break;
      if (action === 'handled') { prompt(); continue; }
      const ctrl = new AbortController();
      activeRequest = ctrl;
      try { await runner.request(text, { signal: ctrl.signal }); }
      catch (e) { renderError(e as Error, stdout); }
      finally { activeRequest = null; }
      prompt();
    }
  } finally {
    rl.close();
    process.off('SIGINT', onSigint);
  }
  return { exitCode: 0, stderr: stderr.join('\n') };
}

if (import.meta.main) {
  loadEnv();
  const result = await runCli(process.argv.slice(2));
  if (result.stderr) process.stderr.write(result.stderr + '\n');
  process.exit(result.exitCode);
}
