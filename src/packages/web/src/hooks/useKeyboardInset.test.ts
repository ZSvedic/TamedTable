// #MobileShell — the visual-viewport arithmetic behind useKeyboardInset.
import { describe, expect, test } from 'bun:test';
import { keyboardInset } from './useKeyboardInset.ts';

describe('keyboardInset', () => {
  test('keyboard down: visual viewport fills the layout viewport → 0', () => {
    expect(keyboardInset({ height: 844, offsetTop: 0 }, 844)).toBe(0);
  });

  test('keyboard up: the uncovered gap below the visual viewport', () => {
    expect(keyboardInset({ height: 508, offsetTop: 0 }, 844)).toBe(336);
  });

  test('browser scrolled the focused field into view: offsetTop shrinks the gap', () => {
    expect(keyboardInset({ height: 508, offsetTop: 100 }, 844)).toBe(236);
  });

  test('no VisualViewport API → 0', () => {
    expect(keyboardInset(null, 844)).toBe(0);
    expect(keyboardInset(undefined, 844)).toBe(0);
  });

  test('never negative (browser bars collapsing mid-animation)', () => {
    expect(keyboardInset({ height: 850, offsetTop: 0 }, 844)).toBe(0);
  });
});
