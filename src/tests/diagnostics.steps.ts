// #Diagnostics — step definitions for spec/test-cases/diagnostics.feature
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import type { WebController } from '@tamedtable/web';
import { TamedTableWorld } from './world.ts';

function controller(world: TamedTableWorld): WebController {
  return world.ensureRunner() as unknown as WebController;
}

/** Patterns that must never appear in a pasted report. */
const KEY_SHAPES = [/sk-[A-Za-z0-9_-]+/, /AIza[A-Za-z0-9_-]+/];

/** Events whose context carries a request fingerprint (failed request or
 *  replay miss), newest last. */
function requestEvents(world: TamedTableWorld): Array<Record<string, unknown>> {
  return controller(world)
    .diagnosticsEvents()
    .map((e) => e.context)
    .filter((c) => typeof c.fingerprint === 'string');
}

Then('a diagnostics event records a request fingerprint', function (this: TamedTableWorld) {
  const fps = requestEvents(this).map((c) => c.fingerprint as string);
  assert.ok(fps.length > 0, 'no diagnostics event carried a request fingerprint');
  assert.ok(
    fps.some((fp) => /^[0-9a-f]{64}$/.test(fp)),
    `no fingerprint looked like a SHA-256 hex digest; got: ${JSON.stringify(fps)}`,
  );
});

Then(
  'the latest request diagnostics event names the provider {string}',
  function (this: TamedTableWorld, provider: string) {
    const events = requestEvents(this);
    const latest = events[events.length - 1];
    assert.ok(latest, 'no request diagnostics event was recorded');
    assert.equal(latest.provider, provider);
  },
);

Then(
  'the latest request diagnostics event carries a truncated request body',
  function (this: TamedTableWorld) {
    const events = requestEvents(this);
    const latest = events[events.length - 1];
    assert.ok(latest, 'no request diagnostics event was recorded');
    assert.equal(typeof latest.requestBody, 'string', 'requestBody is not a string');
    assert.ok((latest.requestBody as string).length > 0, 'requestBody is empty');
    assert.ok((latest.requestBody as string).length <= 2048, 'requestBody exceeds the 2 KB cap');
  },
);

Then(
  'a diagnostics event names the tutorial scenario {string}',
  function (this: TamedTableWorld, scenario: string) {
    const named = controller(this)
      .diagnosticsEvents()
      .some((e) => e.context.scenario === scenario);
    const seen = controller(this).diagnosticsEvents().map((e) => e.context.scenario);
    assert.ok(named, `no diagnostics event named scenario "${scenario}"; saw: ${JSON.stringify(seen)}`);
  },
);

Then('the diagnostics report contains no API key', function (this: TamedTableWorld) {
  const report = controller(this).diagnosticsReport();
  for (const re of KEY_SHAPES) {
    const hit = report.match(re);
    assert.ok(!hit, `report leaked an api-key-shaped string: ${hit?.[0]}`);
  }
});

Then('the diagnostics report drops the provider key fields', function (this: TamedTableWorld) {
  const report = controller(this).diagnosticsReport();
  for (const field of ['anthropicKey', 'geminiKey', 'openaiKey']) {
    assert.ok(!report.includes(field), `report still mentions "${field}"`);
  }
  assert.ok(!report.includes('DEADBEEF'), 'report still contains a secret key value');
});

Then('the diagnostics report mentions the app version', function (this: TamedTableWorld) {
  const report = controller(this).diagnosticsReport();
  assert.ok(/version/i.test(report), 'report does not mention a version');
});

Then('the diagnostics report lists the most recent event first', function (this: TamedTableWorld) {
  const events = controller(this).diagnosticsEvents(); // chronological, newest last
  assert.ok(events.length >= 2, `need at least 2 events to check ordering, got ${events.length}`);
  const report = controller(this).diagnosticsReport();
  const newest = report.indexOf(events[events.length - 1]!.message);
  const oldest = report.indexOf(events[0]!.message);
  assert.ok(newest >= 0 && oldest >= 0, 'event messages missing from report');
  assert.ok(newest < oldest, 'report did not list the newest event first');
});

Then('the diagnostics log is not empty', function (this: TamedTableWorld) {
  assert.ok(controller(this).diagnosticsEvents().length > 0, 'diagnostics log is empty');
});

Then('the diagnostics log is empty', function (this: TamedTableWorld) {
  assert.equal(controller(this).diagnosticsEvents().length, 0);
});

When('user clears diagnostics', function (this: TamedTableWorld) {
  controller(this).clearDiagnostics();
});
