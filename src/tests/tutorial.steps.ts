// #TutorialMode — step definitions for spec/test-cases/tutorial.feature
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import type { WebController } from '@tamedtable/web';
import { TamedTableWorld } from './world.ts';

function controller(world: TamedTableWorld): WebController {
  return world.ensureRunner() as unknown as WebController;
}

// ── Given ──────────────────────────────────────────────────────────────────

Given('the tutorial {string} is selected', function (this: TamedTableWorld, name: string) {
  controller(this).selectTutorialScenario(name);
});

// ── When ───────────────────────────────────────────────────────────────────

When('user opens the tutorial panel', function (this: TamedTableWorld) {
  controller(this).openTutorial();
});

When('user plays the tutorial', async function (this: TamedTableWorld) {
  await controller(this).playTutorial();
});

When('user advances to the next tutorial step', async function (this: TamedTableWorld) {
  await controller(this).nextStep();
});

When('user goes to the previous tutorial step', function (this: TamedTableWorld) {
  controller(this).prevStep();
});

When('user cancels the tutorial', function (this: TamedTableWorld) {
  controller(this).cancelTutorial();
});

When('user advances to the last tutorial step', async function (this: TamedTableWorld) {
  const c = controller(this);
  const total = c.tutorialStepCount();
  while ((c.currentTutorialStepNumber() ?? 0) < total) {
    await c.nextStep();
  }
});

// ── Then ───────────────────────────────────────────────────────────────────

Then('the tutorial panel is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).tutorialOpen, true, 'tutorial panel should be open');
});

Then('the tutorial list includes {string}', function (this: TamedTableWorld, name: string) {
  const names = controller(this).tutorialScenarioNames();
  assert.ok(names.includes(name), `tutorial list should include "${name}"; got: ${JSON.stringify(names)}`);
});

Then('the tutorial is at step {int}', function (this: TamedTableWorld, n: number) {
  assert.equal(controller(this).currentTutorialStepNumber(), n);
});

Then('the tutorial is not active', function (this: TamedTableWorld) {
  assert.equal(controller(this).isTutorialActive(), false);
});

Then('the table is loaded', function (this: TamedTableWorld) {
  const rows = controller(this).currentRows();
  assert.ok(rows.length > 0, 'table should have rows after load-file step');
});

Then('the golden rows are available', function (this: TamedTableWorld) {
  assert.notEqual(controller(this).goldenRows, null, 'goldenRows should not be null');
});
