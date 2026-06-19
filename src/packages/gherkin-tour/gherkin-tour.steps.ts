// #GherkinTour
import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import {
  parseTours,
  TourDriver,
  type TourScenario,
  type TourStep,
  type TourAction,
  type TourAdapter,
} from '@tamedtable/gherkin-tour';

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

// ── TourDriver steps ─────────────────────────────────────────────────────────

// A fake adapter that records every dispatch as `method(arg)` and whether the
// finish hook fired, so a tour's flow is asserted without any real UI, engine,
// or cassette.
class FakeAdapter implements TourAdapter {
  readonly calls: string[] = [];
  finished = false;
  private log(method: string, arg: string | undefined) {
    this.calls.push(`${method}(${arg ?? ''})`);
  }
  async loadFile(f: string)             { this.log('loadFile', f); }
  async loadLookup(f: string)           { this.log('loadLookup', f); }
  async prefillChat(t: string)          { this.log('prefillChat', t); }
  async showGolden(g: string | undefined) { this.log('showGolden', g); }
  async playAudio(f: string)            { this.log('playAudio', f); }
  elementIdFor(a: TourAction): string { return `el-${a.kind}`; }
  onFinish() { this.finished = true; }
}

interface DriverCtx {
  adapter: FakeAdapter;
  driver: TourDriver;
  tour: TourScenario;
}

interface DriverWorld {
  _driverCtx?: DriverCtx;
}

function dctx(world: DriverWorld): DriverCtx {
  assert.ok(world._driverCtx, 'no tour driver set up — call "a tour with steps" first');
  return world._driverCtx;
}

// Build a TourStep from a `| kind | arg |` row. `arg` fills whichever field the
// action kind carries (filename or text); kinds without an argument ignore it.
function makeStep(kind: string, arg: string): TourStep {
  let action: TourAction;
  switch (kind) {
    case 'load-file':     action = { kind: 'load-file',   filename: arg }; break;
    case 'load-lookup':   action = { kind: 'load-lookup', filename: arg }; break;
    case 'prefill-chat':  action = { kind: 'prefill-chat', text: arg };    break;
    case 'play-audio':    action = { kind: 'play-audio',  filename: arg }; break;
    case 'golden-source': action = { kind: 'golden-source', filename: arg }; break;
    case 'show-golden':   action = { kind: 'show-golden' };                break;
    case 'display':       action = { kind: 'display' };                    break;
    default: throw new Error(`unknown action kind "${kind}"`);
  }
  return { keyword: 'Given', text: kind, action };
}

Given('a tour with steps:', function (this: DriverWorld, table: DataTable) {
  const steps = table.hashes().map((r) => makeStep(r.kind!, r.arg ?? ''));
  const tour: TourScenario = { name: 'Test tour', tags: ['@tutorial'], steps };
  const adapter = new FakeAdapter();
  this._driverCtx = { adapter, driver: new TourDriver(adapter), tour };
});

Given('the tour\'s golden is {string}', function (this: DriverWorld, golden: string) {
  dctx(this).tour.golden = golden;
});

When('the driver plays the tour', function (this: DriverWorld) {
  const c = dctx(this);
  c.driver.play(c.tour);
});

When('the driver advances {int} time(s)', async function (this: DriverWorld, n: number) {
  const c = dctx(this);
  for (let i = 0; i < n; i++) await c.driver.next();
});

When('the driver goes back', function (this: DriverWorld) {
  dctx(this).driver.prev();
});

When('the driver finishes', function (this: DriverWorld) {
  dctx(this).driver.finish();
});

Then('the driver is active', function (this: DriverWorld) {
  assert.equal(dctx(this).driver.isActive(), true);
});

Then('the driver is not active', function (this: DriverWorld) {
  assert.equal(dctx(this).driver.isActive(), false);
});

Then('the driver is done', function (this: DriverWorld) {
  assert.equal(dctx(this).driver.isDone(), true);
});

Then('the driver is not done', function (this: DriverWorld) {
  assert.equal(dctx(this).driver.isDone(), false);
});

Then('the current step is null', function (this: DriverWorld) {
  assert.equal(dctx(this).driver.currentStep(), null);
});

Then('the current step element id is {string}', function (this: DriverWorld, id: string) {
  assert.equal(dctx(this).driver.currentStepElementId(), id);
});

Then('the adapter calls were {string}', function (this: DriverWorld, expected: string) {
  assert.equal(dctx(this).adapter.calls.join(', '), expected);
});

Then('the adapter onFinish was called', function (this: DriverWorld) {
  assert.equal(dctx(this).adapter.finished, true);
});
