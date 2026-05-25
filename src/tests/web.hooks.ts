import { Before, type ITestCaseHookParameter } from '@cucumber/cucumber';
import { join } from 'node:path';
import { createWebController } from '@tamedtable/web';
import { TamedTableWorld, runnerOptsFor, TEMP_DIR } from './world.ts';
import { WebTestFilePort, webScenarios, type WebScenarioCtx } from './web-file-port.ts';

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
      if (innerFetch) return Promise.resolve(innerFetch(input, init));
      return fetch(input as Parameters<typeof fetch>[0], init);
    };
    return createWebController({
      file: port,
      fetch: compositeFetch,
      apiKey: opts.apiKey,
      batchSize: opts.batchSize,
      chunkSize: opts.chunkSize,
      workDir: join(TEMP_DIR, 'web'),
    });
  };
});
