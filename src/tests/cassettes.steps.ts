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
  sharedBodies?: string[];
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
  await s.runner!.loadInput(join(SPEC_TC_DIR, 'customers-input.csv'));
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

Given('a cassette holding a recorded response for one request', async function (this: TamedTableWorld) {
  const s = st(this);
  s.cassetteFile = freshCassettePath();
  s.recordedReq = sampleRequest('normalize phone numbers');
  s.recordedEntry = {
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recorded: true }),
  };
  const fp = await fingerprint(s.recordedReq.method, s.recordedReq.url, s.recordedReq.body);
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
  const keys = Object.keys(parsed).filter((k) => k !== '_prefixes');
  assert.equal(keys.length, 1, `expected exactly 1 recording, got ${keys.length}`);
});

// ── Rule: recorded entries carry a readable request ──────────────────────────

interface StoredRequest {
  method: string;
  url: string;
  prefixId: string | null;
  suffix: string;
}

interface StoredEntry extends CassetteEntry {
  request?: StoredRequest;
}

function readTape(file: string): { prefixes: Record<string, string>; entries: Record<string, StoredEntry> } {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  const { _prefixes, ...rest } = raw;
  return {
    prefixes: (_prefixes ?? {}) as Record<string, string>,
    entries: rest as Record<string, StoredEntry>,
  };
}

function reconstructedBody(prefixes: Record<string, string>, req: StoredRequest): string {
  return (req.prefixId ? prefixes[req.prefixId] : '') + req.suffix;
}

// Long enough (> the 200-char sharing floor) that two bodies starting with it
// must dedupe into a shared prefix.
const BOILERPLATE = 'You are a table-editing assistant. '.repeat(12);

Then('the cassette entry stores the request method, url, and body', function (this: TamedTableWorld) {
  const s = st(this);
  const { prefixes, entries } = readTape(s.cassetteFile!);
  const [entry] = Object.values(entries);
  const request = entry?.request;
  assert.ok(request, 'expected the recorded entry to carry a request field');
  assert.equal(request.method, s.recordedReq!.method, 'stored request method');
  assert.equal(request.url, s.recordedReq!.url, 'stored request url');
  assert.equal(reconstructedBody(prefixes, request), s.recordedReq!.body, 'prefix + suffix must reconstruct the exact body');
});

Then('the entry key equals the fingerprint of the stored request', async function (this: TamedTableWorld) {
  const s = st(this);
  const { prefixes, entries } = readTape(s.cassetteFile!);
  const [key] = Object.keys(entries);
  const request = Object.values(entries)[0]?.request;
  assert.ok(request, 'expected the recorded entry to carry a request field');
  const fp = await fingerprint(request.method, request.url, reconstructedBody(prefixes, request));
  assert.equal(fp, key, 'fingerprint(stored request) must equal the entry key');
});

Given('an empty cassette wrapping an upstream that answers every request', function (this: TamedTableWorld) {
  const s = st(this);
  s.cassetteFile = freshCassettePath();
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

When('the recorder records two requests sharing a long boilerplate prefix', async function (this: TamedTableWorld) {
  const s = st(this);
  s.sharedBodies = [
    BOILERPLATE + 'First request: normalize phone numbers.',
    BOILERPLATE + 'Second request: normalize country names.',
  ];
  for (const body of s.sharedBodies) {
    await s.recorder!(MESSAGES_URL, { method: 'POST', body });
  }
});

Then('the cassette stores the shared boilerplate once as a named prefix', function (this: TamedTableWorld) {
  const s = st(this);
  const { prefixes } = readTape(s.cassetteFile!);
  const values = Object.values(prefixes);
  assert.equal(values.length, 1, `expected exactly one shared prefix, got ${values.length}`);
  assert.ok(
    values[0]!.startsWith(BOILERPLATE),
    'the shared prefix must hold the boilerplate both requests started with',
  );
});

Then('both entries reference that prefix and reconstruct their exact bodies', function (this: TamedTableWorld) {
  const s = st(this);
  const { prefixes, entries } = readTape(s.cassetteFile!);
  const [prefixId] = Object.keys(prefixes);
  const bodies = Object.values(entries).map((e) => {
    assert.equal(e.request?.prefixId, prefixId, 'every entry must reference the shared prefix');
    return reconstructedBody(prefixes, e.request!);
  });
  assert.deepEqual(bodies.sort(), [...s.sharedBodies!].sort(), 'reconstructed bodies must match the recorded requests');
});

// ── Rule: a replay miss names the nearest recording ──────────────────────────

Given('a cassette recorded from a request with a long boilerplate prefix', async function (this: TamedTableWorld) {
  const s = st(this);
  s.cassetteFile = freshCassettePath();
  s.recordedReq = { method: 'POST', url: MESSAGES_URL, body: BOILERPLATE + 'Normalize phone numbers.' };
  const upstream: FetchLike = async () =>
    new Response('{}', { status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' } });
  const rec = cassetteFetch({ mode: 'record', file: s.cassetteFile, upstream });
  await rec(s.recordedReq.url, { method: s.recordedReq.method, body: s.recordedReq.body });
  s.recorder = cassetteFetch({ mode: 'replay', file: s.cassetteFile });
});

When('the recorder replays that request with its ending changed', async function (this: TamedTableWorld) {
  const s = st(this);
  const req = s.recordedReq!;
  try {
    s.lastResponse = await s.recorder!(req.url, { method: req.method, body: BOILERPLATE + 'Translate country names.' });
  } catch (e) {
    s.lastError = e as Error;
  }
});

Then('the failure names the byte where the nearest recording differs', function (this: TamedTableWorld) {
  const s = st(this);
  assert.ok(s.lastError, 'expected the recorder to throw');
  const expectedByte = `POST\n${MESSAGES_URL}\n${BOILERPLATE}`.length;
  assert.ok(
    s.lastError.message.includes(`differs at byte ${expectedByte}`),
    `expected the miss to point at byte ${expectedByte}, got: ${s.lastError.message}`,
  );
});
