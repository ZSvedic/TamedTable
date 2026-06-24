import { Before, type ITestCaseHookParameter } from '@cucumber/cucumber';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createWebController, type TutorialSources } from '@tamedtable/web';
import { parseTours } from '@tamedtable/gherkin-tour';
import { TamedTableWorld, runnerOptsFor, TEMP_DIR, SPEC_TC_DIR, CASSETTE_DIR } from './world.ts';
import { WebTestFilePort, webScenarios, type WebScenarioCtx } from './web-file-port.ts';

// The same @tour/@web feature files the deployed bundle indexes. Tests read
// the manifest, feature source, fixtures, and cassettes straight from disk —
// the lazy loaders the browser fetches same-origin.
const TUTORIAL_FEATURES = [
  'filter.feature', 'aggregate.feature', 'join.feature',
  'colsplit.feature', 'dedupe.feature', 'pivot.feature', 'validate.feature',
  'voice.feature', 'sort.feature', 'multilingual.feature',
  'clean-up.feature', 'enrich.feature', 'classify.feature',
  'language-ai.feature', 'loadsave.feature',
];

/** Build TutorialSources from disk: a lightweight manifest plus on-demand
 *  loaders, mirroring the browser's same-origin fetch. */
function buildTutorialSources(): TutorialSources {
  const manifest = TUTORIAL_FEATURES.flatMap((feature) => {
    const src = readFileSync(join(SPEC_TC_DIR, feature), 'utf8');
    return parseTours(src)
      .filter((t) => t.tags.includes('@web'))
      .map((t) => ({ name: t.name, feature, tags: t.tags }));
  });
  return {
    manifest,
    loadFeature: (name) => Promise.resolve(readFileSync(join(SPEC_TC_DIR, name), 'utf8')),
    loadFixture: (name) => Promise.resolve(readFileSync(join(SPEC_TC_DIR, name), 'utf8')),
    loadCassette: (feature) => Promise.resolve(readFileSync(join(CASSETTE_DIR, `${feature}.json`), 'utf8')),
    loadAudio: (name) => Promise.resolve(new Uint8Array(readFileSync(join(SPEC_TC_DIR, name)))),
  };
}

const tutorialSources = buildTutorialSources();

Before({ tags: '@web' }, function (this: TamedTableWorld, scenario: ITestCaseHookParameter) {
  if (this.surface !== 'web') return;
  this.runnerKind = 'web';
  const opts = runnerOptsFor(scenario);
  this.runnerOpts = opts;
  const ctx: WebScenarioCtx = { noFsa: false, urlFixtures: new Map() };
  webScenarios.set(this, ctx);
  this.runnerFactory = () => {
    // Built lazily so a "without File System Access support" Given can flip
    // `noFsa` before the port exists.
    const port = new WebTestFilePort(!ctx.noFsa);
    ctx.filePort = port;
    // A composite fetch: URL-load steps register a fixture body keyed by URL
    // (served as text/csv or application/jsonl by extension). Anything else
    // — Anthropic model calls — still goes through the cassette recorder
    // (opts.fetch) or the real network.
    const innerFetch = opts.fetch;
    const compositeFetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const body = ctx.urlFixtures.get(url);
      if (body !== undefined) {
        const ct = url.toLowerCase().endsWith('.jsonl') ? 'application/jsonl' : 'text/csv';
        return Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': ct } }));
      }
      if (ctx.mockLlmFetch) return ctx.mockLlmFetch(input, init);
      if (innerFetch) return Promise.resolve(innerFetch(input, init));
      return fetch(input as Parameters<typeof fetch>[0], init);
    };
    return createWebController({
      file: port,
      voice: ctx.voicePort,
      fetch: compositeFetch,
      // Suppress real shell API keys — tests set keys explicitly via steps.
      env: {},
      config: opts.apiKey ? { anthropicKey: opts.apiKey } : undefined,
      batchSize: opts.batchSize,
      chunkSize: opts.chunkSize,
      workDir: join(TEMP_DIR, 'web'),
      tutorialSources,
    });
  };
});
