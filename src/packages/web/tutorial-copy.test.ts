// RED-TUT-5 — regression test (red inventory): the terminal-stop popover copy
// drifted from the spec. Three canonical docs pin the sentence
//   Voilà, "<name>" is done.
// (spec/behavior.md:1721, spec/code-contract.md:1546,
// spec/packages/gherkin-tour/behavior.md:163) but the app passes
//   Voilà, the "<name>" tour is done.
// (TutorialPanel.tsx doneDescription). Nothing green pins the copy — the e2e
// only asserts toContainText('Voilà').

// The string is only observable through a live Driver.js popover (the
// doneDescription is handed to TourUi inside a mount effect), so this test
// extracts the constant from the component source — the exact string the
// panel passes — and asserts it against the spec-pinned sentence.
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('RED-TUT-5: terminal-stop popover copy drifts from the spec-pinned sentence', () => {
  const src = readFileSync(
    join(import.meta.dir, 'src/components/TutorialPanel.tsx'),
    'utf8',
  );
  const match = src.match(/doneDescription:\s*`([^`]+)`/);
  assert.ok(
    match,
    'RED-TUT-5 harness: could not find the doneDescription template literal in TutorialPanel.tsx — the component changed shape; update the extraction, not the assertion',
  );
  const passed = match![1]!.replace(/\$\{selectedTourName\}/g, '<name>');
  assert.equal(
    passed,
    'Voilà, "<name>" is done.',
    'RED-TUT-5 (spec/behavior.md:1721, spec/code-contract.md:1546, spec/packages/gherkin-tour/behavior.md:163): all three canonical docs pin the terminal popover copy as `Voilà, "<name>" is done.` — the app passes a drifted sentence to TourUi (TutorialPanel.tsx doneDescription)',
  );
});
