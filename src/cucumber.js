// Replay serves every model call from a cassette on disk — no network — so
// lift the request-rate cap that exists only to respect the live API ceiling.
// Set here so it lands before the headless module computes its default.
if (process.env.TAMEDTABLE_CASSETTE === 'replay') {
  process.env.TAMEDTABLE_RPM = String(Number.MAX_SAFE_INTEGER);
}

const FEATURES = (process.env.TAMEDTABLE_FEATURES ?? 'aggregate,cassettes,colsplit,convert,debug,join,pivot,sql,validate')
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
