import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createWebController } from './controller.ts';
import type { FilePort, PickedFile, SaveOutcome } from './lib/ports.ts';

const STORAGE_KEY = 'tamedtable.apiKey';

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

describe('WebController API key persistence', () => {
  let storage: MemoryStorage;
  let original: Storage | undefined;

  beforeEach(() => {
    storage = new MemoryStorage();
    original = globalRef.localStorage;
    globalRef.localStorage = storage as unknown as Storage;
  });

  afterEach(() => {
    if (original === undefined) delete globalRef.localStorage;
    else globalRef.localStorage = original;
  });

  it('reads the stored key on construction when none is provided', () => {
    storage.setItem(STORAGE_KEY, 'sk-stored');
    const c = createWebController({ file: stubFilePort });
    expect(c.getSettings().apiKey).toBe('sk-stored');
  });

  it('lets opts.apiKey take precedence over a stored value', () => {
    storage.setItem(STORAGE_KEY, 'sk-stored');
    const c = createWebController({ file: stubFilePort, apiKey: 'sk-from-opts' });
    expect(c.getSettings().apiKey).toBe('sk-from-opts');
  });

  it('persists a trimmed key on setApiKey', () => {
    const c = createWebController({ file: stubFilePort });
    c.setApiKey('  sk-new  ');
    expect(c.getSettings().apiKey).toBe('sk-new');
    expect(storage.getItem(STORAGE_KEY)).toBe('sk-new');
  });

  it('removes the stored key when setApiKey is called with an empty string', () => {
    storage.setItem(STORAGE_KEY, 'sk-old');
    const c = createWebController({ file: stubFilePort });
    c.setApiKey('   ');
    expect(c.getSettings().apiKey).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('removes the stored key on clearApiKey', () => {
    storage.setItem(STORAGE_KEY, 'sk-old');
    const c = createWebController({ file: stubFilePort });
    c.clearApiKey();
    expect(c.getSettings().apiKey).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps working when localStorage is unavailable', () => {
    delete globalRef.localStorage;
    const c = createWebController({ file: stubFilePort, apiKey: 'sk-injected' });
    expect(c.getSettings().apiKey).toBe('sk-injected');
    c.setApiKey('sk-next');
    expect(c.getSettings().apiKey).toBe('sk-next');
    c.clearApiKey();
    expect(c.getSettings().apiKey).toBeNull();
  });
});
