// #LazyExec — the shuffled view is a seeded permutation derived from the file
// identity, so reopening the same file reproduces the same shuffle (plan
// acceptance criterion 6).
import { describe, it, expect } from 'bun:test';
import { fileSeed, seededPermutation } from './controller-view.ts';

describe('shuffle is reproducible from the file identity', () => {
  it('the same file name + row count yields the same permutation', () => {
    const a = seededPermutation(246, fileSeed('paginate-input.csv', 246));
    const b = seededPermutation(246, fileSeed('paginate-input.csv', 246));
    expect(a).toEqual(b);
  });

  it('is a genuine permutation of every row, not the identity', () => {
    const order = seededPermutation(246, fileSeed('paginate-input.csv', 246));
    expect([...order].sort((x, y) => x - y)).toEqual(Array.from({ length: 246 }, (_, i) => i));
    expect(order.every((v, i) => v === i)).toBe(false);
  });

  it('a different file (or row count) shuffles differently', () => {
    const base = seededPermutation(246, fileSeed('paginate-input.csv', 246));
    expect(base).not.toEqual(seededPermutation(246, fileSeed('other.csv', 246)));
    expect(base).not.toEqual(seededPermutation(246, fileSeed('paginate-input.csv', 245)).concat(245));
  });
});
