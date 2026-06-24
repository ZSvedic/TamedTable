import { describe, it, expect } from 'bun:test';
import { applyAndValidate, patchOperationsProperty, decodeOpValues, parseLlmParts } from './index.ts';
import type { TablePlan } from '@tamedtable/core';

const baseSpec: TablePlan = { table: 't.csv', columns: [{ id: 'A' }], transformations: [] };

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
// (e.g. `"value": 3`) — so `value` is a string-typed field carrying
// JSON-encoded content, decoded by decodeOpValues. The schema is identical
// for every provider; no per-model special cases.
describe('patchOperationsProperty', () => {
  it('types `value` as a JSON-encoded string, never an untyped field', () => {
    const value = patchOperationsProperty().items.properties.value;
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

describe('parseLlmParts', () => {
  it('parses a bare JSON array', () => {
    expect(parseLlmParts('["Ada", null, "Lovelace"]')).toEqual(['Ada', null, 'Lovelace']);
  });

  it('strips a markdown fence around the JSON array', () => {
    expect(parseLlmParts('```json\n["Charles", null, "Babbage"]\n```')).toEqual(['Charles', null, 'Babbage']);
  });

  it('falls back to comma splitting for non-JSON text', () => {
    expect(parseLlmParts('Ada, Lovelace')).toEqual(['Ada', 'Lovelace']);
  });
});
