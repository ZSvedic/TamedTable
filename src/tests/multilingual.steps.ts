// #DataNorm #VoiceInput: step defs for spec/test-cases/multilingual.feature
import { Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import type { Transformation } from '@tamedtable/core';
import { TamedTableWorld } from './world.ts';

/** Robust, language-independent property: the model understood the request as
 *  a phone-number normalization, i.e. it appended a mutate targeting the Phone
 *  column. Surface-agnostic: reads the spec from whichever runner is bound. */
function targetsPhone(t: Transformation): boolean {
  if (t.kind !== 'mutate') return false;
  const cols = Array.isArray(t.columns) ? t.columns : [t.columns];
  return cols.some((c) => /phone/i.test(String(c)));
}

Then('a phone-normalization transformation is added', function (this: TamedTableWorld) {
  const transformations = this.ensureRunner().currentSpec().transformations as Transformation[];
  assert.ok(transformations.length >= 1, 'expected at least one transformation');
  assert.ok(
    transformations.some(targetsPhone),
    `expected a mutate on the Phone column; got: ${JSON.stringify(transformations)}`,
  );
});
