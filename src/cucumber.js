// Cassettes: replay recorded model responses by default — fast, offline, no
// API key. `bun run test:record` overrides this to refresh them from the live
// API; TAMEDTABLE_CASSETTE=off forces a live run without cassettes.
process.env.TAMEDTABLE_CASSETTE ??= 'replay';

// Replay serves every model call from a cassette on disk — no network — so
// lift the request-rate cap that exists only to respect the live API ceiling.
if (process.env.TAMEDTABLE_CASSETTE === 'replay') {
  process.env.TAMEDTABLE_RPM = String(Number.MAX_SAFE_INTEGER);
}

// Standalone library packages live under spec/packages/<name>/<name>.feature;
// app-behavior scenarios live under spec/test-cases/<name>.feature.
const PACKAGE_FEATURES = new Set(['chat-panel', 'file-io', 'gherkin-tour', 'model-config', 'table-view', 'toolbar', 'ui-kit', 'voice-input']);

const FEATURES = (process.env.TAMEDTABLE_FEATURES ?? 'aggregate,cassettes,chat-panel,colsplit,convert,debug,file-io,gherkin-tour,join,model-config,multilingual,pivot,save-py,sort,sql,table-view,toolbar,tutorial,ui-kit,validate,voice,voice-input,web')
  .split(',')
  .map((s) => {
    const name = s.trim();
    return PACKAGE_FEATURES.has(name)
      ? `../spec/packages/${name}/${name}.feature`
      : `../spec/test-cases/${name}.feature`;
  });

const common = {
  paths: FEATURES,
  // *.test.ts files are bun-test suites (they import 'bun:test', which
  // cucumber's Node loader can't resolve) — import only the rest. Library
  // packages carry their own step defs next to the code they test.
  import: ['tests/**/!(*.test).ts', 'packages/**/*.steps.ts'],
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
