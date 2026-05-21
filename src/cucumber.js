// Cassettes: replay recorded model responses by default — fast, offline, no
// API key. `bun run test:record` overrides this to refresh them from the live
// API; TAMEDTABLE_CASSETTE=off forces a live run without cassettes.
process.env.TAMEDTABLE_CASSETTE ??= 'replay';

// Replay serves every model call from a cassette on disk — no network — so
// lift the request-rate cap that exists only to respect the live API ceiling.
if (process.env.TAMEDTABLE_CASSETTE === 'replay') {
  process.env.TAMEDTABLE_RPM = String(Number.MAX_SAFE_INTEGER);
}

const FEATURES = (process.env.TAMEDTABLE_FEATURES ?? 'aggregate,cassettes,colsplit,convert,debug,join,pivot,save-py,sort,sql,validate,web')
  .split(',')
  .map((s) => `../spec/test-cases/${s.trim()}.feature`);

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
