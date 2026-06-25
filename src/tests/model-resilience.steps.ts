// #LlmLayer — regression steps for the runner's tolerance of imperfect model
// output. These drive the real decode + apply seam (decodeOpValues →
// applyAndValidate) with a patch the model JSON-encoded slightly wrong, the
// same way the recovery loop feeds a model reply through it.
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { applyAndValidate, decodeOpValues } from '@tamedtable/headless';
import type { TablePlan } from '@tamedtable/core';

interface ResilienceState {
  ops?: unknown[];
  result?: ReturnType<typeof applyAndValidate>;
}

function st(world: object): ResilienceState {
  const w = world as { _resilience?: ResilienceState };
  return (w._resilience ??= {});
}

const baseSpec: TablePlan = {
  table: 'datanorm-input.csv',
  columns: [{ id: 'FirstName' }, { id: 'LastName' }],
  transformations: [],
};

Given(
  'a patch that adds a mutate whose JSON-encoded value contains an invalid backslash escape',
  function (this: object) {
    // The model JSON-encodes the transformation into the patch `value`, but
    // escapes the apostrophes in its prompt example as `\'` — which is NOT a
    // legal JSON escape (JSON allows \" \\ \/ \b \f \n \r \t \uXXXX). A naive
    // JSON.parse therefore throws; the recorded "Fix the capitalization of
    // names" tour broke for exactly this reason.
    const encodedValue =
      `{"kind":"mutate","columns":["FirstName","LastName"],"value":` +
      `{"llm":"Title-case the name (e.g. 'mcDONALD' to 'McDonald', 'O\\'BRIEN' to 'O\\'Brien')."}}`;
    // Guard the premise: this really is invalid JSON, so the test proves repair,
    // not that the input was benign all along.
    assert.throws(() => JSON.parse(encodedValue), 'precondition: the encoded value must be invalid JSON');
    st(this).ops = [{ op: 'add', path: '/transformations/-', value: encodedValue }];
  },
);

When('the runner decodes and applies that patch', function (this: object) {
  const s = st(this);
  s.result = applyAndValidate(baseSpec, decodeOpValues(s.ops!));
});

Then(
  'the patch applies and the spec gains one mutate transformation',
  function (this: object) {
    const r = st(this).result!;
    assert.equal(
      r.kind,
      'ok',
      `expected the patch to apply, but it failed: ${r.kind === 'err' ? r.message : '(none)'}`,
    );
    if (r.kind === 'ok') {
      assert.equal(r.spec.transformations.length, 1, 'expected exactly one transformation');
      assert.equal((r.spec.transformations[0] as { kind: string }).kind, 'mutate', 'expected a mutate transformation');
    }
  },
);
