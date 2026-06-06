// #ModelConfig
import { When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import {
  resolveConfig,
  defaultModel,
  providerFor,
  ALL_MODELS,
  type ResolvedConfig,
  type Provider,
} from '@tamedtable/model-config';
import { TamedTableWorld } from './world.ts';

interface ModelConfigCtx {
  resolved?: ResolvedConfig;
  providerResult?: Provider;
  modelResult?: string;
}

function ctx(world: TamedTableWorld): ModelConfigCtx {
  const w = world as TamedTableWorld & { _mcCtx?: ModelConfigCtx };
  if (!w._mcCtx) w._mcCtx = {};
  return w._mcCtx;
}

// ── resolveConfig steps ───────────────────────────────────────────────────────

When(
  'resolveConfig is called with empty env and empty stored',
  function (this: TamedTableWorld) {
    ctx(this).resolved = resolveConfig({}, {});
  },
);

When(
  'resolveConfig is called with env ANTHROPIC_API_KEY={string}',
  function (this: TamedTableWorld, key: string) {
    ctx(this).resolved = resolveConfig({ ANTHROPIC_API_KEY: key }, {});
  },
);

When(
  'resolveConfig is called with env GEMINI_API_KEY={string}',
  function (this: TamedTableWorld, key: string) {
    ctx(this).resolved = resolveConfig({ GEMINI_API_KEY: key }, {});
  },
);

When(
  'resolveConfig is called with env ANTHROPIC_API_KEY={string} and GEMINI_API_KEY={string}',
  function (this: TamedTableWorld, anthropicKey: string, geminiKey: string) {
    ctx(this).resolved = resolveConfig(
      { ANTHROPIC_API_KEY: anthropicKey, GEMINI_API_KEY: geminiKey },
      {},
    );
  },
);

When(
  'resolveConfig is called with empty env and stored provider {string} and geminiKey {string}',
  function (this: TamedTableWorld, provider: string, geminiKey: string) {
    ctx(this).resolved = resolveConfig({}, {
      provider: provider as Provider,
      geminiKey,
    });
  },
);

When(
  'resolveConfig is called with env ANTHROPIC_API_KEY={string} and stored anthropicKey {string}',
  function (this: TamedTableWorld, envKey: string, storedKey: string) {
    ctx(this).resolved = resolveConfig(
      { ANTHROPIC_API_KEY: envKey },
      { anthropicKey: storedKey },
    );
  },
);

When(
  'resolveConfig is called with env TAMEDTABLE_MODEL={string} and stored model {string}',
  function (this: TamedTableWorld, envModel: string, storedModel: string) {
    ctx(this).resolved = resolveConfig(
      { TAMEDTABLE_MODEL: envModel },
      { model: storedModel },
    );
  },
);

Then(
  'the resolved provider is {string}',
  function (this: TamedTableWorld, expected: string) {
    assert.equal(ctx(this).resolved?.provider, expected);
  },
);

Then(
  'the resolved model is {string}',
  function (this: TamedTableWorld, expected: string) {
    assert.equal(ctx(this).resolved?.model, expected);
  },
);

Then(
  'the resolved anthropicKey is {string}',
  function (this: TamedTableWorld, expected: string) {
    assert.equal(ctx(this).resolved?.anthropicKey, expected);
  },
);

Then(
  'the resolved anthropicKey is null',
  function (this: TamedTableWorld) {
    assert.equal(ctx(this).resolved?.anthropicKey, null);
  },
);

Then(
  'the resolved geminiKey is {string}',
  function (this: TamedTableWorld, expected: string) {
    assert.equal(ctx(this).resolved?.geminiKey, expected);
  },
);

Then(
  'the resolved geminiKey is null',
  function (this: TamedTableWorld) {
    assert.equal(ctx(this).resolved?.geminiKey, null);
  },
);

// ── providerFor steps ────────────────────────────────────────────────────────

When(
  'providerFor is called with {string}',
  function (this: TamedTableWorld, modelId: string) {
    ctx(this).providerResult = providerFor(modelId);
  },
);

// ── defaultModel steps ────────────────────────────────────────────────────────

When(
  'defaultModel is called with {string}',
  function (this: TamedTableWorld, provider: string) {
    ctx(this).modelResult = defaultModel(provider as Provider);
  },
);

Then(
  'the result is {string}',
  function (this: TamedTableWorld, expected: string) {
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
  function (this: TamedTableWorld, provider: string) {
    const found = ALL_MODELS.some((m) => m.provider === provider);
    assert.ok(found, `No model with provider "${provider}" in ALL_MODELS`);
  },
);
