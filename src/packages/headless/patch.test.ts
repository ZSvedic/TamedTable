import { describe, it, expect } from 'bun:test';
import { applyAndValidate, patchOperationsProperty, decodeOpValues } from './index.ts';
import type { Spec } from '@tamedtable/core';

const baseSpec: Spec = { table: 't.csv', columns: [{ id: 'A' }], transformations: [] };

describe('applyAndValidate', () => {
  it('applies a well-formed patch and returns the new spec', () => {
    const r = applyAndValidate(baseSpec, [
      { op: 'add', path: '/transformations/-', value: { kind: 'filter', pred: { js: 'true' } } },
    ]);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.spec.transformations).toHaveLength(1);
  });

  it('rejects an empty operations array with an actionable message', () => {
    const r = applyAndValidate(baseSpec, []);
    expect(r.kind).toBe('err');
  });

  it('surfaces a malformed patch op as a clear RFC-6902 message, not an internal TypeError', () => {
    const r = applyAndValidate(baseSpec, [
      { op: 'bogus', path: '/transformations/-', value: 1 },
    ]);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') {
      expect(r.message).not.toContain('is not an object');
      expect(r.message).toContain('RFC-6902');
    }
  });
});

// Gemini's function-calling layer turns an untyped `value: {}` into a bare
// `{ type: "object" }` with no guidance, and the model then emits garbage
// (e.g. `"value": 3`) — so Gemini gets a string-typed `value` carrying
// JSON-encoded content, decoded by decodeOpValues. Anthropic/OpenAI keep the
// untyped field so their recorded cassette fingerprints stay valid.
describe('patchOperationsProperty', () => {
  it('keeps `value` untyped for anthropic and openai (request bodies unchanged)', () => {
    for (const provider of ['anthropic', 'openai'] as const) {
      const value = patchOperationsProperty(provider).items.properties.value;
      expect(value).toEqual({});
    }
  });

  it('types `value` as a JSON-encoded string for gemini', () => {
    const value = patchOperationsProperty('gemini').items.properties.value;
    expect(value.type).toBe('string');
    expect(value.description).toContain('JSON');
  });
});

describe('decodeOpValues', () => {
  it('parses a JSON-string `value` into the object it encodes', () => {
    const ops = decodeOpValues([
      { op: 'add', path: '/transformations/-', value: '{"kind":"filter","pred":{"js":"true"}}' },
    ]);
    expect((ops[0] as { value: unknown }).value).toEqual({ kind: 'filter', pred: { js: 'true' } });
  });

  it('leaves a non-JSON string `value` as-is', () => {
    const ops = decodeOpValues([{ op: 'replace', path: '/columns/0/id', value: 'FirstName' }]);
    expect((ops[0] as { value: unknown }).value).toBe('FirstName');
  });

  it('leaves object values and value-less ops untouched', () => {
    const input = [
      { op: 'add', path: '/transformations/-', value: { kind: 'select', columns: ['A'] } },
      { op: 'remove', path: '/transformations/0' },
    ];
    expect(decodeOpValues(input)).toEqual(input);
  });
});
