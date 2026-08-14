// #Analytics unit tests: the wrapper's one promise is that analytics can
// never break the app, so every test here is a "does not throw" of some kind.
import { afterEach, describe, expect, test } from 'bun:test';
import { initAnalytics, track, UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID } from './analytics.ts';
import type { AnalyticsProps } from './analytics.ts';

type MutableGlobal = { umami?: { track?: (event: string, data?: AnalyticsProps) => void } };
const g = globalThis as MutableGlobal;

afterEach(() => {
  delete g.umami;
});

describe('track', () => {
  test('is a silent no-op when the Umami script never loaded', () => {
    expect(() => track('chat-request')).not.toThrow();
  });

  test('swallows a tracker that throws', () => {
    g.umami = {
      track: () => {
        throw new Error('beacon blocked');
      },
    };
    expect(() => track('undo')).not.toThrow();
  });

  test('passes the event name and properties through to umami', () => {
    const calls: Array<[string, AnalyticsProps | undefined]> = [];
    g.umami = { track: (event, data) => calls.push([event, data]) };
    track('open-file', { source: 'sample' });
    track('save-flow');
    expect(calls).toEqual([
      ['open-file', { source: 'sample' }],
      ['save-flow', undefined],
    ]);
  });
});

describe('initAnalytics', () => {
  test('does nothing without a document (tests, SSR)', () => {
    expect(() => initAnalytics(undefined)).not.toThrow();
  });

  test('injects one deferred script tag carrying the public website ID', () => {
    const doc = fakeDocument();
    initAnalytics(doc.document);
    initAnalytics(doc.document); // idempotent: a second call adds nothing
    expect(doc.appended).toHaveLength(1);
    const s = doc.appended[0]!;
    expect(s.src).toBe(UMAMI_SCRIPT_URL);
    expect(s.defer).toBe(true);
    expect(s.attrs['data-website-id']).toBe(UMAMI_WEBSITE_ID);
  });
});

/** Minimal Document stand-in: bun tests run without a DOM. */
function fakeDocument() {
  type FakeScript = {
    src: string;
    defer: boolean;
    attrs: Record<string, string>;
    setAttribute(k: string, v: string): void;
  };
  const appended: FakeScript[] = [];
  const document = {
    querySelector: () => (appended.length ? appended[0] : null),
    createElement: (): FakeScript => {
      const s: FakeScript = {
        src: '',
        defer: false,
        attrs: {},
        setAttribute(k, v) {
          s.attrs[k] = v;
        },
      };
      return s;
    },
    head: { appendChild: (s: FakeScript) => appended.push(s) },
  } as unknown as Document;
  return { document, appended };
}
