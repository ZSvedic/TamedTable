// #Patch
// Surface-agnostic undo/redo journal over whole-TablePlan snapshots. One entry per
// spec-changing turn holds the spec before and after, plus a human label. It
// holds no DOM and no engine reference: applying an entry's spec back to a
// runner is the caller's job, so any surface (web today, the CLI tomorrow)
// can reuse it.
import type { TablePlan } from '@tamedtable/core';

export interface JournalEntry {
  /** Human-readable description of the change (chat text, "reorder columns"). */
  label: string;
  /** TablePlan before the change: what undo restores. */
  prevSpec: TablePlan;
  /** TablePlan after the change: what redo restores. */
  nextSpec: TablePlan;
  /** When the change landed (epoch ms). Stamped at record time if omitted. */
  time?: number;
  /** Stable monotonic id, stamped by `record`, lets a caller track an entry
   *  across undo/redo (a chat reply's undo state, per-entry side data). */
  id?: number;
}

/** One row of the history timeline: what the mobile History sheet shows. */
export interface TimelineStep {
  label: string;
  time: number;
}

export class SpecJournal {
  private undoStack: JournalEntry[] = [];
  private redoStack: JournalEntry[] = [];
  private idSeq = 0;

  /** Record a committed change and return its stable id. Clears the redo
   *  stack: a new edit forks the timeline, so previously-undone steps are no
   *  longer reachable. */
  record(entry: JournalEntry): number {
    const id = ++this.idSeq;
    this.undoStack.push({ ...entry, time: entry.time ?? Date.now(), id });
    this.redoStack = [];
    return id;
  }

  /** The applied step, the top of the undo stack, or undefined before the
   *  first step (or after every step is undone). */
  current(): JournalEntry | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  /** Whether the entry with this id is currently applied (on the undo stack).
   *  False while it is undone, and false forever once a new edit forked it
   *  off the timeline. */
  isApplied(id: number): boolean {
    return this.undoStack.some((e) => e.id === id);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Pop the latest change onto the redo stack and return it; the caller
   *  applies its `prevSpec`. Returns undefined when there is nothing to undo. */
  takeUndo(): JournalEntry | undefined {
    const entry = this.undoStack.pop();
    if (entry) this.redoStack.push(entry);
    return entry;
  }

  /** Pop the latest undone change back onto the undo stack and return it; the
   *  caller applies its `nextSpec`. Returns undefined when nothing to redo. */
  takeRedo(): JournalEntry | undefined {
    const entry = this.redoStack.pop();
    if (entry) this.undoStack.push(entry);
    return entry;
  }

  /** Rewrite the most recent entry's label (e.g. swap a voice placeholder for
   *  the transcript once it arrives). No-op on an empty journal. */
  relabelLast(label: string): void {
    const top = this.undoStack[this.undoStack.length - 1];
    if (top) top.label = label;
  }

  /** Recorded changes, oldest first: the history readout. */
  entries(): Array<{ label: string }> {
    return this.undoStack.map((e) => ({ label: e.label }));
  }

  /** The full timeline, oldest first, the undo stack, then the undone (redo)
   *  steps in chronological order, plus the cursor index of the current step
   *  (`-1` when every step has been undone). Drives the mobile History sheet. */
  timeline(): { steps: TimelineStep[]; cursor: number } {
    const steps: TimelineStep[] = [
      ...this.undoStack,
      ...this.redoStack.slice().reverse(),
    ].map((e) => ({ label: e.label, time: e.time ?? 0 }));
    return { steps, cursor: this.undoStack.length - 1 };
  }

  /** Move the cursor to `index` in timeline space, walking the undo/redo
   *  stacks so they stay consistent, and return the whole-spec snapshot to
   *  apply. `index = -1` returns the pre-first-step state. Undefined on an
   *  empty journal. */
  jumpTo(index: number): TablePlan | undefined {
    const total = this.undoStack.length + this.redoStack.length;
    if (total === 0) return undefined;
    const target = Math.max(-1, Math.min(index, total - 1));
    while (this.undoStack.length - 1 > target) this.takeUndo();
    while (this.undoStack.length - 1 < target) this.takeRedo();
    const current = this.undoStack[this.undoStack.length - 1];
    if (current) return current.nextSpec;
    // target === -1: the state before the first step is its prevSpec, and that
    // first step now sits on top of the redo stack.
    return this.redoStack[this.redoStack.length - 1]?.prevSpec;
  }

  /** Drop all history: a fresh file load starts clean. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
