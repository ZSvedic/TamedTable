// #Cassettes
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadlessRunner } from '@tamedtable/headless';
import { cassetteFetch, fingerprint, type CassetteEntry, type FetchLike } from './cassette.ts';
import { TamedTableWorld, SPEC_TC_DIR } from './world.ts';

interface RecordedRequest {
  method: string;
  url: string;
  body: string;
}

interface CassetteTestState {
  runner?: ReturnType<typeof createHeadlessRunner>;
  fetchStubCalls?: string[];
  cassetteFile?: string;
  recorder?: FetchLike;
  recordedReq?: RecordedRequest;
  recordedEntry?: CassetteEntry;
  sentinelHit?: boolean;
  upstreamCalls?: number;
  lastResponse?: Response;
  lastError?: Error;
}

// Cucumber gives each scenario a fresh World, so a per-world bag keeps the
// cassette steps' state scenario-isolated.
function st(world: object): CassetteTestState {
  const w = world as { _cassette?: CassetteTestState };
  return (w._cassette ??= {});
}

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

function sampleRequest(content: string): RecordedRequest {
  return {
    method: 'POST',
    url: MESSAGES_URL,
    body: JSON.stringify({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content }] }),
  };
}

function freshCassettePath(): string {
  return join(mkdtempSync(join(tmpdir(), 'tt-cassette-')), 'cassette.json');
}

// ── Rule: the headless runner routes model calls through a supplied fetch ────

Given('a headless runner built with a fetch stub that logs each call', function (this: TamedTableWorld) {
  const s = st(this);
  s.fetchStubCalls = [];
  const stub: FetchLike = async (input) => {
    s.fetchStubCalls!.push(String(input));
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  // A non-empty apiKey is required to build the provider; the stub intercepts
  // every call, so the placeholder never leaves the process.
  const opts = { fetch: stub, apiKey: 'cassette-test-key', maxRetries: 0 };
  s.runner = createHeadlessRunner(opts);
});

When('a natural-language request runs', async function (this: TamedTableWorld) {
  const s = st(this);
  await s.runner!.loadInput(join(SPEC_TC_DIR, 'datanorm-input.csv'));
  try {
    await s.runner!.request('Normalize phone numbers');
  } catch (e) {
    s.lastError = e as Error;
  }
});

Then('the fetch stub logged the model API call', function (this: TamedTableWorld) {
  const s = st(this);
  assert.ok(
    (s.fetchStubCalls?.length ?? 0) > 0,
    'expected the caller-supplied fetch to receive the model API call, but it was never invoked — the runner did not forward opts.fetch to the SDK',
  );
});

// ── Rule: replay serves recorded responses; misses fail loud ────────────────

Given('a cassette holding a recorded response for one request', function (this: TamedTableWorld) {
  const s = st(this);
  s.cassetteFile = freshCassettePath();
  s.recordedReq = sampleRequest('normalize phone numbers');
  s.recordedEntry = {
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recorded: true }),
  };
  const fp = fingerprint(s.recordedReq.method, s.recordedReq.url, s.recordedReq.body);
  writeFileSync(s.cassetteFile, JSON.stringify({ [fp]: s.recordedEntry }, null, 2));
  // The upstream must never be consulted in replay mode; this sentinel proves it.
  s.sentinelHit = false;
  const sentinel: FetchLike = async () => {
    s.sentinelHit = true;
    throw new Error('network sentinel: replay must not touch the network');
  };
  s.recorder = cassetteFetch({ mode: 'replay', file: s.cassetteFile, upstream: sentinel });
});

When('the recorder replays that exact request', async function (this: TamedTableWorld) {
  const s = st(this);
  const req = s.recordedReq!;
  try {
    s.lastResponse = await s.recorder!(req.url, { method: req.method, body: req.body });
  } catch (e) {
    s.lastError = e as Error;
  }
});

When('the recorder replays a different, unrecorded request', async function (this: TamedTableWorld) {
  const s = st(this);
  const req = s.recordedReq!;
  try {
    s.lastResponse = await s.recorder!(req.url, {
      method: req.method,
      body: JSON.stringify({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'a different request' }] }),
    });
  } catch (e) {
    s.lastError = e as Error;
  }
});

When('the recorder replays that request with its body changed', async function (this: TamedTableWorld) {
  const s = st(this);
  const req = s.recordedReq!;
  try {
    s.lastResponse = await s.recorder!(req.url, { method: req.method, body: req.body + ' ' });
  } catch (e) {
    s.lastError = e as Error;
  }
});

Then('the recorder returns the recorded status and body', async function (this: TamedTableWorld) {
  const s = st(this);
  assert.ok(s.lastResponse, `expected a replayed response, got error: ${s.lastError?.message ?? '(none)'}`);
  assert.equal(s.lastResponse.status, s.recordedEntry!.status, 'replayed status');
  assert.equal(await s.lastResponse.text(), s.recordedEntry!.body, 'replayed body');
});

Then('the recorder fails with {string}', function (this: TamedTableWorld, needle: string) {
  const s = st(this);
  assert.ok(s.lastError, 'expected the recorder to throw, but it returned a response');
  assert.ok(
    s.lastError.message.includes(needle),
    `expected the error to include "${needle}", got: ${s.lastError.message}`,
  );
});

Then('the network is never touched', function (this: TamedTableWorld) {
  const s = st(this);
  assert.equal(s.sentinelHit, false, 'the recorder reached the network upstream during replay');
});

// ── Rule: record captures a response once and reuses it ─────────────────────

Given('an empty cassette wrapping an upstream that answers one request', function (this: TamedTableWorld) {
  const s = st(this);
  s.cassetteFile = freshCassettePath();
  s.recordedReq = sampleRequest('normalize phone numbers');
  s.upstreamCalls = 0;
  const upstream: FetchLike = async () => {
    s.upstreamCalls = (s.upstreamCalls ?? 0) + 1;
    return new Response(JSON.stringify({ recorded: true }), {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    });
  };
  s.recorder = cassetteFetch({ mode: 'record', file: s.cassetteFile, upstream });
});

When('the recorder records that request twice', async function (this: TamedTableWorld) {
  const s = st(this);
  const req = s.recordedReq!;
  try {
    for (let i = 0; i < 2; i++) {
      await s.recorder!(req.url, { method: req.method, body: req.body });
    }
  } catch (e) {
    s.lastError = e as Error;
  }
});

Then('the upstream is called exactly once', function (this: TamedTableWorld) {
  const s = st(this);
  assert.equal(
    s.upstreamCalls,
    1,
    `expected the upstream to be called once, got ${s.upstreamCalls}${s.lastError ? ` (recorder error: ${s.lastError.message})` : ''}`,
  );
});

Then('the cassette file holds one recording', function (this: TamedTableWorld) {
  const s = st(this);
  assert.ok(s.cassetteFile && existsSync(s.cassetteFile), 'cassette file was not written');
  const parsed = JSON.parse(readFileSync(s.cassetteFile, 'utf8')) as Record<string, unknown>;
  assert.equal(Object.keys(parsed).length, 1, `expected exactly 1 recording, got ${Object.keys(parsed).length}`);
});
