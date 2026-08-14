// #Patch
// Undo/redo plus browser-gesture → spec-patch translation. The journal itself
// (the surface-agnostic snapshot stack) lives in @tamedtable/headless; this
// manager applies an entry's spec back through the engine and turns cell edits
// and column reorders into ordinary, replayable spec patches.
import { SpecJournal, type JournalEntry, type TimelineStep } from '@tamedtable/headless';
import type { TablePlan } from '@tamedtable/core';
import type { ControllerHost } from './controller-context.ts';

export class PatchManager {
  private readonly journal = new SpecJournal();
  // Per-entry changed-cell marks, snapshotted at record time: undo/redo/jump
  // restore the landing entry's marks so stepping through history shows which
  // cells that step changed (spec/behavior.md § Grid upgrades).
  private readonly marks = new Map<number, Map<string, unknown>>();

  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
  }

  // ── Journal passthrough (the engine records committed turns here) ─────────

  /** Record a committed change (with the changed-cell marks it carries right
   *  now) and return the entry's stable id. */
  record(entry: JournalEntry): number {
    const id = this.journal.record(entry);
    this.marks.set(id, new Map(this.host.engine.changedCells));
    return id;
  }

  clearJournal(): void {
    this.journal.clear();
    this.marks.clear();
  }

  /** Whether the entry is currently applied: false while undone, and false
   *  forever once a new edit forked it off the timeline. Drives the chat
   *  reply's Executed/Undone display. */
  isApplied(id: number): boolean {
    return this.journal.isApplied(id);
  }

  // Restore the marks of the step the cursor landed on (empty before the
  // first step), and re-run the reveal scroll to its first changed column.
  private restoreCurrentMarks(): void {
    const id = this.journal.current()?.id;
    const cells = id === undefined ? undefined : this.marks.get(id);
    this.host.engine.restoreChangedCells(cells ?? new Map());
  }

  /** Relabel the most recent entry (voice transcript swap). */
  relabelLast(label: string): void {
    this.journal.relabelLast(label);
  }

  canUndo(): boolean {
    return this.journal.canUndo();
  }

  canRedo(): boolean {
    return this.journal.canRedo();
  }

  /** The undo journal, oldest first: one entry per spec-changing turn. */
  history(): Array<{ label: string }> {
    return this.journal.entries();
  }

  /** The full history timeline (done + undone) and the current cursor: the
   *  mobile History sheet reads this. */
  timeline(): { steps: TimelineStep[]; cursor: number } {
    return this.journal.timeline();
  }

  /** Jump straight to a timeline step (the History sheet's tap-to-jump). Walks
   *  the journal to `index` and applies the resulting spec in one move. */
  async jumpTo(index: number): Promise<void> {
    const spec = this.journal.jumpTo(index);
    if (!spec) return;
    await this.host.engine.applySpecCached(spec);
    this.restoreCurrentMarks();
    this.host.selection = null;
    this.host.notify();
  }

  // ── Undo / redo ──────────────────────────────────────────────────────────
  // Both replay through the cache-only path (#LazyExec): undo lowers the row
  // marks, redo restores them from the cell cache, never a new AI call.

  async undo(): Promise<void> {
    const entry = this.journal.takeUndo();
    if (!entry) {
      this.host.pushToast('info', 'Nothing to undo.');
      return;
    }
    await this.host.engine.applySpecCached(entry.prevSpec);
    this.restoreCurrentMarks();
    this.host.selection = null;
    this.host.notify();
  }

  async redo(): Promise<void> {
    const entry = this.journal.takeRedo();
    if (!entry) {
      this.host.pushToast('info', 'Nothing to redo.');
      return;
    }
    await this.host.engine.applySpecCached(entry.nextSpec);
    this.restoreCurrentMarks();
    this.host.selection = null;
    this.host.notify();
  }

  // ── Browser gestures → spec patches ──────────────────────────────────────

  /** A cell edit becomes a `mutate` keyed by row index, an ordinary,
   *  undoable spec patch that replays against the source. */
  async editCell(rowIndex: number, column: string, value: string): Promise<void> {
    const before = this.host.engine.rawRows()[rowIndex]?.[column];
    const id = await this.applySpecChange(`edit ${column} row ${rowIndex + 1}`, (spec) => ({
      ...spec,
      transformations: [
        ...spec.transformations,
        {
          kind: 'mutate' as const,
          columns: column,
          value: {
            js: `i === ${rowIndex} ? ${JSON.stringify(value)} : row[${JSON.stringify(column)}]`,
          },
        },
      ],
    }));
    // The edited cell tints like any other change (#LazyExec grid upgrades),
    // and the entry's mark snapshot catches up so undo/redo restores it.
    this.host.engine.noteChangedCell(rowIndex, column, before);
    this.marks.set(id, new Map(this.host.engine.changedCells));
    // An active column sort stays live: once the commit settles, the edited
    // row folds back into order instead of leaving the ▲/▼ indicator lying
    // (spec/behavior.md § Grid upgrades: the sort holds only while rows
    // stream in, then folds them into order).
    this.host.view.refreshSortOrder();
    // applySpecChange already notified, before the mark existed. Notify again
    // so the tint and its "was: …" tooltip land with the committed value,
    // not on whatever unrelated render happens next.
    this.host.notify();
  }

  /** The column menu's Delete column, a spec step, the same patch a chat
   *  request would commit (#LazyExec: not view state, fully undoable). */
  async deleteColumn(column: string): Promise<void> {
    await this.applySpecChange(`delete column ${column}`, (spec) => ({
      ...spec,
      columns: spec.columns.filter((c) => c.id !== column),
      transformations: [
        ...spec.transformations,
        { kind: 'select' as const, columns: spec.columns.map((c) => c.id).filter((id) => id !== column) },
      ],
    }));
  }

  /** A column-reorder gesture: the named columns move to the front, in order;
   *  the rest keep their relative order. Recorded so undo reverses it. */
  async reorderColumns(order: string[]): Promise<void> {
    await this.applySpecChange('reorder columns', (spec) => {
      const byId = new Map(spec.columns.map((c) => [c.id, c]));
      const named = new Set(order);
      const moved = order.map((id) => byId.get(id)).filter((c): c is TablePlan['columns'][number] => !!c);
      const rest = spec.columns.filter((c) => !named.has(c.id));
      return { ...spec, columns: [...moved, ...rest] };
    });
  }

  private async applySpecChange(label: string, build: (spec: TablePlan) => TablePlan): Promise<number> {
    const runner = this.host.engine.ensureHeadless();
    if (!this.host.loaded) throw new Error('Runner: no input loaded; call loadInput first.');
    const prevSpec = structuredClone(runner.currentSpec());
    await this.host.engine.applySpecCached(build(prevSpec));
    const id = this.record({
      label,
      prevSpec,
      nextSpec: structuredClone(runner.currentSpec()),
    });
    this.host.notify();
    return id;
  }
}
