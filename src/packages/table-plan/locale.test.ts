// #TablePlanSchema
// Guards the Zod locale registration. `validateTablePlan`'s message text is
// quoted into the runner's recovery prompt, which is part of a request's
// cassette fingerprint — so a surface that words the error differently misses
// the tape (that is how the deployed Validate tour broke). Zod ships
// `"sideEffects": false`, so Rollup drops the locale Zod registers for itself
// and every message decays to a bare "Invalid input" in the web bundle.
//
// The first test is the contract; the second is the guard. A test that imports
// the package cannot see a bundler remove code, so it reads the source for the
// explicit call instead.
import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateTablePlan } from './index.ts';

test('validation errors name the expected and received types', () => {
  expect(() => validateTablePlan({ columns: ['Country'], transformations: [] })).toThrow(
    'Spec validation failed: columns.0: Invalid input: expected object, received string',
  );
});

test('the English locale is configured explicitly, not left to the bundler', () => {
  const src = readFileSync(join(import.meta.dirname, 'index.ts'), 'utf8');
  expect(src).toContain('z.config(z.locales.en())');
});
