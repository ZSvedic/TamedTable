// Lazy AI execution estimate regressions (RED-LAZY-3, -4, -8) from the red
// inventory (spec/test-cases/red/README.md). Offline: scripted Gemini fetch
// from lazy-harness.util.ts, no timers.
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { ALL_MODELS } from '@tamedtable/model-config';
import { LazyManager } from '../packages/web/src/controller-lazy.ts';
import {
  addAiColumnOps,
  liftRpm,
  loadFixture,
  makeApp,
  makeBackend,
  untilRunAllDialog,
} from './lazy-harness.util.ts';

liftRpm();

// ── RED-LAZY-3: estimate pricing prefix-matches the cell model ──────────────
// gpt-5.4-mini is the OpenAI provider's DEFAULT cell model (models.json
// defaults.openai.cell), so every OpenAI user's estimate is mispriced.

test('RED-LAZY-3: runEstimate prices gpt-5.4-mini (the OpenAI default cell model) at gpt-5.4 rates', () => {
  // Minimal host: 246 rows, 146 still holding the pending sentinel, and a
  // preview's worth of recorded cell usage (100 rows × 50 in + 5 out tokens).
  const rows = [
    ...Array.from({ length: 100 }, (_, i) => ({ Name: `User-${i + 1}`, Segment: 'consumer' })),
    ...Array.from({ length: 146 }, (_, i) => ({ Name: `User-${i + 101}`, Segment: { __ttPending: true } })),
  ];
  const host = {
    loaded: true,
    engine: {
      rawRows: () => rows,
      displaySpec: () => ({ columns: [], transformations: [] }),
    },
    config: { model: 'gemini-3.6-flash', cellModel: 'gpt-5.4-mini' },
  };
  const lazy = new LazyManager(host as never);
  lazy.recordUsage({ model: 'gpt-5.4-mini', inputTokens: 100 * 50, outputTokens: 100 * 5 });

  const est = lazy.runEstimate();
  assert.ok(est && est.rowsRemaining === 146, `precondition: 146 rows remaining — got ${JSON.stringify(est)}`);

  const mini = ALL_MODELS.find((m) => m.id === 'gpt-5.4-mini')!;
  const expectedUsd = ((50 * 146) / 1e6) * mini.inUsdPerMtok + ((5 * 146) / 1e6) * mini.outUsdPerMtok;
  assert.ok(
    Math.abs(est.estUsd - expectedUsd) < 1e-9,
    `RED-LAZY-3 (spec/code-contract.md:1050-1053): estUsd must be "estTokens priced at the cell model's catalogue rates ($${mini.inUsdPerMtok}/$${mini.outUsdPerMtok} per Mtok for gpt-5.4-mini)" = $${expectedUsd.toFixed(6)}, but the estimate reads $${est.estUsd.toFixed(6)} — the lookup prefix-matches the catalogue (controller-lazy.ts:237 startsWith) and models.json lists gpt-5.4 ($2.5/$15) before its -mini/-nano variants, so the OpenAI provider's DEFAULT cell model is priced 3.3x too high`,
  );
});

// ── RED-LAZY-4: same model in both roles zeroes the estimate ────────────────

test('RED-LAZY-4: same model as chat and cell model makes the estimate read 0 tokens / $0 / 0 s after a real preview', async () => {
  const be = makeBackend(() => 'consumer');
  const app = makeApp(be, { model: 'gemini-3.5-flash', cellModel: 'gemini-3.5-flash' });
  await loadFixture(app, 'paginate-input.csv');
  be.patchQueue.push(addAiColumnOps('Segment', 'Classify {Name}. One word.'));
  await app.sendChat('add a Segment column');
  await app.lazySettle();

  const readout = app.evaluatedReadout();
  if (!readout || readout.done !== 100 || be.cellCalls < 1) {
    throw new Error(`precondition: a page must be previewed with real cell calls — got ${JSON.stringify(readout)}, cellCalls=${be.cellCalls}`);
  }

  const est = app.runEstimate();
  assert.ok(est, `precondition: rows remain pending, runEstimate must not be null`);
  const honest = (50 + 5) * est.rowsRemaining; // 55 tokens/row observed in the preview
  assert.ok(
    est.estTokens > 0 && est.estUsd > 0,
    `RED-LAZY-4 (spec/behavior.md:1455-1459; code-contract.md:1049): the estimate is an "honest extrapolation of the preview" — a page was previewed (${readout.done} rows, ${be.cellCalls} cell HTTP calls at 55 tokens/row, honest estTokens ≈ ${honest}) yet the estimate reads ${JSON.stringify(est)}; recordUsage discards every usage record whose model equals the chat model id (controller-lazy.ts:218-222), so with the same model in both roles ALL cell usage is dropped and the run-all/save dialog quotes $0.00 for a run that will bill thousands of tokens`,
  );
});

// ── RED-LAZY-8: second AI column's estimate inflated by the global accumulator ─

test('RED-LAZY-8: estimate for a second AI column is ~3.5x the honest per-row extrapolation', async () => {
  const be = makeBackend(() => 'consumer');
  const app = makeApp(be);
  await loadFixture(app, 'paginate-input.csv');

  // Column 1: preview, then run on all 246 rows (55 tokens/row).
  be.patchQueue.push(addAiColumnOps('Segment', 'Classify {Name}. One word.'));
  await app.sendChat('add a Segment column');
  const run = app.runOnAllRows();
  if (!(await untilRunAllDialog(app))) throw new Error('precondition: run-all estimate dialog should show');
  app.confirmRunAll();
  await run;
  if (app.evaluatedReadout() !== null) {
    throw new Error(`precondition: column 1 should be fully evaluated — readout ${JSON.stringify(app.evaluatedReadout())}`);
  }

  // Column 2: page 1 previews (same 55 tokens/row), 146 rows remain.
  be.patchQueue.push(addAiColumnOps('Tier', 'Tier for {Name} given segment {Segment}. One word.'));
  await app.sendChat('add a Tier column');
  await app.lazySettle();

  const est = app.runEstimate();
  assert.ok(est && est.rowsRemaining === 146, `precondition: 146 rows remaining for Tier — got ${JSON.stringify(est)}`);
  const honest = 55 * est.rowsRemaining; // remaining rows only need the new column's cells (column 1 is fully cached)
  assert.ok(
    est.estTokens <= honest * 1.25,
    `RED-LAZY-8 (spec/code-contract.md:1049): estTokens must be "mean in+out tokens per evaluated row × rowsRemaining" ≈ ${honest} (55 tokens/row observed for the new column), but the estimate reads ${est.estTokens} — ${(est.estTokens / honest).toFixed(2)}x inflated; cellTokensIn/Out accumulate every cell call since load (both columns, all 346 evaluations) while the divisor is only the rows caught up with the CURRENT spec (controller-lazy.ts:229-247), conflating work already banked in the cache with work still to buy`,
  );
});
