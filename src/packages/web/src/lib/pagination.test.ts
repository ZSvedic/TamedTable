import { describe, it, expect } from 'bun:test';
import { buildPageList, clampPage } from './pagination.ts';

describe('clampPage', () => {
  it('keeps an in-range page', () => {
    expect(clampPage(2, 5)).toBe(2);
  });

  it('clamps a page below 1 up to 1', () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(-3, 5)).toBe(1);
  });

  it('clamps a page past the end down to the last page', () => {
    expect(clampPage(99, 3)).toBe(3);
  });

  it('treats a zero or missing page count as one page', () => {
    expect(clampPage(4, 0)).toBe(1);
  });

  it('falls back to page 1 for a non-finite page', () => {
    expect(clampPage(NaN, 5)).toBe(1);
  });
});

describe('buildPageList', () => {
  it('lists every page in full when there are 7 or fewer', () => {
    expect(buildPageList(1, 3)).toEqual([1, 2, 3]);
    expect(buildPageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('anchors the start and ellipses the tail near the first pages', () => {
    expect(buildPageList(2, 20)).toEqual([1, 2, 3, 4, 5, '…', 20]);
  });

  it('ellipses both sides when the current page is in the middle', () => {
    expect(buildPageList(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
  });

  it('anchors the end near the last pages', () => {
    expect(buildPageList(19, 20)).toEqual([1, '…', 16, 17, 18, 19, 20]);
  });
});
