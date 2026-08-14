// #Toolbar
// Step defs for the @headless toolbar scenario: the pure sample-label logic,
// asserted against the package's main (React-free) entry. No browser, no app
// harness; just @cucumber/cucumber plus the package under test.
import { Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { sampleKind } from './index.ts';

Then('a toolbar sample named {string} is labelled {string}', function (name: string, label: string) {
  assert.equal(sampleKind(name), label);
});
