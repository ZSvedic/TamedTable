// #TestTree
// Freshness guard for spec/test-tree.md: regenerate the tree from the live
// .feature sources and assert it equals the committed file. Adding, renaming, or
// moving a scenario without running `bun run gen:test-tree` fails here — so the
// map of "what is tested" can never silently fall out of date.
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateTestTree } from '../../spec/test-tree.gen.ts';

const SPEC_DIR = join(import.meta.dir, '../../spec');

describe('spec/test-tree.md', () => {
  it('is up to date (run `bun run gen:test-tree` to refresh)', () => {
    const committed = readFileSync(join(SPEC_DIR, 'test-tree.md'), 'utf8');
    expect(generateTestTree(SPEC_DIR)).toBe(committed);
  });
});
