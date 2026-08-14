// #TutorialMode
// Sync guard: the Tutorial panel groups its tours by the seven feature
// categories defined in src/packages/web/src/tutorial-categories.ts. Those must
// match, in title and order, the seven feature sections on the marketing
// homepage (marketing/web/index.html), so the panel reads as the same list the
// visitor saw before clicking "Show me →". This test fails if either side drifts.
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TUTORIAL_CATEGORIES } from '../packages/web/src/tutorial-categories.ts';

// Repo root is two levels up from src/tests/.
const homepage = readFileSync(join(import.meta.dir, '../../marketing/web/index.html'), 'utf8');

// Each feature section's text column leads with `<div class="feat-text"> …
// <h2><a class="sec-link" href="#slug">Title</a></h2>` (the heading links to
// its own section so visitors can grab a deep link).
function homepageSectionTitles(): string[] {
  const re = /<div class="feat-text">\s*<h2><a class="sec-link" href="#[^"]+">([^<]+)<\/a><\/h2>/g;
  const out: string[] = [];
  for (let m = re.exec(homepage); m; m = re.exec(homepage)) {
    out.push(m[1]!.replace(/&amp;/g, '&').trim());
  }
  return out;
}

describe('tutorial categories', () => {
  it('match the homepage feature sections in title and order', () => {
    expect(homepageSectionTitles()).toEqual(TUTORIAL_CATEGORIES.map((c) => c.title));
  });
});
