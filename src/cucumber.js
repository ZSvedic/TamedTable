// Cassettes: replay recorded model responses by default — fast, offline, no
// API key. `bun run test:record` overrides this to refresh them from the live
// API; TAMEDTABLE_CASSETTE=off forces a live run without cassettes.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

process.env.TAMEDTABLE_CASSETTE ??= 'replay';

// Replay serves every model call from a cassette on disk — no network — so
// lift the request-rate cap that exists only to respect the live API ceiling.
if (process.env.TAMEDTABLE_CASSETTE === 'replay') {
  process.env.TAMEDTABLE_RPM = String(Number.MAX_SAFE_INTEGER);
}

// Standalone library packages live under spec/packages/<name>/<name>.feature;
// app-behavior scenarios live under spec/test-cases/<name>.feature.
const PACKAGE_FEATURES = new Set(['chat-panel', 'file-io', 'gherkin-tour', 'model-config', 'table-view', 'toolbar', 'ui-kit', 'voice-input']);

const featurePath = (name) =>
  PACKAGE_FEATURES.has(name)
    ? `../spec/packages/${name}/${name}.feature`
    : `../spec/test-cases/${name}.feature`;

// Default: run EVERY feature file. An explicit TAMEDTABLE_FEATURES (comma list
// of names) narrows the run for fast local iteration. Scenarios that can't yet
// replay offline — they make a model call but have no recorded cassette — carry
// `@needs-recording` and are excluded per-profile below until their tape lands.
function allFeaturePaths() {
  const tc = readdirSync(join(import.meta.dirname, '../spec/test-cases'))
    .filter((f) => f.endsWith('.feature'))
    .map((f) => `../spec/test-cases/${f}`);
  const pkg = [...PACKAGE_FEATURES].map((name) => featurePath(name));
  return [...tc, ...pkg];
}

const FEATURES = process.env.TAMEDTABLE_FEATURES
  ? process.env.TAMEDTABLE_FEATURES.split(',').map((s) => featurePath(s.trim()))
  : allFeaturePaths();

const common = {
  paths: FEATURES,
  // *.test.ts files are bun-test suites (they import 'bun:test', which
  // cucumber's Node loader can't resolve) — import only the rest. Library
  // packages carry their own step defs next to the code they test.
  import: ['tests/**/!(*.test).ts', 'packages/**/*.steps.ts'],
};

export default common;

// `@needs-recording` marks a scenario that calls the model but has no committed
// cassette yet — it can't replay, so the default run excludes it. Record mode
// is the exception: it MUST include those scenarios, since recording is how the
// tape gets made (otherwise the tag would lock them out of their own recording).
const tagsFor = (surface) =>
  process.env.TAMEDTABLE_CASSETTE === 'record'
    ? `@${surface}`
    : `@${surface} and not @needs-recording`;

export const headless = {
  ...common,
  tags: tagsFor('headless'),
  worldParameters: { surface: 'headless' },
};

export const cli = {
  ...common,
  tags: tagsFor('cli'),
  worldParameters: { surface: 'cli' },
};

export const web = {
  ...common,
  tags: tagsFor('web'),
  worldParameters: { surface: 'web' },
};

// #BenchPerf — standalone performance benchmark profile (`bun run bench`).
// Selects only @perf scenarios, so it never overlaps the surface profiles above
// and `bun run test` never runs it. By default it drops @needs-recording (the
// model-calling group C, which has no committed cassette); set
// TAMEDTABLE_BENCH_ALL=1 (the record/live scripts do) to include it.
export const perf = {
  ...common,
  tags: process.env.TAMEDTABLE_BENCH_ALL ? '@perf' : '@perf and not @needs-recording',
  worldParameters: { surface: 'headless' },
};
