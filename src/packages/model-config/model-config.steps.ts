// #ModelConfig
import { When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import {
  resolveConfig,
  defaultModel,
  defaultCellModel,
  providerFor,
  ALL_MODELS,
  type ResolvedConfig,
  type Provider,
} from '@tamedtable/model-config';

interface ModelConfigCtx {
  resolved?: ResolvedConfig;
  providerResult?: Provider;
  modelResult?: string;
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

// Non-null check on a named resolved key field (geminiKey / openaiKey / …),
// used by the precedence outline where the winning key varies per row.
Then(
  'the resolved {word} is set',
  function (this: ModelConfigWorld, field: string) {
    const resolved = ctx(this).resolved as Record<string, unknown> | undefined;
    assert.ok(resolved && resolved[field] != null, `expected resolved ${field} to be set`);
  },
);

// ── providerFor steps ────────────────────────────────────────────────────────

When(
  'providerFor is called with {string}',
  function (this: ModelConfigWorld, modelId: string) {
    ctx(this).providerResult = providerFor(modelId);
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
