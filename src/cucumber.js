const FEATURES = (process.env.TAMEDTABLE_FEATURES ?? 'aggregate,colsplit,convert,join,pivot,sql,validate')
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
