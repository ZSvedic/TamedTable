import { describe, it, expect, afterEach } from 'bun:test';
import { Writable } from 'node:stream';
import { debugEnabled, renderModelName, formatDebugBlock } from './index.ts';
import { renderError } from './session.ts';
import type { RequestDebugInfo } from '@tamedtable/headless';

const origDebug = process.env.TAMEDTABLE_DEBUG;
afterEach(() => {
  if (origDebug === undefined) delete process.env.TAMEDTABLE_DEBUG;
  else process.env.TAMEDTABLE_DEBUG = origDebug;
});
function setDebug(v: string | undefined): void {
  if (v === undefined) delete process.env.TAMEDTABLE_DEBUG;
  else process.env.TAMEDTABLE_DEBUG = v;
}

describe('debugEnabled', () => {
  it('is on when the variable is unset', () => {
    setDebug(undefined);
    expect(debugEnabled()).toBe(true);
  });

  it('is off for 0, false, off: case- and space-insensitive', () => {
    for (const v of ['0', 'false', 'off', 'OFF', ' off ', 'False']) {
      setDebug(v);
      expect(debugEnabled()).toBe(false);
    }
  });

  it('is on for any other value', () => {
    for (const v of ['1', 'on', 'true', 'yes', '']) {
      setDebug(v);
      expect(debugEnabled()).toBe(true);
    }
  });
});

describe('renderModelName', () => {
  it('renders a canonical claude id as family + version', () => {
    expect(renderModelName('claude-sonnet-4-6')).toBe('Sonnet 4.6');
    expect(renderModelName('claude-haiku-4-5')).toBe('Haiku 4.5');
    expect(renderModelName('claude-opus-4-7')).toBe('Opus 4.7');
  });

  it('ignores a trailing dated suffix', () => {
    expect(renderModelName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5');
  });

  it('returns any other id verbatim', () => {
    expect(renderModelName('gpt-4o')).toBe('gpt-4o');
    expect(renderModelName('my-custom-model')).toBe('my-custom-model');
  });
});

describe('formatDebugBlock', () => {
  const success: RequestDebugInfo = {
    userRequest: 'validate dob is non-empty',
    turns: [{ ops: [], outcome: 'committed' }],
    expressions: [{ label: 'pred', body: 'row.DOB && String(row.DOB).length > 0' }],
    steps: ['validate (js)'],
    cellSamples: [],
    modelCalls: [{ model: 'claude-sonnet-4-6', calls: 1 }],
    inputTokens: 2029,
    outputTokens: 89,
    elapsedMs: 1900,
  };

  it('renders the executed expression then a one-line summary on success', () => {
    expect(formatDebugBlock(success)).toEqual([
      'pred: row.DOB && String(row.DOB).length > 0',
      'Sonnet 4.6 ×1 · 2,118 tokens (2,029 in / 89 out) · 1.9s',
    ]);
  });

  it('lists every model with an ×count when more than one model was called', () => {
    const multi: RequestDebugInfo = {
      ...success,
      modelCalls: [
        { model: 'claude-sonnet-4-6', calls: 1 },
        { model: 'claude-sonnet-4-5', calls: 2 },
      ],
      inputTokens: 25690,
      outputTokens: 850,
      elapsedMs: 9700,
    };
    expect(formatDebugBlock(multi)[1]).toBe(
      'Sonnet 4.6 ×1, Sonnet 4.5 ×2 · 26,540 tokens (25,690 in / 850 out) · 9.7s',
    );
  });

  it('renders recovery turns instead of expressions when no turn committed', () => {
    const failure: RequestDebugInfo = {
      userRequest: 'do something impossible',
      turns: [{ ops: [{ op: 'add', path: '/x' }], outcome: 'rejected', sentBack: 'bad patch' }],
      expressions: [],
      steps: [],
      cellSamples: [],
      modelCalls: [{ model: 'claude-sonnet-4-6', calls: 3 }],
      inputTokens: 100,
      outputTokens: 20,
      elapsedMs: 500,
    };
    expect(formatDebugBlock(failure)).toEqual([
      'turn 1/1: ops=[{"op":"add","path":"/x"}]',
      '  → outcome: rejected',
      '  → sent back: bad patch',
      'Sonnet 4.6 ×3 · 120 tokens (100 in / 20 out) · 0.5s',
    ]);
  });
});

// spec/behavior.md § REPL: the block is "capped at twenty lines" AND "the
// block's last line summarises the request", both unconditional, so the cap
// has to drop from the middle. Truncating the tail (the RED-CLI-8 bug
// inventory, now fixed) deleted exactly the line the spec pins as always-last.
describe('the 20-line cap keeps the summary last', () => {
  const wide: RequestDebugInfo = {
    userRequest: 'wide fan-out',
    turns: [{ ops: [], outcome: 'committed' }],
    expressions: Array.from({ length: 25 }, (_, i) => ({ label: `expr${i + 1}`, body: `row.C${i + 1} + 1` })),
    steps: [],
    cellSamples: [],
    modelCalls: [{ model: 'gemini-3.6-flash', calls: 1 }],
    inputTokens: 1000,
    outputTokens: 50,
    elapsedMs: 1234,
  };

  it('prints at most 20 lines, ending with the model/token/time summary', () => {
    setDebug(undefined); // the block is on by default
    const full = formatDebugBlock(wide);
    const summary = full[full.length - 1]!;
    expect(summary).toContain('tokens (');

    let out = '';
    const stdout = new Writable({ write(chunk, _enc, cb) { out += String(chunk); cb(); } });
    renderError(Object.assign(new Error('boom'), { debug: wide }), stdout as unknown as NodeJS.WritableStream);

    const printed = out.split('\n').filter((l) => l.includes('[debug]'));
    expect(printed.length).toBeLessThanOrEqual(20);
    expect(printed[printed.length - 1]).toContain(summary);
    // The dropped lines are announced in the middle, not silently lost.
    expect(out).toContain(`… (+${full.length - 20 + 1} more lines)`);
  });
});
