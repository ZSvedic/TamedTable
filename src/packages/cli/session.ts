// One REPL session: the printing runner wrapper around headless (viewport,
// undo journal, debug block) and the colon-command dispatch.
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { formatForExtension, type Row, type TablePlan, type Transformation } from '@tamedtable/core';
import {
  createHeadlessRunner,
  specHasLlmCell,
  type ChunkUpdate,
  type HeadlessRunner,
  type HeadlessRunnerOptions,
  type PlanEdit,
  type RequestDebugInfo,
  type StepUpdate,
} from '@tamedtable/headless';
import { HELP_TEXT } from './help.ts';
import {
  clip,
  renderTable,
  trunc,
  REPL_AVG_COL_WIDTH,
  REPL_CHROME_LINES,
  REPL_FALLBACK_COLS,
  REPL_FALLBACK_ROWS,
  REPL_INDENT,
} from './render.ts';

export interface CliRunnerOptions extends HeadlessRunnerOptions {
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
  stdin?: NodeJS.ReadableStream;
  quiet?: boolean;
}

export interface CliRunner {
  loadInput(path: string): Promise<void>;
  request(text: string, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void }): Promise<void>;
  setSpec(spec: TablePlan): Promise<void>;
  currentRows(): Row[];
  currentSpec(): TablePlan;
  exportAs(path: string): Promise<void>;
  viewportSummary(): string;
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
      return `${t.how ?? 'left'} join with ${t.with ?? '(no file named)'}`;
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

function formatPlanItem(item: PlanEdit): string {
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
  // The cap drops from the middle, never the tail: the last line is the
  // mandatory model/token/time summary (spec/behavior.md § REPL).
  const out = lines.length > MAX
    ? [...lines.slice(0, MAX - 2), `… (+${lines.length - MAX + 1} more lines)`, lines[lines.length - 1]!]
    : lines;
  for (const line of out) {
    const text = `    [debug] ${line}`;
    stdout.write((useColor ? `\x1b[2m${text}\x1b[0m` : text) + '\n');
  }
}

// #ErrHandle
export function renderError(err: Error, stdout: NodeJS.WritableStream): void {
  stdout.write(`error: ${userFacingMessage(err.message)}\n`);
  const dbg = (err as Error & { debug?: RequestDebugInfo }).debug;
  if (dbg) writeDebugBlock(dbg, stdout);
}

// ── CLI runner (REPL printing wrapper around headless) ─────────────────────

interface JournalEntry {
  request: string;
  prevSpec: TablePlan;
  newSpec: TablePlan;
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
  // Live progress: rows entering the running step, the streamed-row counter,
  // and whether an in-place (TTY) counter line is open and needs a newline.
  private stepRowsTotal = 0;
  private rowsDone = 0;
  private progressLineOpen = false;

  constructor(opts: CliRunnerOptions) {
    this.stdout = opts.stdout ?? process.stdout;
    this.quiet = opts.quiet ?? true;
    this.headless = createHeadlessRunner({
      ...opts,
      onChunk: opts.onChunk ?? ((u) => this.printChunk(u)),
      onPlanEdits: opts.onPlanEdits ?? ((items) => this.printPlanEdits(items)),
      onDebug: opts.onDebug ?? ((info) => this.printDebug(info)),
    });
  }

  /** One line as each transformation starts, the same step labels the web
   *  chat's live progress shows. */
  private printStep(u: StepUpdate): void {
    if (this.quiet) return;
    this.closeProgressLine();
    this.stepRowsTotal = u.rows;
    this.rowsDone = 0;
    this.stdout.write(`step ${u.index + 1}/${u.total}: ${u.label} · ${u.rows} rows\n`);
  }

  /** Streamed-row counter for an AI-cell step. Interactive runs rewrite one
   *  line in place; non-TTY runs print only the step lines, so piped
   *  transcripts stay deterministic. */
  private printChunk(u: ChunkUpdate): void {
    if (this.quiet) return;
    if (!(this.stdout as { isTTY?: boolean }).isTTY) return;
    this.rowsDone = Math.max(this.rowsDone, u.rowIndex + 1);
    this.stdout.write(`\r  ${this.rowsDone}/${this.stepRowsTotal} rows`);
    this.progressLineOpen = true;
  }

  /** Finish an in-place counter line before any other output. */
  private closeProgressLine(): void {
    if (!this.progressLineOpen) return;
    this.stdout.write('\n');
    this.progressLineOpen = false;
  }

  private printPlanEdits(items: PlanEdit[]): void {
    if (this.quiet || items.length === 0) return;
    this.stdout.write('plan:\n');
    for (const item of items) this.stdout.write(`  • ${formatPlanItem(item)}\n`);
  }

  private printDebug(info: RequestDebugInfo): void {
    if (this.quiet) return;
    // onDebug fires on success and failure: either way the in-place counter
    // line must end before the next block starts.
    this.closeProgressLine();
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
    this.highlight = undefined; // a page-size change is a viewport event
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
    // The :find highlight is NOT cleared here: it lives until the next
    // viewport- or state-changing event (spec/behavior.md § REPL, `:find`), so
    // a bare :show, which is neither, reprints it still highlighted. The
    // events that do end it clear it themselves (resetViewport, a cursor move,
    // a page-size change, :reorder).
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

  async request(text: string, opts?: { signal?: AbortSignal; onChunk?: (u: ChunkUpdate) => void; onStep?: (u: StepUpdate) => void }): Promise<void> {
    const prevSpec = structuredClone(this.headless.currentSpec());
    try {
      await this.headless.request(text, { ...opts, onStep: opts?.onStep ?? ((u) => this.printStep(u)) });
    } finally {
      // A cancelled or failed request must not leave the counter line open.
      this.closeProgressLine();
    }
    const newSpec = structuredClone(this.headless.currentSpec());
    this.journal.push({ request: text, prevSpec, newSpec, status: 'committed' });
    this.redoStack = [];
    this.resetViewport();
    if (!this.quiet) this.printTable();
  }

  async setSpec(spec: TablePlan): Promise<void> { await this.headless.setSpec(spec); }
  currentRows(): Row[] { return this.headless.currentRows(); }
  currentSpec(): TablePlan { return this.headless.currentSpec(); }
  async exportAs(p: string): Promise<void> { await this.headless.exportAs(p); }
  async exportPython(): Promise<string> { return this.headless.exportPython(); }

  // ── Colon-command internals ──────────────────────────────────────────────

  getStdout(): NodeJS.WritableStream { return this.stdout; }
  getLoadedPath(): string { return this.loadedPath; }
  getJournal(): JournalEntry[] { return this.journal; }
  setHighlight(re: RegExp | undefined): void { this.highlight = re; }

  /** `:reorder` is not journaled, so a journal snapshot carries whatever column
   *  order was current when it was taken. Restoring it wholesale would silently
   *  revert a `:reorder` the undo message never mentions, so keep the order the
   *  session is showing now and take only the snapshot's own column set
   *  (spec/behavior.md § REPL, `:undo`). Columns the snapshot has and the
   *  current spec doesn't (the turn added them) keep their snapshot order at the
   *  end. */
  private keepingColumnOrder(snapshot: TablePlan): TablePlan {
    const shown = this.headless.currentSpec().columns.map((c) => c.id);
    const byId = new Map(snapshot.columns.map((c) => [c.id, c]));
    const inShownOrder = shown.map((id) => byId.get(id)).filter((c): c is TablePlan['columns'][number] => c !== undefined);
    const rest = snapshot.columns.filter((c) => !shown.includes(c.id));
    return { ...snapshot, columns: [...inShownOrder, ...rest] };
  }

  async undo(): Promise<{ ok: boolean; message?: string }> {
    // Journal-based undo: revert the last committed user turn.
    const idx = this.findLastCommittedIndex();
    if (idx >= 0) {
      const entry = this.journal[idx]!;
      await this.headless.setSpec(this.keepingColumnOrder(entry.prevSpec));
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
    await this.headless.setSpec(this.keepingColumnOrder(entry.newSpec));
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
    // Bare :show changes neither viewport nor state, it reprints exactly what
    // is on screen, highlight included.
    if (arg === '') return true;
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
    // The cursor stays where the user left it, :reorder is not one of the four
    // reset events (spec/behavior.md § REPL viewport). The :find highlight does
    // end here: reordering columns is a state change.
    this.highlight = undefined;
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
    // Delegate to the codec registry (#FormatOut) instead of a hardcoded
    // extension list, so every registered format: .csv, .jsonl, .parquet,
    // .arrow: loads the same way `loadInput`/`exportAs` already dispatch.
    if (!formatForExtension(arg)) { stdout.write(':load: unknown file type\n'); return; }
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
    if (!arg) { stdout.write(':save: missing path. Usage: :save <output.csv|.jsonl|.parquet|.arrow>\n'); return; }
    // Dispatch through the codec registry (#FormatOut): .csv, .jsonl, .parquet,
    // and .arrow all work: exportAs already writes any of them.
    if (!formatForExtension(arg)) { stdout.write(':save: unknown file type\n'); return; }
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
 *  - `'handled'` for a mistyped `:` command too: it reports the typo locally.
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
  if (!handler) {
    // A `:`-prefixed line is a command, so a typo is a typo, never a natural-
    // language request. Answering locally costs no model call and no wait
    // (spec/behavior.md § REPL).
    if (cmd.startsWith(':')) {
      stdout.write(`${cmd}: unknown command. Type :help for the command list.\n`);
      return 'handled';
    }
    return 'unhandled';
  }
  await handler(arg, runner as CliRunnerImpl, stdout);
  return 'handled';
}
