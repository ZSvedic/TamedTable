// #GherkinTour
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { parseTours, type TourScenario, type TourAction } from '@tamedtable/gherkin-tour';
import { TamedTableWorld } from './world.ts';

interface GherkinTourCtx {
  source: string;
  tours: TourScenario[];
}

function ctx(world: TamedTableWorld): GherkinTourCtx {
  const w = world as TamedTableWorld & { _tourCtx?: GherkinTourCtx };
  if (!w._tourCtx) w._tourCtx = { source: '', tours: [] };
  return w._tourCtx;
}

function scenario(world: TamedTableWorld, n: number): TourScenario {
  const tours = ctx(world).tours;
  const s = tours[n - 1];
  assert.ok(s, `no scenario ${n} (have ${tours.length})`);
  return s;
}

function step(world: TamedTableWorld, stepN: number, scenarioN: number) {
  const s = scenario(world, scenarioN);
  const st = s.steps[stepN - 1];
  assert.ok(st, `no step ${stepN} in scenario ${scenarioN} (have ${s.steps.length})`);
  return st;
}

function actionOf(world: TamedTableWorld, stepN: number, scenarioN: number): TourAction {
  return step(world, stepN, scenarioN).action;
}

Given('a feature string:', function (this: TamedTableWorld, docstring: string) {
  ctx(this).source = docstring;
});

When('parseTours is called', function (this: TamedTableWorld) {
  ctx(this).tours = parseTours(ctx(this).source);
});

Then('the result is empty', function (this: TamedTableWorld) {
  assert.equal(ctx(this).tours.length, 0);
});

Then('the result has {int} scenario(s)', function (this: TamedTableWorld, n: number) {
  assert.equal(ctx(this).tours.length, n);
});

Then('scenario {int} is named {string}', function (this: TamedTableWorld, n: number, name: string) {
  assert.equal(scenario(this, n).name, name);
});

Then('scenario {int} has {int} step(s)', function (this: TamedTableWorld, n: number, count: number) {
  assert.equal(scenario(this, n).steps.length, count);
});

Then(
  'step {int} of scenario {int} has text {string}',
  function (this: TamedTableWorld, stepN: number, scenarioN: number, text: string) {
    assert.equal(step(this, stepN, scenarioN).text, text);
  },
);

Then(
  'step {int} of scenario {int} has action kind {string}',
  function (this: TamedTableWorld, stepN: number, scenarioN: number, kind: string) {
    assert.equal(actionOf(this, stepN, scenarioN).kind, kind);
  },
);

Then(
  'step {int} of scenario {int} has action filename {string}',
  function (this: TamedTableWorld, stepN: number, scenarioN: number, filename: string) {
    const action = actionOf(this, stepN, scenarioN);
    assert.ok('filename' in action, `action kind "${action.kind}" has no filename`);
    assert.equal((action as { filename: string }).filename, filename);
  },
);

Then(
  'step {int} of scenario {int} has action text {string}',
  function (this: TamedTableWorld, stepN: number, scenarioN: number, text: string) {
    const action = actionOf(this, stepN, scenarioN);
    assert.ok('text' in action, `action kind "${action.kind}" has no text`);
    assert.equal((action as { text: string }).text, text);
  },
);
