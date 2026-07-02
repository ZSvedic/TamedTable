import { test, expect } from 'bun:test';
import { canonical, scoreAccuracy, type Label } from './score.ts';
import type { Row } from '@tamedtable/core';

test('canonical collapses boolean-ish values', () => {
  expect(canonical(true)).toBe(true);
  expect(canonical('TRUE')).toBe(true);
  expect(canonical('yes')).toBe(true);
  expect(canonical(1)).toBe(true);
  expect(canonical('false')).toBe(false);
  expect(canonical('no')).toBe(false);
  expect(canonical(0)).toBe(false);
  expect(canonical('Pop')).toBe('pop');
});

test('scoreAccuracy compares the target column against labels by id', () => {
  const rows: Row[] = [
    { videoId: 'a', Music: true },
    { videoId: 'b', Music: 'false' },
    { videoId: 'c', Music: true },
  ];
  const labels: Label[] = [
    { id: 'a', expected: true },   // correct
    { id: 'b', expected: false },  // correct ("false" === false)
    { id: 'c', expected: false },  // mismatch
    { id: 'd', expected: true },   // missing from output
  ];
  const s = scoreAccuracy(rows, 'videoId', 'Music', labels);
  expect(s.n).toBe(3);
  expect(s.correct).toBe(2);
  expect(s.accuracy).toBeCloseTo(2 / 3, 6);
  expect(s.missing).toEqual(['d']);
  expect(s.mismatches).toEqual([{ id: 'c', expected: false, got: true }]);
});

test('scoreAccuracy is 0, not NaN, when nothing matched', () => {
  const s = scoreAccuracy([], 'videoId', 'Music', [{ id: 'x', expected: true }]);
  expect(s.n).toBe(0);
  expect(s.accuracy).toBe(0);
});
