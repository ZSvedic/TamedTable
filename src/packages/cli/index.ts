#!/usr/bin/env -S bun run
import * as readline from 'node:readline/promises';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  loadEnv,
  validateSpec,
  type Row,
  type Spec,
  type Transformation,
} from '@tamedtable/core';
import {
  createHeadlessRunner,
  type ChunkUpdate,
  type HeadlessRunner,
  type HeadlessRunnerOptions,
  type PlanItem,
  type RequestDebugInfo,
} from '@tamedtable/headless';
import { resolveConfig } from '@tamedtable/model-config';
import { readConfigFromEnv } from '@tamedtable/model-config/env';

export interface CliRunnerOptions extends HeadlessRunnerOptions {
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
  stdin?: NodeJS.ReadableStream;
  quiet?: boolean;
}

export interface CliRunner {
  loadInput(path: string): Promise<void>;
  request(text: string, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void }): Promise<void>;
  setSpec(spec: Spec): Promise<void>;
  currentRows(): Row[];
  currentSpec(): Spec;
  exportAs(path: string): Promise<void>;
  viewportSummary(): string;
}

export interface RunCliResult {
  exitCode: number;
  stderr: string;
}

export const REPL_FALLBACK_ROWS = 10;
export const REPL_FALLBACK_COLS = 5;
export const REPL_PAGE_SIZE = REPL_FALLBACK_ROWS;
export const REPL_COL_PAGE_SIZE = REPL_FALLBACK_COLS;
const REPL_CHROME_LINES = 5;
// Auto-fit width budget: per-column visual cost = average cell width plus the
// " | " separator. 16 is a deliberate compromise: at the default 80-col TTY
// the result equals REPL_FALLBACK_COLS (5), so users see the same view they
// had before the auto-fit was wired up; wider terminals get proportionally
// more columns. Users override via :viewport when their data needs a
// different ratio.
const REPL_AVG_COL_WIDTH = 16;
const REPL_INDENT = 1;

/** Build the option object for `readline.createInterface` used by the REPL.
 *  Exported so tests (and any embedder) can verify terminal-mode wiring
 *  without standing up the full REPL loop. `terminal: true` enables
 *  Node's line editor — Up/Down for history, Left/Right for cursor — and
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

const CLI_USAGE_TEXT = `tamedtable — work tables in your terminal with natural-language requests.

Usage:
  tamedtable <input>                 Open <input> in the interactive REPL.
                                     <input> is a .csv or .jsonl file.
                                     Once inside, type :help for commands.
  tamedtable execute <flow>          Replay a saved .flow against an input.
                                     No LLM call; no API key needed.
    --input  <file>                  Source .csv or .jsonl. Overrides the
                                     source path recorded in <flow>.
    --output <file>                  Destination .jsonl. Required.
  tamedtable --help, -h, help        Show this usage screen.

The REPL needs ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in env.
`;

const HELP_TEXT = `TamedTable — interactive table editor. Natural-language requests edit the
spec; results stream in. The table reprints after any state or viewport
change.

State / data commands:
  :load <path>       Load CSV/JSONL as new input. Resets transformations,
                     viewport, cache.
  :save <path>       Write current rows to JSONL.
  :save-flow <path>  Write current spec as a .flow file.
  :save-py <path>    Write current flow as a standalone Python script.
  :reorder <cols>    Reorder columns (comma/space separated); sets the table
                     view and CSV/JSONL output column order.
  :undo              Pop the last applied patch.
  :redo              Replay the last :undo'd patch.
  :history           Print the patch journal.

View / navigation:
  :show [rows|cols start|prev|next|end|{N}]
                     Move viewport on the named axis, or jump to row/col N.
                     Bare :show reprints the current viewport.
  :viewport [<R>|auto] [<C>|auto]
                     Pin viewport page size; auto re-fits to terminal.
                     Bare :viewport prints current size and source.
  :find {<substring>|/<regex>/}
                     Case-insensitive search; viewport snaps to the first
                     match and the reprint wraps it in *asterisks*.

Inspection / session:
  :schema            Print the current column list.
  :help              Show this usage screen.
  :exit              Quit (also: bare "exit").

Anything not starting with ":" is sent to the spec editor as a natural-
language request — e.g. "normalize phone numbers", "sort by DOB desc".
Requests are additive; use :undo to revert the last one.

Ctrl-C: cancel in-flight request, or quit when idle. Requires
ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in env.
`;

// ── Pure formatting helpers ────────────────────────────────────────────────

function stringify(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}… (+${s.length - n} chars)` : s);

function wrapHighlight(text: string, re: RegExp | undefined): string {
  if (!re) return text;
  return text.replace(re, (m) => `*${m}*`);
}

// #FormatOut
export function renderTable(
  spec: Spec,
  rows: Row[],
  rowOffset = 0,
  colOffset = 0,
  highlight?: RegExp,
  pageRows: number = REPL_FALLBACK_ROWS,
  pageCols: number = REPL_FALLBACK_COLS
): string {
  const allCols = spec.columns.map((c) => c.id);
  const totalRows = rows.length;
  const totalCols = allCols.length;
  const rStart = Math.max(0, Math.min(rowOffset, Math.max(0, totalRows - 1)));
  const rEnd = Math.min(totalRows, rStart + pageRows);
  const cStart = Math.max(0, Math.min(colOffset, Math.max(0, totalCols - 1)));
  const cEnd = Math.min(totalCols, cStart + pageCols);
  const visibleRows = rows.slice(rStart, rEnd);
  const visibleCols = allCols.slice(cStart, cEnd);
  const rowsBefore = rStart;
  const rowsAfter = Math.max(0, totalRows - rEnd);
  const colsBefore = cStart;
  const colsAfter = Math.max(0, totalCols - cEnd);

  const cellText = (r: Row, c: string) => wrapHighlight(stringify(r[c]), highlight);

  // Header (with optional column markers on edges).
  const headerCells: string[] = [];
  if (colsBefore > 0) headerCells.push(`...${colsBefore} more cols.`);
  for (const c of visibleCols) headerCells.push(c);
  if (colsAfter > 0) headerCells.push(`...${colsAfter} more cols.`);

  // Compute widths from header + visible body.
  const widths = headerCells.map((h) => h.length);
  const bodyCells: string[][] = visibleRows.map((r) => {
    const cells: string[] = [];
    if (colsBefore > 0) cells.push('');
    for (const c of visibleCols) cells.push(cellText(r, c));
    if (colsAfter > 0) cells.push('');
    return cells;
  });
  for (const row of bodyCells) {
    for (let i = 0; i < row.length; i++) {
      if ((row[i] ?? '').length > (widths[i] ?? 0)) widths[i] = (row[i] ?? '').length;
    }
  }

  const fmt = (vals: string[]) => ' ' + vals.map((v, i) => v.padEnd(widths[i] ?? 0)).join(' | ');

  const lines: string[] = [];
  lines.push(fmt(headerCells));
  if (rowsBefore > 0) {
    const marker = `...${rowsBefore} more rows.`;
    const cells: string[] = headerCells.map(() => '');
    cells[0] = marker;
    lines.push(fmt(cells));
  }
  for (const row of bodyCells) lines.push(fmt(row));
  if (rowsAfter > 0) {
    const marker = `...${rowsAfter} more rows.`;
    const cells: string[] = headerCells.map(() => '');
    cells[0] = marker;
    lines.push(fmt(cells));
  }
  return lines.join('\n');
}

function describeExpr(e: { js?: string; llm?: string; sql?: string }, n: number): string {
  if ('js' in e && typeof e.js === 'string') return `JS: ${trunc(e.js, n)}`;
  if ('sql' in e && typeof e.sql === 'string') return `SQL: ${trunc(e.sql, n)}`;
  if ('llm' in e && typeof e.llm === 'string') return `LLM: ${trunc(e.llm, n)}`;
  return '<expr>';
}

function describeTransformation(t: Transformation): string {
  switch (t.kind) {
    case 'filter':
      return `filter rows where ${describeExpr(t.pred as { js?: string; llm?: string; sql?: string }, 60)}`;
    case 'select':
      return `keep columns: ${t.columns.join(', ')}`;
    case 'sort':
      return `sort by: ${t.by.map((b) => `${typeof b.key === 'string' ? b.key : '<expr>'} ${b.dir}`).join(', ')}`;
    case 'mutate': {
      const cols = Array.isArray(t.columns) ? t.columns.join(', ') : t.columns;
      return `set '${cols}' via ${describeExpr(t.value as { js?: string; llm?: string; sql?: string }, 80)}`;
    }
    case 'group': {
      const byNames = t.by.map((b) => typeof b === 'string' ? b : '<expr>').join(', ');
      const aggCols = Object.keys(t.agg).join(', ');
      return `group by ${byNames}, agg: ${aggCols}`;
    }
    case 'join':
      return `${t.how ?? 'left'} join with ${t.with}`;
    case 'split':
      return `split ${t.from} into ${t.into.join(', ')}`;
    case 'validate':
      return `validate${t.threshold !== undefined ? ` (threshold ${t.threshold * 100}%)` : ''}`;
    case 'pivot':
      return `pivot on ${t.on} (agg=${t.agg ?? 'first'})`;
    case 'unpivot':
      return `unpivot measures: ${t.measures.join(', ')}`;
  }
}

function formatPlanItem(item: PlanItem): string {
  switch (item.kind) {
    case 'add-column':           return `add column '${item.id}'`;
    case 'remove-column':        return `remove column '${item.id}'`;
    case 'reorder-columns':      return `reorder columns to: ${item.to.join(', ')}`;
    case 'add-transformation':   return `apply: ${describeTransformation(item.transformation)}`;
    case 'remove-transformation': return `undo: ${describeTransformation(item.transformation)}`;
  }
}

function userFacingMessage(message: string): string {
  if (message.startsWith('Runner: recovery budget exhausted'))
    return "Couldn't apply that change after 3 attempts. Try rephrasing or breaking it into smaller steps.";
  if (message === 'Runner: cancelled') return 'Cancelled.';
  if (message === 'Runner: a request is already in progress.') return 'A request is already running.';
  return message;
}

// ── Debug block ────────────────────────────────────────────────────────────

/** The debug block is on by default; TAMEDTABLE_DEBUG=0/false/off disables it. */
export function debugEnabled(): boolean {
  const flag = (process.env.TAMEDTABLE_DEBUG ?? '').trim().toLowerCase();
  return flag !== '0' && flag !== 'false' && flag !== 'off';
}

/** `claude-sonnet-4-6` → `Sonnet 4.6`; any other id renders verbatim. */
export function renderModelName(id: string): string {
  const m = id.match(/^claude-([a-z]+)-(\d+)-(\d+)/);
  if (!m) return id;
  return `${m[1]![0]!.toUpperCase()}${m[1]!.slice(1)} ${m[2]}.${m[3]}`;
}

// #DebugOut
function formatDebugSummary(info: RequestDebugInfo): string {
  const grp = (n: number) => n.toLocaleString('en-US');
  const calls = info.modelCalls.map((m) => `${renderModelName(m.model)} ×${m.calls}`).join(', ');
  const total = info.inputTokens + info.outputTokens;
  return `${calls} · ${grp(total)} tokens (${grp(info.inputTokens)} in / ${grp(info.outputTokens)} out) · ${(info.elapsedMs / 1000).toFixed(1)}s`;
}

/** Content lines of the debug block (no `[debug]` prefix). A request that
 *  committed shows its executed expressions; one that never committed shows
 *  the recovery turns. The last line is always the usage summary. */
export function formatDebugBlock(info: RequestDebugInfo): string[] {
  const succeeded = info.turns.some((t) => t.outcome === 'committed');
  const lines: string[] = [];
  if (succeeded) {
    for (const e of info.expressions) lines.push(`${e.label}: ${clip(e.body, 200)}`);
  } else {
    info.turns.forEach((t, i) => {
      lines.push(`turn ${i + 1}/${info.turns.length}: ops=${clip(JSON.stringify(t.ops), 200)}`);
      lines.push(`  → outcome: ${t.outcome || 'unknown'}`);
      if (t.sentBack) lines.push(`  → sent back: ${trunc(t.sentBack, 120)}`);
    });
  }
  lines.push(formatDebugSummary(info));
  return lines;
}

function writeDebugBlock(info: RequestDebugInfo, stdout: NodeJS.WritableStream): void {
  if (!debugEnabled()) return;
  const useColor = Boolean((stdout as { isTTY?: boolean }).isTTY);
  const lines = formatDebugBlock(info);
  const MAX = 20;
  const out = lines.length > MAX
    ? [...lines.slice(0, MAX - 1), `… (+${lines.length - MAX + 1} more lines)`]
    : lines;
  for (const line of out) {
    const text = `    [debug] ${line}`;
    stdout.write((useColor ? `\x1b[2m${text}\x1b[0m` : text) + '\n');
  }
}

// #ErrHandle
function renderError(err: Error, stdout: NodeJS.WritableStream): void {
  stdout.write(`error: ${userFacingMessage(err.message)}\n`);
  const dbg = (err as Error & { debug?: RequestDebugInfo }).debug;
  if (dbg) writeDebugBlock(dbg, stdout);
}

// ── CLI runner (REPL printing wrapper around headless) ─────────────────────

interface JournalEntry {
  request: string;
  prevSpec: Spec;
  newSpec: Spec;
  status: 'committed' | 'undone';
}

class CliRunnerImpl implements CliRunner {
  private headless: HeadlessRunner;
  private stdout: NodeJS.WritableStream;
  private quiet: boolean;
  private rowOffset = 0;
  private colOffset = 0;
  private pinRows: number | null = null;
  private pinCols: number | null = null;
  private journal: JournalEntry[] = [];
  private redoStack: JournalEntry[] = [];
  private highlight: RegExp | undefined;
  private loadedPath = '';

  constructor(opts: CliRunnerOptions) {
    this.stdout = opts.stdout ?? process.stdout;
    this.quiet = opts.quiet ?? true;
    this.headless = createHeadlessRunner({
      ...opts,
      onChunk: opts.onChunk ?? ((u) => this.printChunk(u)),
      onPlan: opts.onPlan ?? ((items) => this.printPlan(items)),
      onDebug: opts.onDebug ?? ((info) => this.printDebug(info)),
    });
  }

  private printChunk(u: ChunkUpdate): void {
    if (this.quiet) return;
    const before = u.before === null || u.before === undefined ? '' : String(u.before);
    const after = u.after === null || u.after === undefined ? 'null' : String(u.after);
    this.stdout.write(`running … row ${u.rowIndex + 1}: ${u.column} "${before}" → "${after}"\n`);
  }

  private printPlan(items: PlanItem[]): void {
    if (this.quiet || items.length === 0) return;
    this.stdout.write('plan:\n');
    for (const item of items) this.stdout.write(`  • ${formatPlanItem(item)}\n`);
  }

  private printDebug(info: RequestDebugInfo): void {
    if (this.quiet) return;
    // The success-path block prints here, before the table reprint. A failed
    // request renders via renderError instead, so its error line comes first.
    if (info.turns.some((t) => t.outcome === 'committed')) writeDebugBlock(info, this.stdout);
  }

  private autoRows(): number {
    const isTTY = Boolean((this.stdout as { isTTY?: boolean }).isTTY);
    if (!isTTY) return REPL_FALLBACK_ROWS;
    const rows = (this.stdout as { rows?: number }).rows;
    if (!rows || rows <= REPL_CHROME_LINES) return REPL_FALLBACK_ROWS;
    return Math.max(1, rows - REPL_CHROME_LINES);
  }

  private autoCols(): number {
    const isTTY = Boolean((this.stdout as { isTTY?: boolean }).isTTY);
    if (!isTTY) return REPL_FALLBACK_COLS;
    const termCols = (this.stdout as { columns?: number }).columns;
    if (!termCols || termCols <= 0) return REPL_FALLBACK_COLS;
    // Estimate columns that fit at REPL_AVG_COL_WIDTH chars each (cell + ` | `
    // separator). The estimate is intentionally conservative so values longer
    // than the avg still align; users widen further via `:viewport`.
    const fit = Math.floor((termCols - REPL_INDENT) / REPL_AVG_COL_WIDTH);
    return Math.max(REPL_FALLBACK_COLS, fit);
  }

  private effectiveRows(): number { return this.pinRows ?? this.autoRows(); }
  private effectiveCols(): number { return this.pinCols ?? this.autoCols(); }

  viewportSummary(): string {
    const r = this.effectiveRows();
    const c = this.effectiveCols();
    const rs = this.pinRows == null ? 'auto' : 'manual';
    const cs = this.pinCols == null ? 'auto' : 'manual';
    return `viewport: ${r} rows (${rs}) × ${c} cols (${cs})`;
  }

  setViewport(rows: number | null | undefined, cols: number | null | undefined): void {
    // `undefined` means "leave this axis alone"; `null` means "clear the pin (auto)".
    if (rows !== undefined) this.pinRows = rows;
    if (cols !== undefined) this.pinCols = cols;
    this.clampCursorToPage();
  }

  private clampCursorToPage(): void {
    const totalRows = this.headless.currentRows().length;
    const totalCols = this.headless.currentSpec().columns.length;
    const pageR = this.effectiveRows();
    const pageC = this.effectiveCols();
    const lastRowPage = Math.max(0, Math.floor(Math.max(0, totalRows - 1) / pageR) * pageR);
    const lastColPage = Math.max(0, Math.floor(Math.max(0, totalCols - 1) / pageC) * pageC);
    if (this.rowOffset > lastRowPage) this.rowOffset = lastRowPage;
    if (this.colOffset > lastColPage) this.colOffset = lastColPage;
  }

  printTable(): void {
    const out = renderTable(
      this.headless.currentSpec(),
      this.headless.currentRows(),
      this.rowOffset,
      this.colOffset,
      this.highlight,
      this.effectiveRows(),
      this.effectiveCols()
    );
    this.stdout.write(out + '\n');
    this.highlight = undefined;
  }

  private resetViewport(): void {
    this.rowOffset = 0;
    this.colOffset = 0;
    this.highlight = undefined;
  }

  async loadInput(p: string): Promise<void> {
    await this.headless.loadInput(p);
    this.loadedPath = p;
    this.journal = [];
    this.redoStack = [];
    this.resetViewport();
    if (!this.quiet) this.printTable();
  }

  async request(text: string, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void }): Promise<void> {
    const prevSpec = structuredClone(this.headless.currentSpec());
    await this.headless.request(text, opts);
    const newSpec = structuredClone(this.headless.currentSpec());
    this.journal.push({ request: text, prevSpec, newSpec, status: 'committed' });
    this.redoStack = [];
    this.resetViewport();
    if (!this.quiet) this.printTable();
  }

  async setSpec(spec: Spec): Promise<void> { await this.headless.setSpec(spec); }
  currentRows(): Row[] { return this.headless.currentRows(); }
  currentSpec(): Spec { return this.headless.currentSpec(); }
  async exportAs(p: string): Promise<void> { await this.headless.exportAs(p); }
  async exportPython(): Promise<string> { return this.headless.exportPython(); }

  // ── Colon-command internals ──────────────────────────────────────────────

  getStdout(): NodeJS.WritableStream { return this.stdout; }
  getLoadedPath(): string { return this.loadedPath; }
  getJournal(): JournalEntry[] { return this.journal; }
  setHighlight(re: RegExp | undefined): void { this.highlight = re; }

  async undo(): Promise<{ ok: boolean; message?: string }> {
    // Journal-based undo: revert the last committed user turn.
    const idx = this.findLastCommittedIndex();
    if (idx >= 0) {
      const entry = this.journal[idx]!;
      await this.headless.setSpec(entry.prevSpec);
      entry.status = 'undone';
      this.redoStack.push(entry);
      this.resetViewport();
      return { ok: true, message: `undid: ${trunc(entry.request, 80)}` };
    }
    // Legacy fall-back: pop the last transformation set via `setSpec` (no turn recorded).
    const spec = this.headless.currentSpec();
    if (spec.transformations.length === 0) return { ok: false };
    const popped = spec.transformations[spec.transformations.length - 1] as Transformation;
    await this.headless.setSpec({ ...spec, transformations: spec.transformations.slice(0, -1) });
    this.resetViewport();
    return { ok: true, message: `undid: ${describeTransformation(popped)}` };
  }

  async redo(): Promise<{ ok: boolean; message?: string }> {
    if (this.redoStack.length === 0) return { ok: false };
    const entry = this.redoStack.pop()!;
    await this.headless.setSpec(entry.newSpec);
    entry.status = 'committed';
    this.resetViewport();
    return { ok: true, message: `redid: ${trunc(entry.request, 80)}` };
  }

  private findLastCommittedIndex(): number {
    for (let i = this.journal.length - 1; i >= 0; i--) {
      if (this.journal[i]!.status === 'committed') return i;
    }
    return -1;
  }

  // Viewport navigation. Returns true if the call should reprint.
  showCmd(arg: string): boolean {
    if (arg === '') { this.highlight = undefined; return true; }
    const tokens = arg.split(/\s+/);
    if (tokens.length !== 2) {
      this.stdout.write(`:show: bad arguments. Try ":show", ":show rows next", or ":show cols 3".\n`);
      return false;
    }
    const [axis, pos] = tokens;
    if (axis !== 'rows' && axis !== 'cols') {
      this.stdout.write(`:show: axis must be "rows" or "cols", got "${axis}".\n`);
      return false;
    }
    const total = axis === 'rows' ? this.headless.currentRows().length : this.headless.currentSpec().columns.length;
    const pageSize = axis === 'rows' ? this.effectiveRows() : this.effectiveCols();
    let offset = axis === 'rows' ? this.rowOffset : this.colOffset;
    const lastPage = Math.max(0, Math.floor(Math.max(0, total - 1) / pageSize) * pageSize);
    if (pos === 'start') offset = 0;
    else if (pos === 'end') offset = lastPage;
    else if (pos === 'prev') offset = Math.max(0, offset - pageSize);
    else if (pos === 'next') offset = Math.min(lastPage, offset + pageSize);
    else if (pos && /^\d+$/.test(pos)) {
      const n = Number(pos);
      if (n < 1) offset = 0;
      else if (n > total) offset = lastPage;
      else offset = Math.floor((n - 1) / pageSize) * pageSize;
    } else {
      this.stdout.write(`:show: position must be one of: start, prev, next, end, <N>.\n`);
      return false;
    }
    if (axis === 'rows') this.rowOffset = offset; else this.colOffset = offset;
    this.highlight = undefined;
    return true;
  }

  // Find. Returns true if the call should reprint.
  findCmd(arg: string): { reprint: boolean; messages: string[] } {
    const messages: string[] = [];
    if (!arg) { messages.push(':find: missing pattern'); return { reprint: false, messages }; }
    let re: RegExp;
    const m = arg.match(/^\/(.+)\/$/);
    try {
      re = m ? new RegExp(m[1]!, 'gi') : new RegExp(arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    } catch (e) {
      messages.push(`:find: bad regex: ${(e as Error).message}`);
      return { reprint: false, messages };
    }
    const rows = this.headless.currentRows();
    const cols = this.headless.currentSpec().columns.map((c) => c.id);
    const pageR = this.effectiveRows();
    const pageC = this.effectiveCols();
    for (let ri = 0; ri < rows.length; ri++) {
      for (let ci = 0; ci < cols.length; ci++) {
        const cell = rows[ri]![cols[ci]!];
        if (typeof cell !== 'string') continue;
        if (cell.match(re)) {
          this.rowOffset = Math.floor(ri / pageR) * pageR;
          if (ci < this.colOffset || ci >= this.colOffset + pageC) {
            this.colOffset = Math.floor(ci / pageC) * pageC;
          }
          this.highlight = re;
          return { reprint: true, messages };
        }
      }
    }
    messages.push('no match');
    return { reprint: false, messages };
  }

  history(): string[] {
    return this.journal.map((e, i) => `${i + 1}. ${e.request}  [${e.status}]`);
  }

  schema(): string[] {
    return this.headless.currentSpec().columns.map((c) => {
      const parts = [c.id];
      if (c.label) parts.push(`label="${c.label}"`);
      if (c.format) parts.push(`format="${c.format}"`);
      return parts.join('  ');
    });
  }

  // reorder the column list. Named columns move to the front in the given
  // order; any columns not named keep their relative order after them. The
  // new order drives both the table view and CSV/JSONL output.
  async reorderCmd(arg: string): Promise<{ ok: boolean; messages: string[] }> {
    const wanted = arg.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (wanted.length === 0) {
      return { ok: false, messages: [':reorder: missing column list. Usage: :reorder <col1,col2,...>'] };
    }
    const spec = this.headless.currentSpec();
    const existing = spec.columns.map((c) => c.id);
    const unknown = wanted.find((id) => !existing.includes(id));
    if (unknown) return { ok: false, messages: [`:reorder: unknown column "${unknown}"`] };
    const named = new Set(wanted);
    const newOrder = [...wanted, ...existing.filter((id) => !named.has(id))];
    const byId = new Map(spec.columns.map((c) => [c.id, c]));
    await this.headless.setSpec({ ...spec, columns: newOrder.map((id) => byId.get(id)!) });
    this.resetViewport();
    return { ok: true, messages: [`reordered columns: ${newOrder.join(', ')}`] };
  }
}

export function createCliRunner(opts: CliRunnerOptions = {}): CliRunner {
  return new CliRunnerImpl(opts);
}

// ── Colon commands ─────────────────────────────────────────────────────────

export type ColonCommandAction = 'exit' | 'handled' | 'unhandled';

function splitCmd(text: string): { cmd: string; arg: string } {
  const sp = text.indexOf(' ');
  return sp < 0 ? { cmd: text, arg: '' } : { cmd: text.slice(0, sp), arg: text.slice(sp + 1).trim() };
}

async function runWithErrorRender(stdout: NodeJS.WritableStream, fn: () => Promise<void>): Promise<void> {
  try { await fn(); } catch (e) { renderError(e as Error, stdout); }
}

type ColonCommandHandler = (arg: string, runner: CliRunnerImpl, stdout: NodeJS.WritableStream) => Promise<void> | void;

// #ReplCmds
const COLON_COMMANDS: Record<string, ColonCommandHandler> = {
  ':help'(_arg, _r, stdout) { stdout.write(HELP_TEXT); },

  ':history'(_arg, runner, stdout) {
    const lines = runner.history();
    if (lines.length === 0) { stdout.write('(no history)\n'); return; }
    for (const line of lines) stdout.write(line + '\n');
  },

  ':schema'(_arg, runner, stdout) {
    for (const line of runner.schema()) stdout.write(line + '\n');
  },

  async ':undo'(_arg, runner, stdout) {
    await runWithErrorRender(stdout, async () => {
      const res = await runner.undo();
      if (!res.ok) { stdout.write('nothing to undo.\n'); return; }
      if (res.message) stdout.write(res.message + '\n');
      runner.printTable();
    });
  },

  async ':redo'(_arg, runner, stdout) {
    await runWithErrorRender(stdout, async () => {
      const res = await runner.redo();
      if (!res.ok) { stdout.write('nothing to redo.\n'); return; }
      if (res.message) stdout.write(res.message + '\n');
      runner.printTable();
    });
  },

  ':show'(arg, runner, _stdout) {
    if (runner.showCmd(arg)) runner.printTable();
  },

  ':viewport'(arg, runner, stdout) {
    const res = parseViewportArgs(arg);
    if (res.kind === 'print') { stdout.write(runner.viewportSummary() + '\n'); return; }
    if (res.kind === 'invalid') { stdout.write(':viewport: invalid size\n'); return; }
    if (res.kind === 'usage') { stdout.write(':viewport: usage: :viewport [<rows>|auto] [<cols>|auto]\n'); return; }
    runner.setViewport(res.rows, res.cols);
    runner.printTable();
  },

  ':find'(arg, runner, stdout) {
    const res = runner.findCmd(arg);
    for (const m of res.messages) stdout.write(m + '\n');
    if (res.reprint) runner.printTable();
  },

  async ':reorder'(arg, runner, stdout) {
    await runWithErrorRender(stdout, async () => {
      const res = await runner.reorderCmd(arg);
      for (const m of res.messages) stdout.write(m + '\n');
      if (res.ok) runner.printTable();
    });
  },

  async ':load'(arg, runner, stdout) {
    if (!arg) { stdout.write(':load: missing path\n'); return; }
    const ext = arg.slice(arg.lastIndexOf('.')).toLowerCase();
    if (ext !== '.csv' && ext !== '.jsonl') { stdout.write(':load: unknown file type\n'); return; }
    await runWithErrorRender(stdout, async () => {
      // Try the literal path first, then a spec/test-cases/ fallback so feature files can name
      // a fixture by bare filename (matching the `tamedtable execute` resolveFile convention).
      const resolved = await resolveLoadPath(arg);
      await runner.loadInput(resolved ?? arg);
      const rows = runner.currentRows().length;
      const cols = runner.currentSpec().columns.length;
      stdout.write(`Loaded ${arg} (${rows} rows, ${cols} cols)\n`);
      runner.printTable();
    });
  },

  async ':save'(arg, runner, stdout) {
    if (!arg) { stdout.write(':save: missing path. Usage: :save <output.jsonl|.csv>\n'); return; }
    const ext = arg.slice(arg.lastIndexOf('.')).toLowerCase();
    if (ext !== '.jsonl' && ext !== '.csv') { stdout.write(':save: unknown file type\n'); return; }
    await runWithErrorRender(stdout, async () => {
      await runner.exportAs(arg);
      stdout.write(`saved ${runner.currentRows().length} rows to ${arg}\n`);
    });
  },

  async ':save-flow'(arg, runner, stdout) {
    if (!arg) { stdout.write(':save-flow: missing path. Usage: :save-flow <out.flow>\n'); return; }
    const spec = runner.currentSpec();
    if (!spec.table) { stdout.write(':save-flow: spec has no source CSV table; cannot write a flow.\n'); return; }
    await runWithErrorRender(stdout, async () => {
      const flowDir = path.dirname(path.resolve(arg));
      const absSource = path.resolve(spec.table!);
      const rel = path.relative(flowDir, absSource);
      const source = rel.startsWith('..') ? absSource : rel;
      await writeFile(arg, JSON.stringify({ version: 2, source, spec }, null, 2) + '\n', 'utf8');
      stdout.write(`saved flow (${spec.transformations.length} transformations) to ${arg}\n`);
    });
  },

  // #PyExport
  async ':save-py'(arg, runner, stdout) {
    if (!arg) { stdout.write(':save-py: missing path\n'); return; }
    if (!arg.toLowerCase().endsWith('.py')) { stdout.write(':save-py: output must be a .py file\n'); return; }
    // A flow with an {llm} cell can't be reproduced offline, so refuse it
    // before spending a model call on the translation.
    if (specHasLlmCell(runner.currentSpec())) {
      stdout.write(':save-py: flow contains LLM cells; cannot export to Python\n');
      return;
    }
    await runWithErrorRender(stdout, async () => {
      const script = await runner.exportPython();
      await writeFile(arg, script, 'utf8');
      stdout.write(`saved Python script to ${arg}\n`);
    });
  },
};

/** True if any transformation carries an {llm} expression. `:save-py`
 *  refuses such flows — a live AI cell has no deterministic Python form. */
function specHasLlmCell(spec: Spec): boolean {
  const isLlm = (e: unknown): boolean =>
    typeof e === 'object' && e !== null && !(e instanceof RegExp) && 'llm' in e;
  for (const t of spec.transformations as Transformation[]) {
    const exprs: unknown[] = [];
    switch (t.kind) {
      case 'filter':                 exprs.push(t.pred); break;
      case 'validate':               exprs.push(t.pred); if (t.message) exprs.push(t.message); break;
      case 'mutate':                 exprs.push(t.value); break;
      case 'sort':                   for (const b of t.by) exprs.push(b.key); break;
      case 'group':                  exprs.push(...t.by, ...Object.values(t.agg)); break;
      case 'join':                   exprs.push(t.on); break;
      case 'split':                  exprs.push(t.on); break;
      case 'select': case 'pivot': case 'unpivot': break;
    }
    if (exprs.some(isLlm)) return true;
  }
  return false;
}

type ViewportParse =
  | { kind: 'print' }
  | { kind: 'invalid' }
  | { kind: 'usage' }
  | { kind: 'set'; rows: number | null | undefined; cols: number | null | undefined };

function parseViewportArgs(arg: string): ViewportParse {
  const trimmed = arg.trim();
  if (trimmed === '') return { kind: 'print' };
  const tokens = trimmed.split(/\s+/);
  if (tokens.length > 2) return { kind: 'usage' };
  // The spec carves out exactly one single-arg shorthand: `auto` == `auto auto`.
  // Single-integer or other single-token forms are unsupported → usage.
  if (tokens.length === 1) {
    if (tokens[0] === 'auto') return { kind: 'set', rows: null, cols: null };
    return { kind: 'usage' };
  }
  const [rTok, cTok] = tokens;
  const parseAxis = (tok: string): number | null | 'invalid' | 'usage' => {
    if (tok === 'auto') return null;
    if (/^-?\d+$/.test(tok)) {
      const n = Number(tok);
      return n <= 0 ? 'invalid' : n;
    }
    return 'usage';
  };
  const r = parseAxis(rTok!);
  const c = parseAxis(cTok!);
  if (r === 'usage' || c === 'usage') return { kind: 'usage' };
  if (r === 'invalid' || c === 'invalid') return { kind: 'invalid' };
  return { kind: 'set', rows: r, cols: c };
}

async function resolveLoadPath(p: string): Promise<string | undefined> {
  if (path.isAbsolute(p)) {
    try { await readFile(p, 'utf8'); return p; } catch { return undefined; }
  }
  const candidates = [p, path.join('..', 'spec', 'test-cases', p)];
  for (const cand of candidates) {
    try { await readFile(cand, 'utf8'); return cand; } catch {}
  }
  return undefined;
}

/**
 * Handle REPL colon commands and bare-word aliases. Returns:
 *  - `'exit'` for `exit` / `:exit` (caller should break out of the loop).
 *  - `'handled'` for any recognized command (caller reprints prompt and continues).
 *  - `'unhandled'` for any other input (caller passes it through to the LLM).
 * Exported so tests can drive it directly without standing up the readline loop.
 */
export async function handleColonCommand(
  text: string,
  runner: CliRunner,
  stdout: NodeJS.WritableStream
): Promise<ColonCommandAction> {
  if (text === 'exit' || text === ':exit') return 'exit';
  const { cmd, arg } = splitCmd(text);
  const handler = COLON_COMMANDS[cmd];
  if (!handler) return 'unhandled';
  await handler(arg, runner as CliRunnerImpl, stdout);
  return 'handled';
}

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

  let spec: Spec;
  try {
    spec = validateSpec(flow.spec);
  } catch (e) {
    return fail(2, `tamedtable execute: ${flowPath}: ${(e as Error).message}`);
  }

  const csvCandidate = flags.input ?? flow.source;
  if (!csvCandidate) return fail(1, 'tamedtable execute: no input CSV (no --input and flow has no source)');
  const abs = (p: string) => (path.isAbsolute(p) ? p : path.join(flowDir, p));
  const csvPath = abs(csvCandidate);
  const outputPath = abs(flags.output);

  // execute doesn't need an API key (no LLM call), but pass one if available so
  // the headless provider can build without throwing on a missing key.
  if (!opts.apiKey) {
    const cfg = resolveConfig(readConfigFromEnv(), {});
    const envKey = cfg.provider === 'gemini' ? cfg.geminiKey : cfg.anthropicKey;
    if (envKey) opts = { ...opts, apiKey: envKey };
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
  // Resolve provider/key/model from env; let opts override (tests inject apiKey/model directly).
  if (!opts.apiKey) {
    const cfg = resolveConfig(readConfigFromEnv(), {});
    const envKey = cfg.provider === 'gemini' ? cfg.geminiKey : cfg.anthropicKey;
    if (envKey) opts = { ...opts, apiKey: envKey };
    if (!opts.model) opts = { ...opts, model: cfg.model };
    if (!opts.cellModel) opts = { ...opts, cellModel: cfg.cellModel };
  }
  const runner = createCliRunner({ ...opts, quiet: false, stdout }) as CliRunnerImpl;
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
  // buffered lines — rl.prompt() then throws ERR_USE_AFTER_CLOSE, and its
  // redraw is moot anyway — so write the glyph directly.
  let rlClosed = false;
  rl.on('close', () => { rlClosed = true; });
  const prompt = () => {
    if (rlOpts.terminal) { if (!rlClosed) rl.prompt(); }
    else stdout.write('> ');
  };
  const onSigint = () => { activeRequest ? activeRequest.abort() : rl.close(); };
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
