// #LoadSuggestions
// Edges of the after-load suggestion call that the Gherkin scenario cannot
// reach through one recording: the reply parser's tolerance and the
// assembled prompt's two placeholders.
import { describe, it, expect } from 'bun:test';
import {
  assembleSuggestPrompt,
  parseSuggestions,
  suggestSample,
  SUGGEST_CELL_CHARS,
  SUGGEST_SAMPLE_COLS,
  SUGGEST_SAMPLE_ROWS,
} from './index.ts';

describe('parseSuggestions', () => {
  it('reads a bare JSON array', () => {
    expect(parseSuggestions('["Normalize phone numbers", "Sort by DOB"]')).toEqual(['Normalize phone numbers', 'Sort by DOB']);
  });

  it('strips a ```json fence', () => {
    expect(parseSuggestions('```json\n["A", "B"]\n```')).toEqual(['A', 'B']);
  });

  it('trims, drops empties and case-insensitive duplicates, and keeps at most 5', () => {
    const reply = JSON.stringify([' A ', '', 'a', 'B', 'C', 'D', 'E', 'F', 42, null]);
    expect(parseSuggestions(reply)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('yields [] for anything that is not a JSON array', () => {
    expect(parseSuggestions('Sure! Here are some ideas: ...')).toEqual([]);
    expect(parseSuggestions('{"suggestions": ["A"]}')).toEqual([]);
    expect(parseSuggestions('')).toEqual([]);
  });
});

describe('suggestSample', () => {
  const columns = Array.from({ length: SUGGEST_SAMPLE_COLS + 5 }, (_, i) => `c${i}`);
  const rows = Array.from({ length: SUGGEST_SAMPLE_ROWS + 10 }, (_, i) =>
    Object.fromEntries(columns.map((c) => [c, `${c}-row${i}-${'x'.repeat(SUGGEST_CELL_CHARS * 2)}`])),
  );

  it('never grows with the table: rows, columns, and cells are all capped', () => {
    const sample = suggestSample('/some/dir/big.csv', columns, rows);
    const lines = sample.split('\n');
    const jsonLines = lines.filter((l) => l.startsWith('{'));
    expect(jsonLines).toHaveLength(SUGGEST_SAMPLE_ROWS);
    const first = JSON.parse(jsonLines[0]!) as Record<string, string>;
    expect(Object.keys(first)).toHaveLength(SUGGEST_SAMPLE_COLS);
    for (const v of Object.values(first)) expect(v.length).toBeLessThanOrEqual(SUGGEST_CELL_CHARS + 1);
    // The header still names every column and the true row count.
    expect(lines[0]).toBe('Table: big.csv');
    expect(lines[1]).toBe(`Rows: ${rows.length}. Columns (${columns.length}): ${columns.join(', ')}`);
  });

  it('keeps JSON types for short values and nulls', () => {
    const sample = suggestSample('t.jsonl', ['n', 'b', 'x', 'o'], [{ n: 3, b: true, x: null, o: { a: 1 } }]);
    expect(sample.split('\n').at(-1)).toBe('{"n":3,"b":true,"x":null,"o":"{\\"a\\":1}"}');
  });
});

describe('assembleSuggestPrompt', () => {
  const system = [
    '### Rules', '- be good', '',
    '### Transformation grammar', '- `{kind:"filter"}`: keep rows.', '- `{kind:"sort"}`: order rows.', '',
    '### Few-shots', '#### "Normalize phone numbers"', '- add …', '#### "Sort by DOB"', '- add …',
  ].join('\n');

  it('fills both placeholders from the spec editor prompt', () => {
    const out = assembleSuggestPrompt('Head\n\n{TRANSFORMATION_GRAMMAR}\n\nTail\n\n{EXAMPLE_REQUESTS}', system);
    expect(out).toBe(
      'Head\n\n- `{kind:"filter"}`: keep rows.\n- `{kind:"sort"}`: order rows.\n\nTail\n\n- Normalize phone numbers\n- Sort by DOB',
    );
  });

  it('throws when a placeholder or a source part is missing', () => {
    expect(() => assembleSuggestPrompt('no placeholders', system)).toThrow('{TRANSFORMATION_GRAMMAR}');
    expect(() => assembleSuggestPrompt('{TRANSFORMATION_GRAMMAR}', system)).toThrow('{EXAMPLE_REQUESTS}');
    expect(() => assembleSuggestPrompt('{TRANSFORMATION_GRAMMAR} {EXAMPLE_REQUESTS}', '### Few-shots\n#### "A"')).toThrow('Transformation grammar');
    expect(() => assembleSuggestPrompt('{TRANSFORMATION_GRAMMAR} {EXAMPLE_REQUESTS}', '### Transformation grammar\n- x')).toThrow('few-shot');
  });
});
