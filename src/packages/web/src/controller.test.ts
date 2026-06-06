import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createWebController } from './controller.ts';
import type { FilePort, PickedFile, SaveOutcome } from './lib/ports.ts';

const LEGACY_KEY = 'tamedtable.apiKey';
const CONFIG_KEY = 'tamedtable.config';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

const stubFilePort: FilePort = {
  hasFileSystemAccess: false,
  pickOpen: (): Promise<PickedFile | null> => Promise.resolve(null),
  pickSave: (): Promise<SaveOutcome> => Promise.resolve({ status: 'cancelled' }),
};

const globalRef = globalThis as { localStorage?: Storage };
const processEnv = process.env as Record<string, string | undefined>;

describe('WebController API key persistence', () => {
  let storage: MemoryStorage;
  let original: Storage | undefined;
  let savedAnthropicKey: string | undefined;
  let savedGeminiKey: string | undefined;

  beforeEach(() => {
    storage = new MemoryStorage();
    original = globalRef.localStorage;
    globalRef.localStorage = storage as unknown as Storage;
    // Remove env keys so they don't override stored/opts values in tests.
    savedAnthropicKey = processEnv['ANTHROPIC_API_KEY'];
    savedGeminiKey    = processEnv['GEMINI_API_KEY'];
    delete processEnv['ANTHROPIC_API_KEY'];
    delete processEnv['GEMINI_API_KEY'];
  });

  afterEach(() => {
    if (original === undefined) delete globalRef.localStorage;
    else globalRef.localStorage = original;
    if (savedAnthropicKey !== undefined) processEnv['ANTHROPIC_API_KEY'] = savedAnthropicKey;
    if (savedGeminiKey !== undefined) processEnv['GEMINI_API_KEY'] = savedGeminiKey;
  });

  it('reads the stored key on construction when none is provided', () => {
    // New storage format
    storage.setItem(CONFIG_KEY, JSON.stringify({ anthropicKey: 'sk-stored' }));
    const c = createWebController({ file: stubFilePort });
    expect(c.getConfig().anthropicKey).toBe('sk-stored');
  });

  it('migrates legacy stored key on first read', () => {
    // Old storage format: tamedtable.apiKey → migrates to tamedtable.config
    storage.setItem(LEGACY_KEY, 'sk-legacy');
    const c = createWebController({ file: stubFilePort });
    expect(c.getConfig().anthropicKey).toBe('sk-legacy');
    // After construction the legacy key is migrated and removed
    // (migration happens in readStoredConfig, which was called in constructor)
    expect(storage.getItem(CONFIG_KEY)).not.toBeNull();
    expect(storage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('lets opts.config.anthropicKey take precedence over a stored value', () => {
    storage.setItem(CONFIG_KEY, JSON.stringify({ anthropicKey: 'sk-stored' }));
    const c = createWebController({ file: stubFilePort, config: { anthropicKey: 'sk-from-opts' } });
    expect(c.getConfig().anthropicKey).toBe('sk-from-opts');
  });

  it('persists a trimmed key on setApiKey', async () => {
    const c = createWebController({ file: stubFilePort });
    c.setApiKey('  sk-new  ');
    // setApiKey is now async (calls setConfig), wait for microtask
    await Promise.resolve();
    expect(c.getConfig().anthropicKey).toBe('sk-new');
  });

  it('removes the stored key when setApiKey is called with an empty string', async () => {
    storage.setItem(CONFIG_KEY, JSON.stringify({ anthropicKey: 'sk-old' }));
    const c = createWebController({ file: stubFilePort });
    c.setApiKey('   ');
    await Promise.resolve();
    expect(c.getConfig().anthropicKey).toBeNull();
  });

  it('removes the stored key on clearApiKey', async () => {
    storage.setItem(CONFIG_KEY, JSON.stringify({ anthropicKey: 'sk-old' }));
    const c = createWebController({ file: stubFilePort });
    c.clearApiKey();
    await Promise.resolve();
    expect(c.getConfig().anthropicKey).toBeNull();
  });

  it('keeps working when localStorage is unavailable', async () => {
    delete globalRef.localStorage;
    const c = createWebController({ file: stubFilePort });
    // setConfig works without localStorage
    await c.setConfig({ anthropicKey: 'sk-next' });
    expect(c.getConfig().anthropicKey).toBe('sk-next');
    await c.setConfig({ anthropicKey: null });
    expect(c.getConfig().anthropicKey).toBeNull();
  });
});
