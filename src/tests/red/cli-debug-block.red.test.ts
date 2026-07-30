// RED-CLI-8 — red unit test (bug inventory): a debug block over 20 lines
// drops the mandated summary line. spec/behavior.md:272-274 — "Either way the
// block's last line summarises the request: the model calls it made … then
// the total input and output tokens and the wall-clock time" (unconditional),
// together with behavior.md:259-260 "capped at twenty lines". The cap in
// writeDebugBlock keeps the head and truncates the tail
// (session.ts:146-149: lines.slice(0, MAX - 1) + ellipsis), deleting exactly
// the line the spec pins as always-last. Driven through the real code path —
// renderError → writeDebugBlock — with a RequestDebugInfo of 25 committed
// expressions (a wide split/mutate fan-out).
// Runs via `bun run test:red:unit`; excluded from the green `bun test` by
// bunfig [test] pathIgnorePatterns.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { Writable } from 'node:stream';
import { formatDebugBlock } from '@tamedtable/cli';
import { renderError } from '../../packages/cli/session.ts';

test('RED-CLI-8: a 20+-line debug block still ends with the model/token/time summary line', () => {
  // The block is on by default; make sure no ambient env disables it.
  delete process.env.TAMEDTABLE_DEBUG;

  const info = {
    userRequest: 'red-cli-8 wide fan-out',
    turns: [{ ops: [], outcome: 'committed' as const }],
    expressions: Array.from({ length: 25 }, (_, i) => ({ label: `expr${i + 1}`, body: `row.C${i + 1} + 1` })),
    steps: [],
    cellSamples: [],
    modelCalls: [{ model: 'gemini-3.6-flash', calls: 1 }],
    inputTokens: 1000,
    outputTokens: 50,
    elapsedMs: 1234,
  };

  // The uncapped block's pinned last line — the summary the spec mandates.
  const full = formatDebugBlock(info as never);
  const summary = full[full.length - 1]!;
  assert.ok(summary.includes('tokens ('),
    'RED-CLI-8 harness: formatDebugBlock no longer ends with the usage summary — not the capping bug');

  let out = '';
  const stdout = new Writable({ write(chunk, _enc, cb) { out += String(chunk); cb(); } });
  const err = Object.assign(new Error('boom'), { debug: info });
  renderError(err, stdout as unknown as NodeJS.WritableStream);

  const printed = out.split('\n').filter((l) => l.includes('[debug]'));
  assert.ok(printed.length > 0 && printed.length <= 20,
    `RED-CLI-8 harness: expected a non-empty capped block (≤20 lines), got ${printed.length} — not the bug itself`);
  const last = printed[printed.length - 1]!;
  assert.ok(last.includes(summary),
    'RED-CLI-8 (spec/behavior.md:272-274, :259-260): "Either way the block\'s last line summarises the request" — the 20-line cap must keep the summary as the final line, but writeDebugBlock truncates from the tail (session.ts:146-149) and the summary vanished.\n' +
    `expected last line to carry the summary ${JSON.stringify(summary)}\nactual last line: ${JSON.stringify(last)}`);
});
