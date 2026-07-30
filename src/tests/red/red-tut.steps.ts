// Red step defs for spec/test-cases/red/red-tut.feature — the tutorial-mode
// bug inventory. Self-contained: each scenario builds its own WebController
// with TutorialSources read straight from disk (the same shape
// src/tests/web.hooks.ts buildTutorialSources uses). Model turns replay from
// the committed cassettes — no network, no API key, never records.
import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createWebController,
  type WebController,
  type FilePort,
  type TutorialSources,
} from '@tamedtable/web';
import { parseTours } from '@tamedtable/gherkin-tour';
import type { TablePlan } from '@tamedtable/core';

// Path anchors, resolved from this file's location (src/tests/red/).
const REPO_ROOT = join(import.meta.dirname, '../../..');
const SPEC_TC = join(REPO_ROOT, 'spec/test-cases');
const CASSETTES = join(REPO_ROOT, 'cassettes');

// The same @tour/@web feature files the deployed bundle indexes (mirrors
// src/tests/web.hooks.ts TUTORIAL_FEATURES).
const TUTORIAL_FEATURES = [
  'showcase-cleanup.feature', 'showcase-enrich.feature', 'showcase-classify.feature',
  'showcase-validate.feature', 'showcase-language.feature', 'showcase-exact.feature',
  'filter.feature', 'aggregate.feature', 'join.feature',
  'colsplit.feature', 'dedupe.feature', 'pivot.feature', 'validate.feature',
  'voice.feature', 'sort.feature', 'multilingual.feature',
  'clean-up.feature', 'enrich.feature', 'classify.feature',
  'language-ai.feature', 'loadsave.feature',
  'showcase-lazy-ai.feature', 'lazy-exec.feature',
];

function redTutSources(over: Partial<TutorialSources> = {}): TutorialSources {
  const manifest = TUTORIAL_FEATURES.flatMap((feature) => {
    const src = readFileSync(join(SPEC_TC, feature), 'utf8');
    return parseTours(src)
      .filter((t) => t.tags.includes('@web'))
      .map((t) => ({ name: t.name, feature, tags: t.tags }));
  });
  return {
    manifest,
    loadFeature: (name) => Promise.resolve(readFileSync(join(SPEC_TC, name), 'utf8')),
    loadFixture: (name) => Promise.resolve(readFileSync(join(SPEC_TC, name), 'utf8')),
    loadCassette: (feature) => Promise.resolve(readFileSync(join(CASSETTES, `${feature}.json`), 'utf8')),
    loadAudio: (name) => Promise.resolve(new Uint8Array(readFileSync(join(SPEC_TC, name)))),
    ...over,
  };
}

function redTutController(src: TutorialSources): WebController {
  const port = {
    hasFileSystemAccess: true,
    pickOpen: () => Promise.resolve(null),
    pickSave: (name: string) => Promise.resolve({ status: 'saved' as const, name }),
  };
  return createWebController({ file: port as unknown as FilePort, env: {}, tutorialSources: src });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RedTutState {
  c: WebController;
  /** RED-TUT-1: whether the #LookupJoin dialog was raised for the join. */
  lookupDialogRaised?: boolean;
  /** RED-TUT-6: what openTutorialFromLink returned for the zero-step entry. */
  deepLinkMatched?: boolean;
}

const S = new WeakMap<object, RedTutState>();

function state(world: object): RedTutState {
  const s = S.get(world);
  if (!s) throw new Error('red-tut state missing — did the Given step run?');
  return s;
}

/** Play the selected tour to its terminal stop (bounded — a replay miss would
 *  otherwise leave nextStep a no-op forever and loop this for good). */
async function playToEnd(c: WebController): Promise<void> {
  for (let i = 0; i < 20 && !c.isTutorialDone(); i++) await c.nextStep();
  if (!c.isTutorialDone()) {
    throw new Error('red-tut precondition: tour never reached its terminal stop — cassette replay harness failure, not the bug under test');
  }
  await c.tutorialSettle();
}

// ── RED-TUT-1: tour-staged lookup survives tour exit ─────────────────────────

Given('a red tut session that played the join tour to the end and exited', async function () {
  const c = redTutController(redTutSources());
  c.selectTutorialScenario('Left join enriches each customer with ISO and Region');
  await c.playTutorial();
  await playToEnd(c);
  c.finishTutorial(); // Back to Tours — the tour is over, replay mode off
  S.set(this, { c });
});

When("the user loads their own table and asks for a join naming the tour's lookup file", async function () {
  const s = state(this);
  // The user's own fresh table — behavior.md:1740-1742: it gets a live engine,
  // nothing of the tour follows the user out.
  await s.c.loadFromText('customers-input.csv', readFileSync(join(SPEC_TC, 'customers-input.csv'), 'utf8'));
  // A join naming the same file the tour staged invisibly. The #LookupJoin
  // gate must ask for the user's file — it was never picked in this session.
  const joinSpec = {
    columns: [],
    transformations: [
      { kind: 'join', with: 'join-country-codes.csv', on: { js: 'leftRow.Country === rightRow.Country' }, how: 'left' },
    ],
  } as unknown as TablePlan;
  const gate = s.c.files.ensureLookups(joinSpec);
  await delay(25);
  s.lookupDialogRaised = s.c.lookupDialog !== null;
  if (s.lookupDialogRaised) s.c.dismissLookupDialog(); // unblock the gate when spec-correct
  await gate;
});

Then("the join asks for the user's own lookup file", function () {
  const s = state(this);
  assert.equal(
    s.lookupDialogRaised,
    true,
    `RED-TUT-1 (spec/behavior.md:1740-1742 + #LookupJoin): after the join tour ends, the user's own join naming "join-country-codes.csv" must raise the lookup dialog — instead the tour's invisibly staged fixture silently satisfies the join and the tour's bundled rows would be joined with no signal (controller-engine.ts stagedLookups survives reset; cancelTutorial never clears it)`,
  );
});

// ── RED-TUT-2: terminal stop marks completed before the last query settles ──

const RED_TUT_2_TOUR = 'Red off-script final query tour';

const RED_TUT_2_FEATURE = `
Feature: Red crafted
  @web @tour @cat-cleanup
  Scenario: ${RED_TUT_2_TOUR}
    Given load "filter-input.csv"
    And the expected output is "filter-expected.jsonl"
    When query "Show only customers located in the USA"
    Then compare with the expected output
`;

Given('a red tut session playing a crafted tour whose final query misses the tape', async function () {
  // Real filter fixtures + the real committed filter cassette, but the final
  // query's wording drifted by a word — the exact "stale cassette on a deploy"
  // failure mode. The replay lookup is guaranteed to miss.
  const c = redTutController({
    manifest: [{ name: RED_TUT_2_TOUR, feature: 'filter.feature', tags: ['@web', '@tour', '@cat-cleanup'] }],
    loadFeature: () => Promise.resolve(RED_TUT_2_FEATURE),
    loadFixture: (name) => Promise.resolve(readFileSync(join(SPEC_TC, name), 'utf8')),
    loadCassette: (feature) => Promise.resolve(readFileSync(join(CASSETTES, `${feature}.json`), 'utf8')),
    loadAudio: () => Promise.reject(new Error('no audio in this tour')),
  });
  c.selectTutorialScenario(RED_TUT_2_TOUR);
  await c.playTutorial();
  S.set(this, { c });
});

When('the visitor clicks Next through the terminal stop and the replay settles', async function () {
  const { c } = state(this);
  await c.nextStep(); // load step
  await c.nextStep(); // final query — enters the terminal stop while the request is in flight
  await c.tutorialSettle(); // the replay miss lands: off-script toast + full cancel
});

Then('the tour is not remembered as played to the end', function () {
  const { c } = state(this);
  const offScript = c.toasts.some((t) => t.message.includes('off-script'));
  if (!offScript) {
    throw new Error('red-tut precondition: the drifted final query did not miss the cassette — harness failure, not the bug under test');
  }
  assert.equal(
    c.isTourCompleted(RED_TUT_2_TOUR),
    false,
    'RED-TUT-2 (spec/behavior.md:1670-1672): only a tour "played to the end" carries the green checkmark — this tour ended with the "Tour ended — the guided replay went off-script." toast and a full cancel, yet it is permanently marked completed because the terminal stop runs markCompleted before the unawaited final prefill-chat request settles (controller-tutorial.ts:223-235, :489-500)',
  );
});

// ── RED-TUT-3: Esc mid-step does not stop the step ───────────────────────────

Given('a red tut session playing the filter tour with a slow fixture fetch', async function () {
  const c = redTutController(redTutSources({
    loadFixture: async (name) => {
      await delay(60); // a realistic same-origin fetch — never instantaneous
      return readFileSync(join(SPEC_TC, name), 'utf8');
    },
  }));
  c.selectTutorialScenario('Filter by Country');
  await c.playTutorial();
  S.set(this, { c });
});

When("the visitor presses Esc while the load step's fetch is in flight", async function () {
  const { c } = state(this);
  const inFlight = c.nextStep(); // executes the load-file step: fixture fetch starts
  await delay(15);
  if (c.isLoaded()) {
    throw new Error('red-tut precondition: the fixture fetch finished before Esc — timing harness failure, not the bug under test');
  }
  c.cancelTutorial(); // TourUi Esc → cursor.cancel() → cancelTutorial(), no guard
  await inFlight; // let the cancelled step drain
  await c.tutorialSettle();
});

Then('the red tut app is back in the empty state', function () {
  const { c } = state(this);
  assert.equal(
    c.isLoaded(),
    false,
    `RED-TUT-3 (spec/behavior.md:1698-1699, spec/code-contract.md:1525): Esc cancels — cancelTutorial "resets the engine and returns to the empty state" — yet the cancelled load step kept executing and loaded the tour's sample onto a live engine after the cancel (sourcePath=${JSON.stringify(c.sourcePath)}, chat bubbles=${c.messages.length}); executeTutorialStep has no staleness check between its awaits (controller-tutorial.ts:198-235, :458-538)`,
  );
});

Then('the red tut step cursor reports no active step', function () {
  const { c } = state(this);
  assert.equal(
    c.currentTutorialStepNumber(),
    null,
    `RED-TUT-3 (spec/code-contract.md:1531): currentTutorialStepNumber() must be "null when inactive or done" — no tour is active (isTutorialActive=${c.isTutorialActive()}, stepCount=${c.tutorialStepCount()}), yet it reports step ${c.currentTutorialStepNumber()} because advanceStep resurrects the nulled cursor after a mid-step cancel (controller-tutorial.ts:213-220 null++ arithmetic)`,
  );
});

// ── RED-TUT-6: zero-step manifest entry silently no-ops ─────────────────────

Given('a red tut session with the shipped tour manifest', function () {
  S.set(this, { c: redTutController(redTutSources()) });
});

When('a deep link opens the zero-step dev scenario', async function () {
  const s = state(this);
  // The one committed zero-step @web entry: every step classifies as display
  // and is dropped, so playTutorial arms nothing (controller-tutorial.ts:147).
  s.deepLinkMatched = await s.c.openTutorialFromLink(
    'voice.feature',
    'The mic is visible while a key-free tour plays',
  );
});

Then('the deep link reports that no tour played', function () {
  const s = state(this);
  if (s.c.isTutorialActive() || s.c.isTutorialDone()) {
    throw new Error('red-tut precondition: the zero-step scenario unexpectedly played — harness failure, not the bug under test');
  }
  assert.equal(
    s.deepLinkMatched,
    false,
    'RED-TUT-6 (spec/code-contract.md:1536, spec/behavior.md:1674-1676): openTutorialFromLink returns true only when a tour "plays from step 1" — the zero-step entry played nothing (no active tour, no toast, panel closed) yet the link reported true, so main.tsx installs the URL-rewrite watcher and strips the feature/scenario params although no tour ever ran (controller-tutorial.ts:133-142, :147)',
  );
});
