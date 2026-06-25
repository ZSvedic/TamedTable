// #Diagnostics — unit tests for the pure redaction + ring-buffer helpers.
import { describe, it, expect } from 'bun:test';
import {
  redactString,
  redactValue,
  evictEvents,
  buildReportMarkdown,
  type DiagEvent,
} from './controller-diagnostics.ts';

function ev(message: string, context: Record<string, unknown> = {}): DiagEvent {
  return { ts: '2026-06-25T00:00:00.000Z', level: 'info', message, context };
}

describe('redactString', () => {
  it('redacts an sk- key anywhere in a string', () => {
    expect(redactString('using sk-ant-abc123_DEF in the call')).toBe('using [redacted] in the call');
  });

  it('redacts an AIza Google key', () => {
    expect(redactString('key=AIzaSyA-1234_xyz here')).toBe('key=[redacted] here');
  });

  it('leaves ordinary text untouched', () => {
    expect(redactString('no secrets here, just text')).toBe('no secrets here, just text');
  });
});

describe('redactValue', () => {
  it('drops *Key fields and auth headers entirely', () => {
    const out = redactValue({
      provider: 'anthropic',
      anthropicKey: 'sk-ant-secret',
      geminiKey: 'AIza-secret',
      openaiKey: 'sk-openai-secret',
      headers: { authorization: 'Bearer sk-ant-secret', 'x-api-key': 'sk-ant-secret', 'content-type': 'application/json' },
    }) as Record<string, unknown>;
    expect(out.provider).toBe('anthropic');
    expect(out).not.toHaveProperty('anthropicKey');
    expect(out).not.toHaveProperty('geminiKey');
    expect(out).not.toHaveProperty('openaiKey');
    const headers = out.headers as Record<string, unknown>;
    expect(headers).not.toHaveProperty('authorization');
    expect(headers).not.toHaveProperty('x-api-key');
    expect(headers['content-type']).toBe('application/json');
  });

  it('redacts key-shaped strings nested in arrays and objects', () => {
    const out = redactValue({
      recentMessages: ['my key is sk-ant-abc123', 'normal text'],
      body: 'prompt with AIzaSyABCDEF token',
    }) as Record<string, unknown>;
    expect(out.recentMessages).toEqual(['my key is [redacted]', 'normal text']);
    expect(out.body).toBe('prompt with [redacted] token');
  });

  it('leaves primitives and non-secret keys intact', () => {
    expect(redactValue(42)).toBe(42);
    expect(redactValue(true)).toBe(true);
    expect(redactValue(null)).toBe(null);
    expect(redactValue({ model: 'claude-sonnet-4-6', count: 3 })).toEqual({
      model: 'claude-sonnet-4-6',
      count: 3,
    });
  });
});

describe('evictEvents', () => {
  it('keeps only the newest maxEvents, dropping the oldest first', () => {
    const events = Array.from({ length: 60 }, (_, i) => ev(`e${i}`));
    const kept = evictEvents(events, 50, 1024 * 1024);
    expect(kept.length).toBe(50);
    expect(kept[0]!.message).toBe('e10');
    expect(kept[49]!.message).toBe('e59');
  });

  it('evicts oldest until the byte cap is met', () => {
    // Each event is padded so a handful blow past the tiny byte cap.
    const big = (i: number): DiagEvent => ev(`e${i}`, { pad: 'x'.repeat(200) });
    const events = Array.from({ length: 20 }, (_, i) => big(i));
    const kept = evictEvents(events, 50, 1024);
    expect(kept.length).toBeLessThan(20);
    // Whatever survives is the newest tail — the last event is always kept.
    expect(kept[kept.length - 1]!.message).toBe('e19');
    expect(JSON.stringify(kept).length).toBeLessThanOrEqual(1024);
  });

  it('never drops the only remaining event even if it exceeds the cap', () => {
    const kept = evictEvents([ev('lonely', { pad: 'x'.repeat(5000) })], 50, 10);
    expect(kept.length).toBe(1);
  });
});

describe('buildReportMarkdown', () => {
  it('renders newest-first with the version and config snapshot', () => {
    const report = buildReportMarkdown(
      '1.2.3',
      { provider: 'anthropic', model: 'claude-sonnet-4-6' },
      [ev('alpha-event'), ev('omega-event')],
      '2026-06-25T12:00:00.000Z',
    );
    expect(report).toContain('App version: 1.2.3');
    expect(report).toContain('claude-sonnet-4-6');
    // "omega-event" is the newest event, so it appears before "alpha-event".
    expect(report.indexOf('omega-event')).toBeLessThan(report.indexOf('alpha-event'));
  });
});
