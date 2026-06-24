// #TutorialMode
// Sync guard: the Tutorial panel groups its tours by the seven feature
// categories defined in src/packages/web/src/tutorial-categories.ts. Those must
// match — in title and order — the seven feature sections on the marketing
// homepage (marketing/web/index.html), so the panel reads as the same list the
// visitor saw before clicking "Show me →". This test fails if either side drifts.
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TUTORIAL_CATEGORIES } from '../packages/web/src/tutorial-categories.ts';

// Repo root is two levels up from src/tests/.
const homepage = readFileSync(join(import.meta.dir, '../../marketing/web/index.html'), 'utf8');

// Each feature section leads with `<span class="eyebrow">NN</span> … <h2>Title</h2>`.
function homepageSections(): { num: string; title: string }[] {
  const re = /<span class="eyebrow">(\d+)<\/span>\s*<h2>([^<]+)<\/h2>/g;
  const out: { num: string; title: string }[] = [];
  for (let m = re.exec(homepage); m; m = re.exec(homepage)) {
    out.push({ num: m[1]!, title: m[2]!.replace(/&amp;/g, '&').trim() });
  }
  return out;
}

describe('tutorial categories', () => {
  it('match the homepage feature sections in title and order', () => {
    const sections = homepageSections();
    expect(sections.map((s) => s.title)).toEqual(TUTORIAL_CATEGORIES.map((c) => c.title));
  });

  it('are numbered 01..07 on the homepage, matching the panel group order', () => {
    const nums = homepageSections().map((s) => s.num);
    const expected = TUTORIAL_CATEGORIES.map((_, i) => String(i + 1).padStart(2, '0'));
    expect(nums).toEqual(expected);
  });
});
