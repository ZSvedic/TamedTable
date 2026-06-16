import { Before, type ITestCaseHookParameter } from '@cucumber/cucumber';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createWebController, type TutorialSources } from '@tamedtable/web';
import { parseTours } from '@tamedtable/gherkin-tour';
import { TamedTableWorld, runnerOptsFor, TEMP_DIR, SPEC_TC_DIR } from './world.ts';
import { WebTestFilePort, webScenarios, type WebScenarioCtx } from './web-file-port.ts';

/** Build TutorialSources by parsing real feature files and reading fixtures. */
function buildTutorialSources(): TutorialSources {
  const featureFiles = ['filter.feature', 'aggregate.feature', 'join.feature'];
  const tours = featureFiles.flatMap((f) => {
    const src = readFileSync(join(SPEC_TC_DIR, f), 'utf8');
    // Stamp each tour with its source filename so a deep link can match on
    // (feature, name) — parseTours sees only the source string, not the file.
    return parseTours(src).map((t) => ({ ...t, feature: f }));
  });

  const inputFiles = ['filter-input.csv', 'datanorm-input.csv', 'join-country-codes.csv'];
  const inputs: Record<string, string> = {};
  for (const f of inputFiles) {
    inputs[f] = readFileSync(join(SPEC_TC_DIR, f), 'utf8');
  }

  const goldenFiles = ['filter-expected.jsonl', 'aggregate-by-country-expected.jsonl'];
  const goldens: Record<string, string> = {};
  for (const f of goldenFiles) {
    goldens[f] = readFileSync(join(SPEC_TC_DIR, f), 'utf8');
  }

  return { tours, inputs, goldens };
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
