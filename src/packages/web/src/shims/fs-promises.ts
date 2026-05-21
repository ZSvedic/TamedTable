// Browser shim for `node:fs/promises`. The engine reads input and writes
// exports by path; in the browser those paths address a per-session
// in-memory store. The web shell writes a picked file's text here before
// calling Runner.loadInput, and reads an export back after Runner.exportAs.

const store = new Map<string, string>();

export async function mkdir(_path: string, _opts?: unknown): Promise<void> {
  // No directory tree to create in the in-memory store.
}

export async function writeFile(path: string | URL, data: string | Uint8Array): Promise<void> {
  store.set(String(path), typeof data === 'string' ? data : new TextDecoder().decode(data));
}

export async function readFile(path: string | URL, _encoding?: unknown): Promise<string> {
  const value = store.get(String(path));
  if (value === undefined) {
    throw new Error(`fs shim: no such file: ${String(path)}`);
  }
  return value;
}

export default { mkdir, writeFile, readFile };
