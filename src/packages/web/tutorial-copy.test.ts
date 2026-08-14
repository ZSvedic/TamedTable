// RED-TUT-5: regression test (red inventory, now green): tour popover copy
// must match the sentence the canonical docs pin, because nothing else green
// does: the e2e only asserts toContainText('Voilà'), so drifted copy would
// ship silently. Two sentences are pinned:
//   Voilà, the tour "<name>" is done.        (terminal stop)
//   The "Run on all rows?" dialog estimates the time and cost of cleaning
//   the remaining 24,900 rows. Choosing "Not yet" because it would take
//   some time.                               (decline-estimate narration)
// Docs: spec/behavior.md § tours, spec/code-contract.md § tutorial mode,
// spec/packages/gherkin-tour/behavior.md § TourUi.

// The strings are only observable through a live Driver.js popover (the
// doneDescription is handed to TourUi inside a mount effect), so these tests
// extract the constants from the component sources: the exact strings the
// app passes, and assert them against the spec-pinned sentences.
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('RED-TUT-5: terminal-stop popover copy matches the spec-pinned sentence', () => {
  const src = readFileSync(
    join(import.meta.dir, 'src/components/TutorialPanel.tsx'),
    'utf8',
  );
  const match = src.match(/doneDescription:\s*`([^`]+)`/);
  assert.ok(
    match,
    'RED-TUT-5 harness: could not find the doneDescription template literal in TutorialPanel.tsx, the component changed shape; update the extraction, not the assertion',
  );
  const passed = match![1]!.replace(/\$\{selectedTourName\}/g, '<name>');
  assert.equal(
    passed,
    'Voilà, the tour "<name>" is done.',
    'RED-TUT-5 (spec/behavior.md § tours, spec/code-contract.md § tutorial mode, spec/packages/gherkin-tour/behavior.md § TourUi): the canonical docs pin the terminal popover copy as `Voilà, the tour "<name>" is done.`. The app passes a drifted sentence to TourUi (TutorialPanel.tsx doneDescription)',
  );
});

test('decline-estimate narration matches the spec-pinned sentence in both asInstruction copies', () => {
  // asInstruction is deliberately duplicated (TutorialPanel.tsx mirrors
  // gherkin-tour/ui.ts): pin the decline sentence in both so neither drifts.
  const pinned =
    'The "Run on all rows?" dialog estimates the time and cost of cleaning the remaining 24,900 rows. Choosing "Not yet" because it would take some time.';
  const sources = [
    join(import.meta.dir, 'src/components/TutorialPanel.tsx'),
    join(import.meta.dir, '../gherkin-tour/ui.ts'),
  ];
  for (const file of sources) {
    const src = readFileSync(file, 'utf8');
    const match = src.match(/declines\?[^\n]*\n\s*return '([^']+)';/);
    assert.ok(
      match,
      `harness: could not find the decline-estimate return in ${file}, the asInstruction shape changed; update the extraction, not the assertion`,
    );
    assert.equal(
      match![1],
      pinned,
      `${file}: the decline-estimate narration drifted from the sentence spec/behavior.md and gherkin-tour behavior.md pin`,
    );
  }
});
