// #GherkinTour
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { parseTours, type TourScenario, type TourAction } from '@tamedtable/gherkin-tour';

interface GherkinTourCtx {
  source: string;
  tours: TourScenario[];
}

// The only shape these steps need from the cucumber World — state hangs off
// one private property, keeping the package independent of the app harness.
interface TourWorld {
  _tourCtx?: GherkinTourCtx;
}

function ctx(world: TourWorld): GherkinTourCtx {
  if (!world._tourCtx) world._tourCtx = { source: '', tours: [] };
  return world._tourCtx;
}

function scenario(world: TourWorld, n: number): TourScenario {
  const tours = ctx(world).tours;
  const s = tours[n - 1];
  assert.ok(s, `no scenario ${n} (have ${tours.length})`);
  return s;
}

function step(world: TourWorld, stepN: number, scenarioN: number) {
  const s = scenario(world, scenarioN);
  const st = s.steps[stepN - 1];
  assert.ok(st, `no step ${stepN} in scenario ${scenarioN} (have ${s.steps.length})`);
  return st;
}

function actionOf(world: TourWorld, stepN: number, scenarioN: number): TourAction {
  return step(world, stepN, scenarioN).action;
}

Given('a feature string:', function (this: TourWorld, docstring: string) {
  ctx(this).source = docstring;
});

When('parseTours is called', function (this: TourWorld) {
  ctx(this).tours = parseTours(ctx(this).source);
});

Then('the result is empty', function (this: TourWorld) {
  assert.equal(ctx(this).tours.length, 0);
});

Then('the result has {int} scenario(s)', function (this: TourWorld, n: number) {
  assert.equal(ctx(this).tours.length, n);
});

Then('scenario {int} is named {string}', function (this: TourWorld, n: number, name: string) {
  assert.equal(scenario(this, n).name, name);
});

Then('scenario {int} has {int} step(s)', function (this: TourWorld, n: number, count: number) {
  assert.equal(scenario(this, n).steps.length, count);
});

Then('scenario {int} is tagged {string}', function (this: TourWorld, n: number, tag: string) {
  const tags = scenario(this, n).tags;
  assert.ok(tags.includes(tag), `scenario ${n} tags ${JSON.stringify(tags)} should include "${tag}"`);
});

Then('scenario {int} has golden {string}', function (this: TourWorld, n: number, filename: string) {
  assert.equal(scenario(this, n).golden, filename);
});

Then(
  'step {int} of scenario {int} has text {string}',
  function (this: TourWorld, stepN: number, scenarioN: number, text: string) {
    assert.equal(step(this, stepN, scenarioN).text, text);
  },
);

Then(
  'step {int} of scenario {int} has action kind {string}',
  function (this: TourWorld, stepN: number, scenarioN: number, kind: string) {
    assert.equal(actionOf(this, stepN, scenarioN).kind, kind);
  },
);

Then(
  'step {int} of scenario {int} has action filename {string}',
  function (this: TourWorld, stepN: number, scenarioN: number, filename: string) {
    const action = actionOf(this, stepN, scenarioN);
    assert.ok('filename' in action, `action kind "${action.kind}" has no filename`);
    assert.equal((action as { filename: string }).filename, filename);
  },
);

Then(
  'step {int} of scenario {int} has action text {string}',
  function (this: TourWorld, stepN: number, scenarioN: number, text: string) {
    const action = actionOf(this, stepN, scenarioN);
    assert.ok('text' in action, `action kind "${action.kind}" has no text`);
    assert.equal((action as { text: string }).text, text);
  },
);
