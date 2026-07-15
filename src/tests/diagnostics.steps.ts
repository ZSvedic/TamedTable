// #Diagnostics — step definitions for spec/test-cases/diagnostics.feature
import { Given, Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { TamedTableWorld } from './world.ts';
import { webController as controller } from './web-file-port.ts';

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

/** The newest assistant chat message, or undefined. */
function lastAssistant(world: TamedTableWorld): { id: number; text: string; reportable?: boolean } | undefined {
  return controller(world)
    .messages.filter((m) => m.role === 'assistant')
    .at(-1);
}

Then('the last assistant reply offers to report a bug', function (this: TamedTableWorld) {
  const m = lastAssistant(this);
  assert.ok(m, 'no assistant reply was pushed');
  assert.equal(m.reportable, true, `reply is not reportable: "${m.text}"`);
});

Then('the last assistant reply does not offer to report a bug', function (this: TamedTableWorld) {
  const m = lastAssistant(this);
  assert.ok(m, 'no assistant reply was pushed');
  assert.ok(!m.reportable, `reply is unexpectedly reportable: "${m.text}"`);
});

Then('the last assistant reply shows {string}', function (this: TamedTableWorld, needle: string) {
  const m = lastAssistant(this);
  assert.ok(m, 'no assistant reply was pushed');
  assert.ok(m.text.includes(needle), `reply "${m.text}" does not contain "${needle}"`);
});

When('user reports the last chat reply as a bug', async function (this: TamedTableWorld) {
  const m = lastAssistant(this);
  assert.ok(m, 'no assistant reply was pushed');
  await controller(this).reportMessageBug(m.id);
});

Then(
  'a diagnostics user report records the request {string}',
  function (this: TamedTableWorld, request: string) {
    const reports = controller(this)
      .diagnosticsEvents()
      .filter((e) => e.context.source === 'user-report');
    assert.ok(reports.length > 0, 'no user-report diagnostics event was recorded');
    assert.ok(
      reports.some((e) => e.context.userRequest === request),
      `no user report carried the request "${request}"; saw: ${JSON.stringify(reports.map((e) => e.context.userRequest))}`,
    );
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

Given('the diagnostics log is filled with long events', function (this: TamedTableWorld) {
  // Enough long toasts to overflow any URL budget, with the punctuation a real
  // report carries (quotes, slashes, arrows) — percent-encoding inflates those
  // ~3×, which is exactly what pushed real links past GitHub's limit.
  for (let i = 0; i < 25; i++) {
    controller(this).pushToast(
      'error',
      `Could not load tutorial fixture "fixture-${i}.jsonl": fetch /pr-preview/pr-222/app/samples/fixture-${i}.jsonl → 503 ${'"{*}" → '.repeat(30)}`,
    );
  }
});

Then(
  'the bug report link is shorter than {int} characters',
  function (this: TamedTableWorld, max: number) {
    const url = controller(this).bugReportUrl();
    assert.ok(url.length < max, `bug report link is ${url.length} chars, expected < ${max}`);
  },
);

Then('the bug report link notes the report was truncated', function (this: TamedTableWorld) {
  const url = decodeURIComponent(controller(this).bugReportUrl().replaceAll('+', ' '));
  assert.ok(url.includes('Report truncated'), 'bug report link carries no truncation note');
});

Then('the bug report link targets the TamedTable issue tracker', function (this: TamedTableWorld) {
  const url = controller(this).bugReportUrl();
  assert.ok(
    url.includes('github.com/ZSvedic/TamedTable/issues/new'),
    `bug report link does not target the issue tracker: ${url}`,
  );
  assert.ok(url.includes('body='), 'bug report link has no prefilled body');
});

Then('the bug report link contains no API key', function (this: TamedTableWorld) {
  const url = decodeURIComponent(controller(this).bugReportUrl());
  for (const re of KEY_SHAPES) {
    const hit = url.match(re);
    assert.ok(!hit, `bug report link leaked an api-key-shaped string: ${hit?.[0]}`);
  }
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
