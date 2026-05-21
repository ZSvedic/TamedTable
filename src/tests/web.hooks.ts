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
  const ctx: WebScenarioCtx = { noFsa: false };
  webScenarios.set(this, ctx);
  this.runnerFactory = () => {
    // Built lazily so a "without File System Access support" Given can flip
    // `noFsa` before the port exists.
    const port = new WebTestFilePort(!ctx.noFsa);
    ctx.filePort = port;
    return createWebController({
      file: port,
      fetch: opts.fetch,
      apiKey: opts.apiKey,
      batchSize: opts.batchSize,
      chunkSize: opts.chunkSize,
      workDir: join(TEMP_DIR, 'web'),
    });
  };
});
