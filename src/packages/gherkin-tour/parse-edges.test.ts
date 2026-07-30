// RED-TUT-4 — regression test (red inventory): parseTours mishandles three
// valid Gherkin constructs that the cucumber suite parses correctly, so the
// vite manifest and CI can silently diverge over the very same .feature file:
//   (a) feature-level tags — Gherkin: inherited by EVERY scenario; parseTours
//       hands them to the first scenario only (index.ts:131 leaves pendingTags
//       for the next Scenario: to claim).
//   (b) stacked tag lines — Gherkin: they accumulate; parseTours lets each
//       line REPLACE the previous one (index.ts:144-147).
//   (c) a `"""json`-annotated docstring — Gherkin: still a docstring, skipped;
//       parseTours matches only a bare `"""` (index.ts:118-126), so the fence
//       never opens, the docstring CONTENT parses as steps, and the closing
//       `"""` opens a docstring that swallows the next real step.

// Spec: spec/code-contract.md:1416-1417 — parseTours "returns every scenario
// (each with its tags)"; spec/packages/gherkin-tour/behavior.md:91-92 — `"""`
// docstrings "are all skipped".

// No committed manifest feature hits these today (landmine): one tag moved to
// the Feature: line or one media-type docstring annotation corrupts the
// shipped Tours manifest while `bun run test` stays green.
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { parseTours } from './index.ts';

test('RED-TUT-4a: feature-level tags are inherited by every scenario', () => {
  const tours = parseTours(`@web @tour
Feature: F
  Scenario: One
    Given load "a.csv"
  Scenario: Two
    Given load "b.csv"
`);
  assert.deepEqual(
    tours.map((t) => ({ name: t.name, tags: t.tags })),
    [
      { name: 'One', tags: ['@web', '@tour'] },
      { name: 'Two', tags: ['@web', '@tour'] },
    ],
    'RED-TUT-4a (spec/code-contract.md:1416-1417): Gherkin feature-level tags apply to every scenario (cucumber-js runs them that way) — parseTours gave them to the first scenario only, so moving @web up to the Feature: line makes every other tour vanish from the manifest while CI stays green (gherkin-tour/index.ts:131)',
  );
});

test('RED-TUT-4b: stacked tag lines all apply to the next scenario', () => {
  const tours = parseTours(`Feature: F
  @web
  @tour @cat-cleanup
  Scenario: Stacked
    Given load "a.csv"
`);
  assert.deepEqual(
    tours[0]?.tags.slice().sort(),
    ['@cat-cleanup', '@tour', '@web'],
    'RED-TUT-4b (spec/code-contract.md:1416-1417): Gherkin tag lines stack — each tag line must accumulate onto the next scenario, but parseTours lets the second line replace the first, dropping @web (and with it the manifest entry) silently (gherkin-tour/index.ts:144-147)',
  );
});

test('RED-TUT-4c: a """json-annotated docstring is skipped, not parsed as steps', () => {
  const tours = parseTours(`Feature: F
  @web @tour
  Scenario: Doc
    Given load "a.csv"
    And some step with a docstring
      """json
      And load "evil.csv"
      """
    When query "real query"
`);
  assert.deepEqual(
    tours[0]?.steps.map((s) => s.text),
    ['load "a.csv"', 'query "real query"'],
    'RED-TUT-4c (spec/packages/gherkin-tour/behavior.md:91-92): """ docstrings "are all skipped" and """json still opens one in Gherkin — parseTours matched only a bare """, so the docstring content injected a phantom load step and the closing fence swallowed the real query (guaranteed cassette miss) (gherkin-tour/index.ts:118-126)',
  );
});
