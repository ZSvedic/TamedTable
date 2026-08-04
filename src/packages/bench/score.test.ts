import { test, expect } from 'bun:test';
import { canonical, scoreAccuracy, checkRowIntegrity, type Label } from './score.ts';
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

test('checkRowIntegrity passes when every input id appears exactly once', () => {
  const r = checkRowIntegrity(['a', 'b', 'c'], [
    { videoId: 'a' }, { videoId: 'b' }, { videoId: 'c' },
  ], 'videoId');
  expect(r.inputRows).toBe(3);
  expect(r.outputRows).toBe(3);
  expect(r.duplicated).toEqual([]);
  expect(r.dropped).toEqual([]);
  expect(r.ok).toBe(true);
});

test('checkRowIntegrity catches the "drop a digit" corruption (one id duplicated, one dropped)', () => {
  // Model emitted "1" where the id was "11": row "11" vanishes, "1" now appears
  // twice. Row count is unchanged, so only the id checks reveal the corruption.
  const r = checkRowIntegrity(['1', '11', 'x'], [
    { videoId: '1' }, { videoId: '1' }, { videoId: 'x' },
  ], 'videoId');
  expect(r.inputRows).toBe(3);
  expect(r.outputRows).toBe(3);
  expect(r.duplicated).toEqual(['1']);
  expect(r.dropped).toEqual(['11']);
  expect(r.ok).toBe(false);
});

test('checkRowIntegrity fails on a plain row-count mismatch', () => {
  const r = checkRowIntegrity(['a', 'b'], [{ videoId: 'a' }], 'videoId');
  expect(r.outputRows).toBe(1);
  expect(r.dropped).toEqual(['b']);
  expect(r.ok).toBe(false);
});
