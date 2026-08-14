// #WebUI
// Sync guard: the sample picker's recommended rows are derived from the
// showcase tours: one per homepage feature section, in homepage order. This
// test runs the same derivation vite.config.ts runs, against the real
// spec/test-cases/ sources, so a renamed fixture, a retagged tour, or a
// reordered category shows up here instead of silently emptying the picker.
import { describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { showcaseSamples } from '../packages/web/src/showcase-samples.ts';
import { TUTORIAL_CATEGORIES } from '../packages/web/src/tutorial-categories.ts';

// Repo root is two levels up from src/tests/.
const specTcDir = join(import.meta.dir, '../../spec/test-cases');

function showcaseSources(): { feature: string; source: string }[] {
  return readdirSync(specTcDir)
    .filter((name) => name.startsWith('showcase-') && name.endsWith('.feature'))
    .sort()
    .map((feature) => ({ feature, source: readFileSync(join(specTcDir, feature), 'utf8') }));
}

describe('showcase samples', () => {
  const derived = showcaseSamples(showcaseSources());

  it('recommend one sample per showcase tour, in homepage order', () => {
    expect(derived).toEqual([
      { title: 'Lazy AI execution', file: 'showcase-lazy-input.csv' },
      { title: 'Clean up', file: 'customers-input.csv' },
      { title: 'Enrich & extract', file: 'showcase-enrich-input.csv' },
      { title: 'Classify', file: 'showcase-classify-input.csv' },
      { title: 'Validate', file: 'showcase-validate-input.csv' },
      { title: 'Process language', file: 'showcase-language-input.csv' },
      { title: 'Be exact', file: 'showcase-exact-input.csv' },
    ]);
  });

  it('name files that exist and are titled by a real category', () => {
    const titles = new Set(TUTORIAL_CATEGORIES.map((c) => c.title));
    for (const { title, file } of derived) {
      expect(titles).toContain(title);
      expect(existsSync(join(specTcDir, file))).toBe(true);
    }
  });

  it('recommend no goldens: a golden is a tour output, never an input', () => {
    expect(derived.filter((s) => s.file.includes('-expected.'))).toEqual([]);
  });
});
