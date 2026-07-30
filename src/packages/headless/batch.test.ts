import { describe, it, expect } from 'bun:test';
import { tryParseBatchResponse } from './index.ts';

describe('tryParseBatchResponse', () => {
  it('parses a plain JSON array of strings', () => {
    expect(tryParseBatchResponse('["a", "b", "c"]', 3)).toEqual(['a', 'b', 'c']);
  });

  it('parses null entries as null', () => {
    expect(tryParseBatchResponse('["a", null, "c"]', 3)).toEqual(['a', null, 'c']);
  });

  it('treats an empty string and the lowercased literal "null" as null', () => {
    expect(tryParseBatchResponse('["", "null", " null "]', 3)).toEqual([null, null, null]);
  });

  // spec/behavior.md § LLM cells: only the literal *lowercased* word null is
  // the sentinel — "NULL" and "Null" are answers a cell may legitimately give
  // (a database keyword, an acronym) and must survive as strings.
  it('keeps "NULL" and "Null" as real strings', () => {
    expect(tryParseBatchResponse('["NULL", "Null", "ok"]', 3)).toEqual(['NULL', 'Null', 'ok']);
  });

  it('strips a leading ```json fence and trailing ```', () => {
    const text = '```json\n["a", "b"]\n```';
    expect(tryParseBatchResponse(text, 2)).toEqual(['a', 'b']);
  });

  it('strips a leading bare ``` fence', () => {
    const text = '```\n["a", "b"]\n```';
    expect(tryParseBatchResponse(text, 2)).toEqual(['a', 'b']);
  });

  it('coerces non-string entries to strings', () => {
    expect(tryParseBatchResponse('[1, true, "c"]', 3)).toEqual(['1', 'true', 'c']);
  });

  it('returns undefined when length does not match', () => {
    expect(tryParseBatchResponse('["a", "b"]', 3)).toBeUndefined();
    expect(tryParseBatchResponse('["a", "b", "c", "d"]', 3)).toBeUndefined();
  });

  it('returns undefined when not an array', () => {
    expect(tryParseBatchResponse('{"a": 1}', 1)).toBeUndefined();
    expect(tryParseBatchResponse('"plain string"', 1)).toBeUndefined();
  });

  it('returns undefined on JSON parse failure', () => {
    expect(tryParseBatchResponse('not json at all', 1)).toBeUndefined();
    expect(tryParseBatchResponse('["unclosed', 1)).toBeUndefined();
  });

  it('handles whitespace around the array', () => {
    expect(tryParseBatchResponse('   \n["a", "b"]  \n', 2)).toEqual(['a', 'b']);
  });
});
