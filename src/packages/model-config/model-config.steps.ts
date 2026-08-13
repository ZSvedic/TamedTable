// #ModelConfig
import { After, Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import {
  resolveConfig,
  defaultModel,
  defaultCellModel,
  defaultBatchSize,
  hasPaidModelSet,
  supportsVoiceInput,
  priceVariesByPlan,
  detectProvider,
  connectedProviders,
  modelFor,
  providerFor,
  acceptsTemperature,
  keyFor,
  ALL_MODELS,
  DEFAULTS,
  SUPPORTED_PREFIXES,
  type ResolvedConfig,
  type Provider,
  type EngineProvider,
  type Tier,
} from '@tamedtable/model-config';
import {
  verifyKey, measureModel, estimateSecPer1kTok,
  type FetchLike, type ModelMeasure,
} from './probe.ts';
import {
  readStoredConfig, writeStoredConfig, clearStoredConfig,
  readStoredProbes, writeStoredProbes, clearStoredProbes,
} from './storage.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

interface ModelConfigCtx {
  resolved?: ResolvedConfig;
  stored?: Partial<ResolvedConfig>;
  providerResult?: EngineProvider;
  detected?: Provider | null;
  detectedSet?: boolean;
  modelResult?: string;
  keyResult?: string | null;
  boolResult?: boolean;
  numberResult?: number | undefined;
  numberResultSet?: boolean;
  /** The card order map a connectedProviders scenario is building up. */
  order?: Partial<Record<Provider, number>>;
  /** The stub provider API a probe scenario installed, and what it saw. */
  stub?: StubApi;
  tier?: Tier;
  probeError?: string;
  measured?: ModelMeasure;
}

// The only shape these steps need from the cucumber World — state hangs off
// one private property, keeping the package independent of the app harness.
interface ModelConfigWorld {
  _mcCtx?: ModelConfigCtx;
}

function ctx(world: ModelConfigWorld): ModelConfigCtx {
  if (!world._mcCtx) world._mcCtx = {};
  return world._mcCtx;
}

// ── resolveConfig steps ───────────────────────────────────────────────────────

When(
  'resolveConfig is called with empty env and empty stored',
  function (this: ModelConfigWorld) {
    ctx(this).resolved = resolveConfig({}, {});
  },
);

When(
  'resolveConfig is called with env ANTHROPIC_API_KEY={string}',
  function (this: ModelConfigWorld, key: string) {
    ctx(this).resolved = resolveConfig({ ANTHROPIC_API_KEY: key }, {});
  },
);

When(
  'resolveConfig is called with env GEMINI_API_KEY={string}',
  function (this: ModelConfigWorld, key: string) {
    ctx(this).resolved = resolveConfig({ GEMINI_API_KEY: key }, {});
  },
);

When(
  'resolveConfig is called with env OPENAI_API_KEY={string}',
  function (this: ModelConfigWorld, key: string) {
    ctx(this).resolved = resolveConfig({ OPENAI_API_KEY: key }, {});
  },
);

When(
  'resolveConfig is called with env OPENROUTER_API_KEY={string}',
  function (this: ModelConfigWorld, key: string) {
    ctx(this).resolved = resolveConfig({ OPENROUTER_API_KEY: key }, {});
  },
);

When(
  'resolveConfig is called with env PUTER_TOKEN={string}',
  function (this: ModelConfigWorld, key: string) {
    ctx(this).resolved = resolveConfig({ PUTER_TOKEN: key }, {});
  },
);

When(
  'resolveConfig is called with env GROQ_API_KEY={string}',
  function (this: ModelConfigWorld, key: string) {
    ctx(this).resolved = resolveConfig({ GROQ_API_KEY: key }, {});
  },
);

// Set an arbitrary subset of provider keys at once — the comma list names the
// env vars; each gets a placeholder value. Drives the provider-precedence
// outline, which only asserts which provider wins, not the literal key string.
When(
  'resolveConfig is called with env keys {string}',
  function (this: ModelConfigWorld, keys: string) {
    const env: Record<string, string> = {};
    for (const k of keys.split(',').map((s) => s.trim()).filter(Boolean)) {
      env[k] = `${k}-value`;
    }
    ctx(this).resolved = resolveConfig(env, {});
  },
);

When(
  'resolveConfig is called with empty env and stored provider {string} and geminiKey {string}',
  function (this: ModelConfigWorld, provider: string, geminiKey: string) {
    ctx(this).resolved = resolveConfig({}, {
      provider: provider as Provider,
      geminiKey,
    });
  },
);

When(
  'resolveConfig is called with env ANTHROPIC_API_KEY={string} and stored anthropicKey {string}',
  function (this: ModelConfigWorld, envKey: string, storedKey: string) {
    ctx(this).resolved = resolveConfig(
      { ANTHROPIC_API_KEY: envKey },
      { anthropicKey: storedKey },
    );
  },
);

When(
  'resolveConfig is called with env TAMEDTABLE_MODEL={string} and stored model {string}',
  function (this: ModelConfigWorld, envModel: string, storedModel: string) {
    ctx(this).resolved = resolveConfig(
      { TAMEDTABLE_MODEL: envModel },
      { model: storedModel },
    );
  },
);

When(
  'resolveConfig is called with env TAMEDTABLE_CELL_MODEL={string} and stored cellModel {string}',
  function (this: ModelConfigWorld, envCellModel: string, storedCellModel: string) {
    ctx(this).resolved = resolveConfig(
      { TAMEDTABLE_CELL_MODEL: envCellModel },
      { cellModel: storedCellModel },
    );
  },
);

When(
  'resolveConfig is called with stored provider {string} and cellModel {string}',
  function (this: ModelConfigWorld, provider: string, cellModel: string) {
    ctx(this).resolved = resolveConfig({}, {
      provider: provider as Provider,
      cellModel,
    });
  },
);

When(
  'resolveConfig is called with stored provider {string} and model {string}',
  function (this: ModelConfigWorld, provider: string, model: string) {
    ctx(this).resolved = resolveConfig({}, {
      provider: provider as Provider,
      model,
    });
  },
);

When(
  'resolveConfig is called with env GEMINI_API_KEY={string} and TAMEDTABLE_MODEL={string}',
  function (this: ModelConfigWorld, key: string, model: string) {
    ctx(this).resolved = resolveConfig({ GEMINI_API_KEY: key, TAMEDTABLE_MODEL: model }, {});
  },
);

Then(
  'the resolved provider is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.provider, expected);
  },
);

Then(
  'the resolved model is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.model, expected);
  },
);

Then(
  'the resolved cellModel is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.cellModel, expected);
  },
);

Then(
  'the resolved anthropicKey is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.anthropicKey, expected);
  },
);

Then(
  'the resolved anthropicKey is null',
  function (this: ModelConfigWorld) {
    assert.equal(ctx(this).resolved?.anthropicKey, null);
  },
);

Then(
  'the resolved geminiKey is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.geminiKey, expected);
  },
);

Then(
  'the resolved geminiKey is null',
  function (this: ModelConfigWorld) {
    assert.equal(ctx(this).resolved?.geminiKey, null);
  },
);

Then(
  'the resolved openaiKey is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.openaiKey, expected);
  },
);

Then(
  'the resolved openaiKey is null',
  function (this: ModelConfigWorld) {
    assert.equal(ctx(this).resolved?.openaiKey, null);
  },
);

Then(
  'the resolved openrouterKey is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.openrouterKey, expected);
  },
);

Then(
  'the resolved puterToken is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.puterToken, expected);
  },
);

Then(
  'the resolved groqKey is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.groqKey, expected);
  },
);

// Non-null check on a named resolved key field (geminiKey / openaiKey / …),
// used by the precedence outline where the winning key varies per row.
Then(
  'the resolved {word} is set',
  function (this: ModelConfigWorld, field: string) {
    const resolved = ctx(this).resolved as Record<string, unknown> | undefined;
    assert.ok(resolved && resolved[field] != null, `expected resolved ${field} to be set`);
  },
);

// ── keyFor steps ─────────────────────────────────────────────────────────────

// Build a full ResolvedConfig directly. An empty key string stands in for a
// missing key (null), matching how resolveConfig leaves an unset provider key.
/** A complete ResolvedConfig with every key null but the ones named. An empty
 *  key string stands in for a missing key, matching how resolveConfig leaves an
 *  unset provider key. */
function configFor(provider: string, keys: Partial<ResolvedConfig>): ResolvedConfig {
  return {
    provider: provider as Provider,
    anthropicKey: null,
    geminiKey: null,
    openaiKey: null,
    groqKey: null,
    openrouterKey: null,
    puterToken: null,
    model: defaultModel(provider as Provider),
    cellModel: defaultCellModel(provider as Provider),
    openrouterPaid: false,
    alwaysRunAll: false,
    ...keys,
  };
}

Given(
  'a resolved config for provider {string} with keys anthropic {string}, gemini {string}, openai {string}',
  function (this: ModelConfigWorld, provider: string, anthropic: string, gemini: string, openai: string) {
    ctx(this).resolved = configFor(provider, {
      anthropicKey: anthropic || null,
      geminiKey: gemini || null,
      openaiKey: openai || null,
    });
  },
);

Given(
  'a resolved config for provider {string} with openrouterKey {string}',
  function (this: ModelConfigWorld, provider: string, openrouterKey: string) {
    ctx(this).resolved = configFor(provider, { openrouterKey: openrouterKey || null });
  },
);

Given(
  'a resolved config for provider {string} with groqKey {string}',
  function (this: ModelConfigWorld, provider: string, groqKey: string) {
    ctx(this).resolved = configFor(provider, { groqKey: groqKey || null });
  },
);

When('keyFor is called', function (this: ModelConfigWorld) {
  ctx(this).keyResult = keyFor(ctx(this).resolved!);
});

Then('the key result is {string}', function (this: ModelConfigWorld, expected: string) {
  assert.equal(ctx(this).keyResult, expected);
});

Then('the key result is null', function (this: ModelConfigWorld) {
  assert.equal(ctx(this).keyResult, null);
});

// ── detectProvider steps ─────────────────────────────────────────────────────

When(
  'detectProvider is called with {string}',
  function (this: ModelConfigWorld, key: string) {
    ctx(this).detected = detectProvider(key);
    ctx(this).detectedSet = true;
  },
);

Then(
  'the detected provider is {string}',
  function (this: ModelConfigWorld, expected: string) {
    assert.ok(ctx(this).detectedSet, 'detectProvider was not called');
    assert.equal(ctx(this).detected, expected);
  },
);

Then('no provider is detected', function (this: ModelConfigWorld) {
  assert.ok(ctx(this).detectedSet, 'detectProvider was not called');
  assert.equal(ctx(this).detected, null);
});

Then('SUPPORTED_PREFIXES is {string}', function (this: ModelConfigWorld, expected: string) {
  assert.equal(SUPPORTED_PREFIXES.join(', '), expected);
});

// ── modelFor steps ───────────────────────────────────────────────────────────
// Ids are shared across providers (Puter re-serves them), so the catalogue is
// keyed by both.

Then(
  'modelFor {string} {string} is named {string}',
  function (this: ModelConfigWorld, provider: string, modelId: string, name: string) {
    assert.equal(modelFor(provider as Provider, modelId)?.name, name);
  },
);

Then(
  'modelFor {string} {string} is missing',
  function (this: ModelConfigWorld, provider: string, modelId: string) {
    assert.equal(modelFor(provider as Provider, modelId), undefined);
  },
);

// ── connectedProviders steps ─────────────────────────────────────────────────

Given(
  'a stored config with geminiKey {string} and groqKey {string}',
  function (this: ModelConfigWorld, geminiKey: string, groqKey: string) {
    ctx(this).resolved = resolveConfig({}, { geminiKey, groqKey });
  },
);

Given(
  'a stored config with geminiKey {string} and openaiKey {string}',
  function (this: ModelConfigWorld, geminiKey: string, openaiKey: string) {
    ctx(this).resolved = resolveConfig({}, { geminiKey, openaiKey });
  },
);

Given(
  '{word} was connected at {int}',
  function (this: ModelConfigWorld, provider: string, at: number) {
    const c = ctx(this);
    c.order = { ...c.order, [provider as Provider]: at };
  },
);

// The empty string means "no providers connected" — a comma list otherwise.
// With no `was connected at` step the order map is empty, which is the
// catalogue-order case.
Then(
  'connectedProviders returns {string}',
  function (this: ModelConfigWorld, expected: string) {
    const c = ctx(this);
    assert.equal(connectedProviders(c.resolved!, c.order).join(', '), expected);
  },
);

Then(
  'priceVariesByPlan for {string} is {word}',
  function (this: ModelConfigWorld, provider: string, expected: string) {
    assert.equal(priceVariesByPlan(provider as Provider), expected === 'true');
  },
);

// ── probe steps ──────────────────────────────────────────────────────────────
// verifyKey and measureModel are the only parts of the module that touch the
// network, so both take an injected fetch (and clock). A scenario installs a
// stub here; nothing in the suite reaches a real provider.

interface StubApi {
  fetch: FetchLike;
  now: () => number;
  calls: number;
}

interface StubSpec {
  status?: number;
  /** Value for Gemini's x-gemini-service-tier response header. */
  serviceTier?: string;
  isFreeTier?: boolean;
  inTok?: number;
  outTok?: number;
  /** Seconds the clock advances across the call. */
  elapsed?: number;
  unreachable?: boolean;
  /** Provider error code carried in the body (e.g. OpenAI's insufficient_quota). */
  code?: string;
  /** Streaming script: how many SSE frames, when the first and last land, and
   *  how many leading frames carry no text (a role header, a ping, thinking
   *  deltas) — the ones the first-token clock has to see through. */
  stream?: {
    frames: number; firstSec: number; lastSec: number; outTok: number; silent?: number;
  };
}

/** A frame carrying generated text, spelled every way at once — Gemini's
 *  parts, Anthropic's content_block_delta, and the OpenAI-compatible delta —
 *  so one stub serves whichever parser the provider under test uses. */
const TEXT_FRAME = {
  candidates: [{ content: { parts: [{ text: 'x' }] } }],
  type: 'content_block_delta',
  delta: { text: 'x' },
  choices: [{ delta: { content: 'x' } }],
};

/** A frame carrying no output: a ping, an opening role header, and a Gemini
 *  reasoning part — which is text on the wire and not output on the screen. */
const SILENT_FRAME = {
  candidates: [{ content: { parts: [{ text: 'hmm', thought: true }] } }],
  type: 'ping',
  choices: [{ delta: { role: 'assistant' } }],
};

/** One stub standing in for every provider. The body carries all three usage
 *  shapes at once (Gemini's, Anthropic's, and the OpenAI-compatible one) so a
 *  single stub serves whichever parser the provider under test uses. */
function stubApi(spec: StubSpec): StubApi {
  const { status = 200, elapsed = 0 } = spec;
  const inTok = spec.inTok ?? 10;
  const outTok = spec.outTok ?? 10;
  let clock = 0;
  const api: StubApi = {
    calls: 0,
    now: () => clock,
    fetch: async () => {
      api.calls++;
      if (spec.unreachable) throw new TypeError('Failed to fetch');
      // Streaming mode: the body is delivered as scripted SSE chunks, and the
      // clock advances as each one is read — so a scenario controls exactly
      // when the first and last tokens land without waiting for real time.
      if (spec.stream && status < 400) {
        const { frames, firstSec, lastSec, outTok: streamOut, silent = 0 } = spec.stream;
        const usage = {
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: streamOut },
          usage: {
            input_tokens: 100, output_tokens: streamOut,
            prompt_tokens: 100, completion_tokens: streamOut,
          },
        };
        // Last frame is the usage report (no text); the `silent` leading ones
        // carry no text either; everything between is generated output.
        const frameAt = (i: number): object =>
          i === frames - 1 ? usage : i < silent ? SILENT_FRAME : TEXT_FRAME;
        const chunks = Array.from({ length: frames }, (_, i) =>
          `data: ${JSON.stringify(frameAt(i))}\n\n`);
        let read = 0;
        const encoder = new TextEncoder();
        // highWaterMark 0 so `pull` only runs when a read is waiting — with the
        // default of 1 the stream fills a chunk ahead, and the clock would run
        // one chunk in front of the reader.
        const body = new ReadableStream<Uint8Array>({
          pull(controller) {
            if (read >= chunks.length) { controller.close(); return; }
            // First chunk lands at firstSec, last at lastSec, rest spread evenly.
            const at = chunks.length === 1
              ? firstSec
              : firstSec + ((lastSec - firstSec) * read) / (chunks.length - 1);
            clock = at * 1000;
            controller.enqueue(encoder.encode(chunks[read]!));
            read++;
          },
        }, new CountQueuingStrategy({ highWaterMark: 0 }));
        return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
      }
      clock += elapsed * 1000;
      const body = {
        data: { is_free_tier: spec.isFreeTier ?? false },
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        content: [{ type: 'text', text: 'ok' }],
        choices: [{ message: { content: 'ok' } }],
        usageMetadata: { promptTokenCount: inTok, candidatesTokenCount: outTok },
        usage: {
          input_tokens: inTok, output_tokens: outTok,
          prompt_tokens: inTok, completion_tokens: outTok,
        },
        error: status >= 400
          ? { message: 'stub rejected the key', code: spec.code, type: spec.code }
          : undefined,
      };
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (spec.serviceTier) headers['x-gemini-service-tier'] = spec.serviceTier;
      return new Response(JSON.stringify(body), { status, headers });
    },
  };
  return api;
}

Given(
  'a stub provider API that accepts the key',
  function (this: ModelConfigWorld) {
    ctx(this).stub = stubApi({});
  },
);

Given(
  'a stub provider API that accepts the key and returns service tier {string}',
  function (this: ModelConfigWorld, serviceTier: string) {
    ctx(this).stub = stubApi({ serviceTier });
  },
);

Given(
  'a stub provider API that accepts the key and reports is_free_tier {word}',
  function (this: ModelConfigWorld, free: string) {
    ctx(this).stub = stubApi({ isFreeTier: free === 'true' });
  },
);

Given(
  'a stub provider API that rejects the key with HTTP {int}',
  function (this: ModelConfigWorld, status: number) {
    ctx(this).stub = stubApi({ status });
  },
);

Given(
  'a stub provider API that rejects the key with HTTP {int} and code {string}',
  function (this: ModelConfigWorld, status: number, code: string) {
    ctx(this).stub = stubApi({ status, code });
  },
);

Given('a stub provider API that cannot be reached', function (this: ModelConfigWorld) {
  ctx(this).stub = stubApi({ unreachable: true });
});

Given(
  'a stub provider API that answers with {int} input and {int} output tokens in {float} seconds',
  function (this: ModelConfigWorld, inTok: number, outTok: number, elapsed: number) {
    ctx(this).stub = stubApi({ inTok, outTok, elapsed });
  },
);

Given(
  'a stub provider API that streams {int} output tokens, first chunk at {float}s, last at {float}s',
  function (this: ModelConfigWorld, outTok: number, firstSec: number, lastSec: number) {
    ctx(this).stub = stubApi({ stream: { frames: 20, firstSec, lastSec, outTok } });
  },
);

Given(
  'a stub provider API that streams {int} output tokens in {int} frames from {float}s to {float}s, the first {int} carrying no text',
  function (
    this: ModelConfigWorld,
    outTok: number, frames: number, firstSec: number, lastSec: number, silent: number,
  ) {
    ctx(this).stub = stubApi({ stream: { frames, firstSec, lastSec, outTok, silent } });
  },
);

Given(
  'a stub provider API that buffers {int} output tokens into one chunk at {float}s',
  function (this: ModelConfigWorld, outTok: number, at: number) {
    ctx(this).stub = stubApi({ stream: { frames: 1, firstSec: at, lastSec: at, outTok } });
  },
);

When(
  'verifyKey is called for provider {string} with key {string}',
  async function (this: ModelConfigWorld, provider: string, key: string) {
    const c = ctx(this);
    const stub = c.stub!;
    try {
      c.tier = (await verifyKey(provider as Provider, key, { fetch: stub.fetch })).tier;
    } catch (e) {
      c.probeError = (e as Error).message;
    }
  },
);

Then('the verified tier is {string}', function (this: ModelConfigWorld, expected: string) {
  const c = ctx(this);
  assert.equal(c.probeError, undefined, `verifyKey threw: ${c.probeError}`);
  assert.equal(c.tier, expected);
});

Then('the verified tier is unknown', function (this: ModelConfigWorld) {
  const c = ctx(this);
  assert.equal(c.probeError, undefined, `verifyKey threw: ${c.probeError}`);
  assert.equal(c.tier, null);
});

Then('verifyKey fails with {string}', function (this: ModelConfigWorld, expected: string) {
  assert.equal(ctx(this).probeError, expected);
});

Then(
  'the stub provider API received {int} call(s)',
  function (this: ModelConfigWorld, expected: number) {
    assert.equal(ctx(this).stub?.calls, expected);
  },
);

When(
  'measureModel is called for provider {string} with model {string}',
  async function (this: ModelConfigWorld, provider: string, modelId: string) {
    const c = ctx(this);
    const stub = c.stub!;
    try {
      c.measured = await measureModel(provider as Provider, 'key', modelId, {
        fetch: stub.fetch,
        now: stub.now,
      });
    } catch (e) {
      c.probeError = (e as Error).message;
    }
  },
);

function measured(world: ModelConfigWorld): ModelMeasure {
  const c = ctx(world);
  assert.equal(c.probeError, undefined, `measureModel threw: ${c.probeError}`);
  assert.ok(c.measured, 'measureModel was not called');
  return c.measured;
}

Then(
  'the measured first-token time is {float} seconds',
  function (this: ModelConfigWorld, expected: number) {
    assert.equal(measured(this).ttftSec.toFixed(2), expected.toFixed(2));
  },
);

Then(
  'the measured rate is {float} tokens per second',
  function (this: ModelConfigWorld, expected: number) {
    assert.equal(measured(this).tokPerSec.toFixed(1), expected.toFixed(1));
  },
);

Then(
  'the estimated seconds for {int} tokens is {float}',
  function (this: ModelConfigWorld, _per: number, expected: number) {
    assert.equal(estimateSecPer1kTok(measured(this)).toFixed(1), expected.toFixed(1));
  },
);

Then('measureModel fails with {string}', function (this: ModelConfigWorld, expected: string) {
  assert.equal(ctx(this).probeError, expected);
});

// ── providerFor steps ────────────────────────────────────────────────────────

When(
  'providerFor is called with {string}',
  function (this: ModelConfigWorld, modelId: string) {
    ctx(this).providerResult = providerFor(modelId);
  },
);

// ── acceptsTemperature steps ─────────────────────────────────────────────────

When(
  'acceptsTemperature is called with {string}',
  function (this: ModelConfigWorld, modelId: string) {
    ctx(this).boolResult = acceptsTemperature(modelId);
  },
);

Then(
  'the boolean result is {word}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).boolResult, expected === 'true');
  },
);

// ── defaultModel steps ────────────────────────────────────────────────────────

When(
  'defaultModel is called with {string}',
  function (this: ModelConfigWorld, provider: string) {
    ctx(this).modelResult = defaultModel(provider as Provider);
  },
);

When(
  'defaultCellModel is called with {string}',
  function (this: ModelConfigWorld, provider: string) {
    ctx(this).modelResult = defaultCellModel(provider as Provider);
  },
);

When(
  'defaultBatchSize is called with {string}',
  function (this: ModelConfigWorld, provider: string) {
    ctx(this).numberResult = defaultBatchSize(provider as Provider);
    ctx(this).numberResultSet = true;
  },
);

When(
  'defaultBatchSize is called with {string} and paid true',
  function (this: ModelConfigWorld, provider: string) {
    ctx(this).numberResult = defaultBatchSize(provider as Provider, true);
    ctx(this).numberResultSet = true;
  },
);

Then(
  'supportsVoiceInput for {string} {string} is {word}',
  function (this: ModelConfigWorld, provider: string, model: string, expected: string) {
    assert.equal(supportsVoiceInput(provider as Provider, model), expected === 'true');
  },
);

Then(
  'hasPaidModelSet is {word} for {string}',
  function (this: ModelConfigWorld, expected: string, provider: string) {
    assert.equal(hasPaidModelSet(provider as Provider), expected === 'true');
  },
);

When(
  'resolveConfig is called with empty env and stored provider {string} and openrouterKey {string}',
  function (this: ModelConfigWorld, provider: string, key: string) {
    ctx(this).resolved = resolveConfig({}, { provider: provider as Provider, openrouterKey: key });
  },
);

When(
  'resolveConfig is called with stored provider {string} and openrouterPaid true',
  function (this: ModelConfigWorld, provider: string) {
    ctx(this).resolved = resolveConfig({}, { provider: provider as Provider, openrouterPaid: true });
  },
);

Then(
  'the resolved openrouterPaid is {word}',
  function (this: ModelConfigWorld, expected: string) {
    assert.equal(ctx(this).resolved?.openrouterPaid, expected === 'true');
  },
);

Then(
  'the numeric result is {int}',
  function (this: ModelConfigWorld, expected: number) {
    assert.ok(ctx(this).numberResultSet, 'no numeric call was made');
    assert.equal(ctx(this).numberResult, expected);
  },
);

Then(
  'the numeric result is undefined',
  function (this: ModelConfigWorld) {
    assert.ok(ctx(this).numberResultSet, 'no numeric call was made');
    assert.equal(ctx(this).numberResult, undefined);
  },
);

Then(
  'the result is {string}',
  function (this: ModelConfigWorld, expected: string) {
    const c = ctx(this);
    if (c.providerResult !== undefined) {
      assert.equal(c.providerResult, expected);
    } else {
      assert.equal(c.modelResult, expected);
    }
  },
);

// ── ALL_MODELS steps ─────────────────────────────────────────────────────────

Then(
  'ALL_MODELS contains at least one model with provider {string}',
  function (this: ModelConfigWorld, provider: string) {
    const found = ALL_MODELS.some((m) => m.provider === provider);
    assert.ok(found, `No model with provider "${provider}" in ALL_MODELS`);
  },
);

Then(
  'every ALL_MODELS entry has a voiceInput boolean field',
  function (this: ModelConfigWorld) {
    for (const m of ALL_MODELS) {
      assert.equal(typeof m.voiceInput, 'boolean', `Model "${m.id}" is missing voiceInput boolean`);
    }
  },
);

Then(
  'the model {string} has voiceInput true',
  function (this: ModelConfigWorld, modelId: string) {
    const m = ALL_MODELS.find((m) => m.id === modelId);
    assert.ok(m, `Model "${modelId}" not found in ALL_MODELS`);
    assert.equal(m.voiceInput, true, `Expected model "${modelId}" to have voiceInput=true`);
  },
);

Then(
  'the model {string} has voiceInput false',
  function (this: ModelConfigWorld, modelId: string) {
    const m = ALL_MODELS.find((m) => m.id === modelId);
    assert.ok(m, `Model "${modelId}" not found in ALL_MODELS`);
    assert.equal(m.voiceInput, false, `Expected model "${modelId}" to have voiceInput=false`);
  },
);

Then(
  'ALL_MODELS contains the model {string}',
  function (this: ModelConfigWorld, modelId: string) {
    assert.ok(ALL_MODELS.some((m) => m.id === modelId), `Model "${modelId}" not found in ALL_MODELS`);
  },
);

Then(
  'ALL_MODELS does not contain the model {string}',
  function (this: ModelConfigWorld, modelId: string) {
    assert.ok(!ALL_MODELS.some((m) => m.id === modelId), `Model "${modelId}" unexpectedly in ALL_MODELS`);
  },
);

Then(
  'every ALL_MODELS entry has inUsdPerMtok and outUsdPerMtok prices',
  function (this: ModelConfigWorld) {
    for (const m of ALL_MODELS) {
      assert.equal(typeof m.inUsdPerMtok, 'number', `Model "${m.id}" is missing inUsdPerMtok`);
      assert.equal(typeof m.outUsdPerMtok, 'number', `Model "${m.id}" is missing outUsdPerMtok`);
    }
  },
);

Then(
  'the model {string} costs {float} in and {float} out per Mtok',
  function (this: ModelConfigWorld, modelId: string, inPrice: number, outPrice: number) {
    const m = ALL_MODELS.find((m) => m.id === modelId);
    assert.ok(m, `Model "${modelId}" not found in ALL_MODELS`);
    assert.equal(m.inUsdPerMtok, inPrice);
    assert.equal(m.outUsdPerMtok, outPrice);
  },
);

// ── DEFAULTS steps ───────────────────────────────────────────────────────────

Then(
  'DEFAULTS names the {word} primary {string} and secondary {string}',
  function (this: ModelConfigWorld, provider: string, primary: string, secondary: string) {
    const d = DEFAULTS[provider as Provider];
    assert.ok(d, `No DEFAULTS entry for provider "${provider}"`);
    assert.equal(d.primary, primary);
    assert.equal(d.secondary, secondary);
  },
);

// ── storage.ts steps ─────────────────────────────────────────────────────────
// storage.ts reads localStorage via globalThis, so a scenario installs a fake
// there (or removes the real one) and the After hook restores whatever the
// runtime had.

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function fakeStorage(seed: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); },
    removeItem: (k) => { data.delete(k); },
  };
}

const g = globalThis as { localStorage?: StorageLike };
let savedLocalStorage: StorageLike | undefined;
let localStoragePatched = false;

function patchLocalStorage(value: StorageLike | undefined): void {
  if (!localStoragePatched) {
    savedLocalStorage = g.localStorage;
    localStoragePatched = true;
  }
  if (value === undefined) delete g.localStorage;
  else g.localStorage = value;
}

After(function () {
  if (!localStoragePatched) return;
  if (savedLocalStorage === undefined) delete g.localStorage;
  else g.localStorage = savedLocalStorage;
  localStoragePatched = false;
});

Given('a fake localStorage', function (this: ModelConfigWorld) {
  patchLocalStorage(fakeStorage());
});

Given(
  'a fake localStorage where {string} is {string}',
  function (this: ModelConfigWorld, key: string, value: string) {
    patchLocalStorage(fakeStorage({ [key]: value }));
  },
);

Given('no localStorage is available', function (this: ModelConfigWorld) {
  patchLocalStorage(undefined);
});

When(
  'writeStoredConfig is called with provider {string} and anthropicKey {string}',
  function (this: ModelConfigWorld, provider: string, anthropicKey: string) {
    writeStoredConfig({ provider: provider as Provider, anthropicKey });
  },
);

When('clearStoredConfig is called', function (this: ModelConfigWorld) {
  clearStoredConfig();
});

When('readStoredConfig is called', function (this: ModelConfigWorld) {
  readStoredConfig();
});

Then(
  'readStoredConfig returns provider {string} and anthropicKey {string}',
  function (this: ModelConfigWorld, provider: string, anthropicKey: string) {
    const c = readStoredConfig();
    assert.equal(c.provider, provider);
    assert.equal(c.anthropicKey, anthropicKey);
  },
);

Then(
  'readStoredConfig returns anthropicKey {string}',
  function (this: ModelConfigWorld, anthropicKey: string) {
    assert.equal(readStoredConfig().anthropicKey, anthropicKey);
  },
);

Then('readStoredConfig returns an empty config', function (this: ModelConfigWorld) {
  assert.deepEqual(readStoredConfig(), {});
});

Then(
  'the fake localStorage holds a {string} blob',
  function (this: ModelConfigWorld, key: string) {
    assert.ok(g.localStorage?.getItem(key), `expected localStorage to hold "${key}"`);
  },
);

Then(
  'the fake localStorage has no {string} blob/entry',
  function (this: ModelConfigWorld, key: string) {
    assert.equal(g.localStorage?.getItem(key), null, `expected localStorage to have no "${key}"`);
  },
);

Then('writeStoredConfig and clearStoredConfig do not throw', function (this: ModelConfigWorld) {
  writeStoredConfig({ provider: 'anthropic', anthropicKey: 'sk-noop' });
  clearStoredConfig();
});

When(
  'writeStoredConfig is called with provider {string} and geminiKey {string}',
  function (this: ModelConfigWorld, provider: string, geminiKey: string) {
    writeStoredConfig({ provider: provider as Provider, geminiKey });
  },
);

Then(
  'readStoredConfig returns provider {string} and geminiKey {string}',
  function (this: ModelConfigWorld, provider: string, geminiKey: string) {
    const c = readStoredConfig();
    assert.equal(c.provider, provider);
    assert.equal(c.geminiKey, geminiKey);
  },
);

// ── probe-storage steps ──────────────────────────────────────────────────────
// Measurements are a display cache, so they live in their own blob and never
// disturb the config the engine is built from.

/** One provider's stored entry: a tier, a connected time, and a reading per
 *  role taken from `model` at `at`. */
function storeProbe(provider: Provider, model: string, at: number): void {
  writeStoredProbes({
    [provider]: {
      tier: 'paid',
      connectedAt: at,
      primary: { ttftSec: 0.4, tokPerSec: 150, model, at },
      secondary: { ttftSec: 0.2, tokPerSec: 400, model, at },
    },
  });
}

When(
  'writeStoredProbes is called for provider {string}',
  function (this: ModelConfigWorld, provider: string) {
    const p = provider as Provider;
    storeProbe(p, defaultModel(p), Date.now());
  },
);

When(
  'writeStoredProbes is called for provider {string} measured from {string} {int} day(s) ago',
  function (this: ModelConfigWorld, provider: string, model: string, days: number) {
    storeProbe(provider as Provider, model, Date.now() - days * DAY_MS);
  },
);

When('clearStoredProbes is called', function (this: ModelConfigWorld) {
  clearStoredProbes();
});

Then(
  'readStoredProbes returns a measurement for {string}',
  function (this: ModelConfigWorld, provider: string) {
    assert.ok(readStoredProbes()[provider as Provider], `no stored measurement for "${provider}"`);
  },
);

Then('readStoredProbes returns nothing', function (this: ModelConfigWorld) {
  assert.deepEqual(readStoredProbes(), {});
});

Then(
  'readStoredProbes returns a primary reading for {string}',
  function (this: ModelConfigWorld, provider: string) {
    assert.ok(
      readStoredProbes()[provider as Provider]?.primary,
      `expected a primary reading for "${provider}"`,
    );
  },
);

Then(
  'readStoredProbes returns no primary reading for {string}',
  function (this: ModelConfigWorld, provider: string) {
    assert.equal(readStoredProbes()[provider as Provider]?.primary, undefined);
  },
);

Then(
  'readStoredProbes reports tier {string} and a connected time for {string}',
  function (this: ModelConfigWorld, tier: string, provider: string) {
    const probe = readStoredProbes()[provider as Provider];
    assert.equal(probe?.tier, tier);
    assert.equal(typeof probe?.connectedAt, 'number');
  },
);
