import { Before, type ITestCaseHookParameter } from '@cucumber/cucumber';
import { createHeadlessRunner } from '@tamedtable/headless';
import { TamedTableWorld, runnerOptsFor } from './world.ts';

Before({ tags: '@headless' }, function (this: TamedTableWorld, scenario: ITestCaseHookParameter) {
  if (this.surface !== 'headless') return;
  this.runnerKind = 'headless';
  const opts = runnerOptsFor(scenario);
  this.runnerOpts = opts;
  this.runnerFactory = () => createHeadlessRunner(opts);
});
