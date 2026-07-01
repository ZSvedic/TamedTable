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

  it('timeline lists every step oldest-first, with the cursor on the current one', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.record(entry('b', 's1', 's2'));
    j.record(entry('c', 's2', 's3'));
    j.takeUndo(); // undo c — cursor now on b, c is a future step

    const { steps, cursor } = j.timeline();
    expect(steps.map((s) => s.label)).toEqual(['a', 'b', 'c']);
    expect(cursor).toBe(1); // b is current
    expect(steps.every((s) => typeof s.time === 'number')).toBe(true);
  });

  it('timeline cursor is -1 when every step has been undone', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.takeUndo();
    const { steps, cursor } = j.timeline();
    expect(steps.map((s) => s.label)).toEqual(['a']);
    expect(cursor).toBe(-1);
  });

  it('jumpTo walks backward and returns the target spec, leaving undo/redo consistent', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.record(entry('b', 's1', 's2'));
    j.record(entry('c', 's2', 's3'));

    const applied = j.jumpTo(0); // jump back to step a
    expect(applied?.columns[0]!.id).toBe('s1'); // a.nextSpec
    expect(j.timeline().cursor).toBe(0);
    expect(j.canUndo()).toBe(true);
    expect(j.canRedo()).toBe(true);
  });

  it('jumpTo -1 returns the pre-first-step state', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.record(entry('b', 's1', 's2'));
    const applied = j.jumpTo(-1);
    expect(applied?.columns[0]!.id).toBe('s0'); // a.prevSpec — the initial state
    expect(j.canUndo()).toBe(false);
    expect(j.canRedo()).toBe(true);
  });

  it('jumpTo walks forward through undone steps', () => {
    const j = new SpecJournal();
    j.record(entry('a', 's0', 's1'));
    j.record(entry('b', 's1', 's2'));
    j.record(entry('c', 's2', 's3'));
    j.takeUndo();
    j.takeUndo(); // cursor on a; b, c are future

    const applied = j.jumpTo(2); // jump forward to c
    expect(applied?.columns[0]!.id).toBe('s3'); // c.nextSpec
    expect(j.timeline().cursor).toBe(2);
    expect(j.canRedo()).toBe(false);
  });

  it('jumpTo on an empty journal returns undefined', () => {
    const j = new SpecJournal();
    expect(j.jumpTo(0)).toBeUndefined();
  });
});
