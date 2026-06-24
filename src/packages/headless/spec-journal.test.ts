// #Patch — unit tests for the surface-agnostic undo/redo journal.
import { describe, it, expect } from 'bun:test';
import { SpecJournal, type JournalEntry } from './journal.ts';
import type { TablePlan } from '@tamedtable/core';

/** A throwaway spec tagged by a marker column id, so entries are distinguishable. */
function spec(tag: string): TablePlan {
  return { columns: [{ id: tag }], transformations: [] };
}

function entry(label: string, prev: string, next: string): JournalEntry {
  return { label, prevSpec: spec(prev), nextSpec: spec(next) };
}

describe('SpecJournal', () => {
  it('starts empty — nothing to undo or redo', () => {
    const j = new SpecJournal();
    expect(j.canUndo()).toBe(false);
    expect(j.canRedo()).toBe(false);
    expect(j.entries()).toEqual([]);
  });

  it('records entries and lists their labels oldest-first', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.record(entry('b', 's1', 's2'));
    expect(j.canUndo()).toBe(true);
    expect(j.entries()).toEqual([{ label: 'a' }, { label: 'b' }]);
  });

  it('takeUndo pops the latest change and offers it for redo', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.record(entry('b', 's1', 's2'));

    const undone = j.takeUndo();
    expect(undone?.label).toBe('b');
    expect(undone?.prevSpec.columns[0]!.id).toBe('s1');
    expect(j.entries()).toEqual([{ label: 'a' }]);
    expect(j.canRedo()).toBe(true);
  });

  it('takeRedo replays the change back onto the undo stack', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.takeUndo();

    const redone = j.takeRedo();
    expect(redone?.label).toBe('a');
    expect(redone?.nextSpec.columns[0]!.id).toBe('s1');
    expect(j.canUndo()).toBe(true);
    expect(j.canRedo()).toBe(false);
  });

  it('recording a new change forks the timeline — redo is cleared', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.takeUndo();
    expect(j.canRedo()).toBe(true);

    j.record(entry('c', 's0', 's2'));
    expect(j.canRedo()).toBe(false);
    expect(j.entries()).toEqual([{ label: 'c' }]);
  });

  it('takeUndo / takeRedo return undefined at the ends', () => {
    const j = new SpecJournal();
    expect(j.takeUndo()).toBeUndefined();
    expect(j.takeRedo()).toBeUndefined();
  });

  it('relabelLast rewrites the newest entry and no-ops when empty', () => {
    const j = new SpecJournal();
    expect(() => j.relabelLast('ignored')).not.toThrow();

    j.record(entry('placeholder', 's0', 's1'));
    j.relabelLast('🎙 normalize phones');
    expect(j.entries()).toEqual([{ label: '🎙 normalize phones' }]);
  });

  it('clear drops all history', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.takeUndo();
    j.clear();
    expect(j.canUndo()).toBe(false);
    expect(j.canRedo()).toBe(false);
    expect(j.entries()).toEqual([]);
  });
});
