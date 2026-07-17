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

  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
  }

  // ── Journal passthrough (the engine records committed turns here) ─────────

  record(entry: JournalEntry): void {
    this.journal.record(entry);
  }

  clearJournal(): void {
    this.journal.clear();
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

  /** The undo journal, oldest first — one entry per spec-changing turn. */
  history(): Array<{ label: string }> {
    return this.journal.entries();
  }

  /** The full history timeline (done + undone) and the current cursor — the
   *  mobile History sheet reads this. */
  timeline(): { steps: TimelineStep[]; cursor: number } {
    return this.journal.timeline();
  }

  /** Jump straight to a timeline step (the History sheet's tap-to-jump). Walks
   *  the journal to `index` and applies the resulting spec in one move. */
  async jumpTo(index: number): Promise<void> {
    const spec = this.journal.jumpTo(index);
    if (!spec) return;
    await this.host.engine.ensureHeadless().setSpec(spec);
    this.host.selection = null;
    this.host.notify();
  }

  // ── Undo / redo ──────────────────────────────────────────────────────────

  async undo(): Promise<void> {
    const entry = this.journal.takeUndo();
    if (!entry) {
      this.host.pushToast('info', 'Nothing to undo.');
      return;
    }
    await this.host.engine.ensureHeadless().setSpec(entry.prevSpec);
    this.host.selection = null;
    this.host.notify();
  }

  async redo(): Promise<void> {
    const entry = this.journal.takeRedo();
    if (!entry) {
      this.host.pushToast('info', 'Nothing to redo.');
      return;
    }
    await this.host.engine.ensureHeadless().setSpec(entry.nextSpec);
    this.host.selection = null;
    this.host.notify();
  }

  // ── Browser gestures → spec patches ──────────────────────────────────────

  /** A cell edit becomes a `mutate` keyed by row index — an ordinary,
   *  undoable spec patch that replays against the source. */
  async editCell(rowIndex: number, column: string, value: string): Promise<void> {
    await this.applySpecChange(`edit ${column} row ${rowIndex + 1}`, (spec) => ({
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

  private async applySpecChange(label: string, build: (spec: TablePlan) => TablePlan): Promise<void> {
    const runner = this.host.engine.ensureHeadless();
    if (!this.host.loaded) throw new Error('Runner: no input loaded; call loadInput first.');
    const prevSpec = structuredClone(runner.currentSpec());
    await runner.setSpec(build(prevSpec));
    this.journal.record({
      label,
      prevSpec,
      nextSpec: structuredClone(runner.currentSpec()),
    });
    this.host.notify();
  }
}
