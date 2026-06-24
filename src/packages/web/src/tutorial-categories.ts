// #TutorialMode
// The seven marketing feature categories, in homepage order — the single
// definition of the Tutorial panel's group titles and their `@cat-…` tags.
// A unit test (src/tests/tutorial-categories.test.ts) asserts these titles and
// order match the homepage section headings in marketing/web/index.html, so the
// panel and the marketing page can never drift apart.
export interface TutorialCategory {
  readonly tag: string;
  readonly title: string;
}

export const TUTORIAL_CATEGORIES: readonly TutorialCategory[] = [
  { tag: '@cat-cleanup', title: 'Clean up' },
  { tag: '@cat-enrich', title: 'Enrich & extract' },
  { tag: '@cat-classify', title: 'Classify' },
  { tag: '@cat-validate', title: 'Validate' },
  { tag: '@cat-language', title: 'Language' },
  { tag: '@cat-deterministic', title: 'Deterministic' },
  { tag: '@cat-loadsave', title: 'Load, save & reuse' },
];
