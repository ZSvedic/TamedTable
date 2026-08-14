// #Toolbar
// Sample-file shape and label logic the toolbar renders. This entry is
// React-free; the components live in ./components.
// Spec: spec/packages/toolbar/behavior.md.

/** A bundled sample file the Open-URL dialog offers as a quick-pick. The host
 *  composes the full `url` (the package never touches `import.meta`/`window`). */
export interface ToolbarSample {
  name: string;
  url: string;
}

/** A sample the picker recommends: a bundled file plus the human `title` its
 *  row leads with. The host supplies the title: the package neither knows nor
 *  cares that titles come from the homepage's feature sections. */
export interface RecommendedSample extends ToolbarSample {
  title: string;
}

/** The badge shown beside a sample row: CSV for `.csv`, JSONL for everything
 *  else (the app only bundles CSV and JSONL). */
export function sampleKind(name: string): 'CSV' | 'JSONL' {
  return name.toLowerCase().endsWith('.csv') ? 'CSV' : 'JSONL';
}
