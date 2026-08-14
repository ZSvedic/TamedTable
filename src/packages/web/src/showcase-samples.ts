// #WebUI
// The sample picker's recommended rows, derived from the showcase tours: each
// homepage feature section has one tour, and that tour opens one sample: so
// the file the tour loads is the file the picker recommends. Nothing is
// hand-listed; rename a fixture or retag a tour and this moves with it.
//
// Pure (no fs): the caller supplies the feature sources, vite.config.ts at
// build time, src/tests/showcase-samples.test.ts as the sync guard.
import { parseTours } from '@tamedtable/gherkin-tour';
import { TUTORIAL_CATEGORIES } from './tutorial-categories.ts';

export interface ShowcaseSample {
  /** The homepage section's title, e.g. "Clean up": the row's leading line. */
  title: string;
  /** The fixture the tour loads, e.g. "customers-input.csv". */
  file: string;
}

export interface FeatureSource {
  feature: string;
  source: string;
}

/** One recommended sample per showcase tour, in `TUTORIAL_CATEGORIES` (i.e.
 *  homepage) order. A category with no showcase tour, or a tour that loads
 *  nothing: contributes no row. */
export function showcaseSamples(sources: ReadonlyArray<FeatureSource>): ShowcaseSample[] {
  // @cat-… tag → the first file that category's tour loads.
  const fileByTag = new Map<string, string>();
  for (const { source } of sources) {
    for (const tour of parseTours(source)) {
      const tag = tour.tags.find((t) => t.startsWith('@cat-'));
      const load = tour.steps.find((s) => s.action.kind === 'load-file');
      if (!tag || !load || fileByTag.has(tag)) continue;
      if (load.action.kind === 'load-file') fileByTag.set(tag, load.action.filename);
    }
  }

  return TUTORIAL_CATEGORIES.flatMap(({ tag, title }) => {
    const file = fileByTag.get(tag);
    return file ? [{ title, file }] : [];
  });
}
