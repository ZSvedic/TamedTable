// #Patch
// Surface-agnostic undo/redo journal over whole-Spec snapshots. One entry per
// spec-changing turn holds the spec before and after, plus a human label. It
// holds no DOM and no engine reference — applying an entry's spec back to a
// runner is the caller's job — so any surface (web today, the CLI tomorrow)
// can reuse it.
import type { Spec } from '@tamedtable/core';

export interface JournalEntry {
  /** Human-readable description of the change (chat text, "reorder columns"). */
  label: string;
  /** Spec before the change — what undo restores. */
  prevSpec: Spec;
  /** Spec after the change — what redo restores. */
  nextSpec: Spec;
}

export class SpecJournal {
  private undoStack: JournalEntry[] = [];
  private redoStack: JournalEntry[] = [];

  /** Record a committed change. Clears the redo stack — a new edit forks the
   *  timeline, so previously-undone steps are no longer reachable. */
  record(entry: JournalEntry): void {
    this.undoStack.push(entry);
    this.redoStack = [];
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

  /** Recorded changes, oldest first — the history readout. */
  entries(): Array<{ label: string }> {
    return this.undoStack.map((e) => ({ label: e.label }));
  }

  /** Drop all history — a fresh file load starts clean. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
