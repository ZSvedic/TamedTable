// Cassettes: replay recorded model responses by default — fast, offline, no
// API key. `bun run test:record` overrides this to refresh them from the live
// API; TAMEDTABLE_CASSETTE=off forces a live run without cassettes.
process.env.TAMEDTABLE_CASSETTE ??= 'replay';

// Replay serves every model call from a cassette on disk — no network — so
// lift the request-rate cap that exists only to respect the live API ceiling.
if (process.env.TAMEDTABLE_CASSETTE === 'replay') {
  process.env.TAMEDTABLE_RPM = String(Number.MAX_SAFE_INTEGER);
}

// Standalone library modules live under spec/modules/<name>/<name>.feature;
// app-behavior scenarios live under spec/test-cases/<name>.feature.
const MODULE_FEATURES = new Set(['gherkin-tour', 'model-config']);

const FEATURES = (process.env.TAMEDTABLE_FEATURES ?? 'aggregate,cassettes,colsplit,convert,debug,gherkin-tour,join,model-config,pivot,save-py,sort,sql,tutorial,validate,voice,web')
  .split(',')
  .map((s) => {
    const name = s.trim();
    return MODULE_FEATURES.has(name)
      ? `../spec/modules/${name}/${name}.feature`
      : `../spec/test-cases/${name}.feature`;
  });

const common = {
  paths: FEATURES,
  import: ['tests/**/*.ts'],
};

export default common;

export const headless = {
  ...common,
  tags: '@headless',
  worldParameters: { surface: 'headless' },
};

export const cli = {
  ...common,
  tags: '@cli',
  worldParameters: { surface: 'cli' },
};

export const web = {
  ...common,
  tags: '@web',
  worldParameters: { surface: 'web' },
};
