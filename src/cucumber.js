const FEATURES = (process.env.TAMEDTABLE_FEATURES ?? 'datanorm,dedupe,filter,cancelation,cli-flags,repl-commands,placeholders')
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
