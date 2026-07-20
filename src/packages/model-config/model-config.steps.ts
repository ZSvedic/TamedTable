// #ModelConfig
import { After, Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import {
  resolveConfig,
  defaultModel,
  defaultCellModel,
  defaultBatchSize,
  providerFor,
  acceptsTemperature,
  keyFor,
  ALL_MODELS,
  DEFAULTS,
  type ResolvedConfig,
  type Provider,
  type EngineProvider,
} from '@tamedtable/model-config';
import { readStoredConfig, writeStoredConfig, clearStoredConfig } from './storage.ts';

interface ModelConfigCtx {
  resolved?: ResolvedConfig;
  providerResult?: EngineProvider;
  modelResult?: string;
  keyResult?: string | null;
  boolResult?: boolean;
  numberResult?: number | undefined;
  numberResultSet?: boolean;
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
Given(
  'a resolved config for provider {string} with keys anthropic {string}, gemini {string}, openai {string}',
  function (this: ModelConfigWorld, provider: string, anthropic: string, gemini: string, openai: string) {
    ctx(this).resolved = {
      provider: provider as Provider,
      anthropicKey: anthropic || null,
      geminiKey: gemini || null,
      openaiKey: openai || null,
      openrouterKey: null,
      model: defaultModel(provider as Provider),
      cellModel: defaultCellModel(provider as Provider),
      alwaysRunAll: false,
    };
  },
);

Given(
  'a resolved config for provider {string} with openrouterKey {string}',
  function (this: ModelConfigWorld, provider: string, openrouterKey: string) {
    ctx(this).resolved = {
      provider: provider as Provider,
      anthropicKey: null,
      geminiKey: null,
      openaiKey: null,
      openrouterKey: openrouterKey || null,
      model: defaultModel(provider as Provider),
      cellModel: defaultCellModel(provider as Provider),
      alwaysRunAll: false,
    };
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
