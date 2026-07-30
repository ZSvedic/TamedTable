// #ModelConfig — config-resolution regressions from the 2026-07-29 hunt
// (RED-MC-1, -2 and -4, fixed and moved green; RED-MC-3 lives in
// src/tests/demo-config.smoke.test.ts). Each assertion states the
// spec-correct behavior; the messages keep the original finding ids.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import {
  defaultCellModel,
  defaultModel,
  resolveConfig,
  type ResolvedConfig,
} from './index.ts';

test("RED-MC-1: TAMEDTABLE_MODEL='' (empty env var) means unset and falls through to the default", () => {
  // A `.env` line left as `TAMEDTABLE_MODEL=` reaches resolveConfig as ''.
  // The four *_API_KEY vars in the same function treat '' as missing
  // (truthiness, index.ts:162-173); the two model vars use `??`
  // (index.ts:179/:189), so '' counts as a real override and the engine is
  // handed model "".
  const cfg = resolveConfig({ ANTHROPIC_API_KEY: 'sk-ant', TAMEDTABLE_MODEL: '' }, {});
  assert.equal(
    cfg.model,
    defaultModel('anthropic'),
    "RED-MC-1 (spec/code-contract.md:332; spec/packages/model-config/behavior.md:111,113): TAMEDTABLE_MODEL='' is an unset variable and must fall through to stored/default like the *_API_KEY vars do — resolveConfig kept the empty string as the resolved model (index.ts:179 uses ?? where the key vars use truthiness)",
  );

  const cell = resolveConfig({ ANTHROPIC_API_KEY: 'sk-ant', TAMEDTABLE_CELL_MODEL: '' }, {});
  assert.equal(
    cell.cellModel,
    defaultCellModel('anthropic'),
    "RED-MC-1 (spec/code-contract.md:333; spec/packages/model-config/behavior.md:115): TAMEDTABLE_CELL_MODEL='' must mean unset and fall through to defaultCellModel(provider) — resolveConfig kept the empty string as cellModel (index.ts:189)",
  );
});

test('RED-MC-2: a stored config with an unknown provider falls back to gemini instead of throwing', async () => {
  // The blob is written by whatever build last ran on the origin (production
  // and pr-preview share one origin and one 'tamedtable.config' blob). A
  // provider value the current build doesn't know must resolve, not throw —
  // behavior.md rules 1-10 define a total function with no error path.
  // 'cerebras' is a real EngineProvider that is never a valid app provider.
  const stored = { provider: 'cerebras' } as unknown as Partial<ResolvedConfig>;
  let resolved: ResolvedConfig | undefined;
  try {
    resolved = resolveConfig({}, stored);
  } catch (e) {
    assert.fail(
      `RED-MC-2 (spec/packages/model-config/behavior.md:108-110 rule 5, :186-187 storage robustness): resolveConfig must fall back to "gemini" for an unknown stored.provider, never throw — it threw ${String(e)} (index.ts:175 accepts stored.provider unvalidated; index.ts:79 non-null assertion on a catalogue miss)`,
    );
  }
  assert.equal(
    resolved?.provider,
    'gemini',
    'RED-MC-2 (spec/packages/model-config/behavior.md:108-110 rule 5): an unknown stored provider must resolve to the "gemini" fallback',
  );

  // Same defect through the real boot path: createWebController with the
  // unknown provider persisted in a shimmed localStorage. main.tsx calls
  // createWebController at module scope, so this throw is a white screen
  // recoverable only by clearing site data. The import specifier is built at
  // runtime on purpose: packages/web is excluded from the root tsc project
  // (DOM lib), and a literal import here would drag it in.
  const map = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
  };
  try {
    map.set('tamedtable.config', JSON.stringify({ provider: 'cerebras', anthropicKey: 'sk-x' }));
    const controllerPath = ['..', 'web', 'src', 'controller.ts'].join('/');
    const { createWebController } = await import(controllerPath);
    let controller: { getConfig(): ResolvedConfig } | undefined;
    try {
      controller = createWebController({
        env: {},
        file: {
          hasFileSystemAccess: false,
          pickOpen: () => Promise.resolve(null),
          pickSave: () => Promise.resolve({ status: 'cancelled' }),
        },
      });
    } catch (e) {
      assert.fail(
        `RED-MC-2 (spec/packages/model-config/behavior.md:108-110 rule 5, :186-187): createWebController must boot on a stored blob with an unknown provider (falling back to gemini) — it threw ${String(e)}, a white screen at module scope in web/src/main.tsx`,
      );
    }
    assert.equal(
      controller?.getConfig().provider,
      'gemini',
      'RED-MC-2 (spec/packages/model-config/behavior.md:108-110 rule 5): boot with an unknown stored provider must resolve to gemini',
    );
  } finally {
    delete (globalThis as Record<string, unknown>).localStorage;
  }
});

test('RED-MC-4: a model id belonging to no provider is coerced to the provider default', () => {
  // providerFor's catch-all returns 'anthropic' for any unknown id
  // (index.ts:96-107 — the doc comment says so, an intentional fallback), so
  // the same-provider guard at index.ts:182 waves catalogue-less garbage
  // through whenever the resolved provider is anthropic. behavior.md's
  // providerFor rules (:134-144) grant anthropic only ids starting with
  // 'claude-'; 'mistral-large-3' belongs to no provider, and rule 8 (:113)
  // says the final primary model must belong to the resolved provider or be
  // replaced with defaultModel(provider).
  const cfg = resolveConfig({ ANTHROPIC_API_KEY: 'sk-ant' }, { model: 'mistral-large-3' });
  assert.equal(
    cfg.model,
    defaultModel('anthropic'),
    "RED-MC-4 (spec/packages/model-config/behavior.md:113, :134-144): 'mistral-large-3' belongs to no provider and must be coerced to defaultModel('anthropic') — resolveConfig kept it, so every Anthropic API call would 404 with model-not-found",
  );
});
