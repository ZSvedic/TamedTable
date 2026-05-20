import { Before, type ITestCaseHookParameter } from '@cucumber/cucumber';
import { createCliRunner } from '@tamedtable/cli';
import { TamedTableWorld, runnerOptsFor } from './world.ts';

Before({ tags: '@cli' }, function (this: TamedTableWorld, scenario: ITestCaseHookParameter) {
  if (this.surface !== 'cli') return;
  this.runnerKind = 'cli';
  const opts = runnerOptsFor(scenario);
  this.runnerOpts = opts;
  this.runnerFactory = () => createCliRunner(opts);
});
