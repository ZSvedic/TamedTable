// #TutorialMode — step definitions for spec/test-cases/tutorial.feature
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { TamedTableWorld } from './world.ts';
import { webController as controller } from './web-file-port.ts';

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

When('user plays the whole tutorial', async function (this: TamedTableWorld) {
  const c = controller(this);
  await c.playTutorial();
  // Execute all steps by clicking Next until the tour is done.
  while (!c.isTutorialDone()) {
    await c.nextStep();
  }
  // Await the auto-submitted prefill-chat request (replayed from the cassette).
  await c.tutorialSettle();
});

When('user advances to the next tutorial step', async function (this: TamedTableWorld) {
  await controller(this).nextStep();
});

// Two overlapping Next clicks — the second lands while the first step is still
// executing and must be ignored (behavior.md § Tutorial mode).
When('user advances to the next tutorial step twice rapidly', async function (this: TamedTableWorld) {
  const c = controller(this);
  await Promise.all([c.nextStep(), c.nextStep()]);
});

When('user cancels the tutorial', function (this: TamedTableWorld) {
  controller(this).cancelTutorial();
});

When('user finishes the tutorial', function (this: TamedTableWorld) {
  controller(this).finishTutorial();
});

When('user stays in the tour', function (this: TamedTableWorld) {
  controller(this).stayTutorial();
});

When('user advances to the last tutorial step', async function (this: TamedTableWorld) {
  const c = controller(this);
  // Execute all steps including the last one (enters done state).
  while (!c.isTutorialDone()) {
    await c.nextStep();
  }
});

When(
  'user opens a deep link to feature {string} scenario {string}',
  async function (this: TamedTableWorld, feature: string, scenario: string) {
    await controller(this).openTutorialFromLink(feature, scenario);
  },
);

// ── Then ───────────────────────────────────────────────────────────────────

Then('the tutorial panel is shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).tutorialOpen, true, 'tutorial panel should be open');
});

Then('the tutorial panel is not shown', function (this: TamedTableWorld) {
  assert.equal(controller(this).tutorialOpen, false, 'tutorial panel should be closed');
});

Then('the tutorial list includes {string}', function (this: TamedTableWorld, name: string) {
  const names = controller(this).tutorialScenarioNames();
  assert.ok(names.includes(name), `tutorial list should include "${name}"; got: ${JSON.stringify(names)}`);
});

Then('the tour {string} is marked complete', function (this: TamedTableWorld, name: string) {
  assert.ok(controller(this).isTourCompleted(name), `tour "${name}" should be marked complete`);
});

Then('the tour {string} is not marked complete', function (this: TamedTableWorld, name: string) {
  assert.ok(!controller(this).isTourCompleted(name), `tour "${name}" should not be marked complete`);
});

Then('the tutorial group {string} includes {string}', function (this: TamedTableWorld, group: string, name: string) {
  const groups = controller(this).tutorialGroups();
  const g = groups.find((x) => x.title === group);
  assert.ok(g, `tutorial group "${group}" not found; got: ${JSON.stringify(groups.map((x) => x.title))}`);
  assert.ok(g!.names.includes(name), `group "${group}" should include "${name}"; got: ${JSON.stringify(g!.names)}`);
});

Then('the dev list includes {string}', function (this: TamedTableWorld, name: string) {
  const names = controller(this).devScenarioNames();
  assert.ok(names.includes(name), `dev list should include "${name}"; got: ${JSON.stringify(names)}`);
});

Then('the dev list does not include {string}', function (this: TamedTableWorld, name: string) {
  const names = controller(this).devScenarioNames();
  assert.ok(!names.includes(name), `dev list should not include "${name}"; got: ${JSON.stringify(names)}`);
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

Then('no table is loaded', function (this: TamedTableWorld) {
  assert.equal(controller(this).isLoaded(), false, 'app should be in the empty state');
});

Then('the golden rows are available', function (this: TamedTableWorld) {
  assert.notEqual(controller(this).goldenRows, null, 'goldenRows should not be null');
});

// The focus targets the mobile shell keys off: 'tutorial-chat-input' raises
// the Type sheet; anything else returns the dock.
Then('the tour step targets the Open control', function (this: TamedTableWorld) {
  assert.equal(controller(this).currentStepElementId(), 'tutorial-open-btn');
});

Then('the tour step targets the chat composer', function (this: TamedTableWorld) {
  assert.equal(controller(this).currentStepElementId(), 'tutorial-chat-input');
});

Then('the chat input is prefilled with {string}', function (this: TamedTableWorld, text: string) {
  assert.equal(controller(this).tutorialPrefill, text);
});

Then('the chat input is not prefilled', function (this: TamedTableWorld) {
  const prefill = controller(this).tutorialPrefill;
  assert.ok(prefill === '' || prefill === null, `expected no prefill; got ${JSON.stringify(prefill)}`);
});

Then('the tutorial settles', async function (this: TamedTableWorld) {
  await controller(this).tutorialSettle();
});
