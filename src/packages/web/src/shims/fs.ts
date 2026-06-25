// Browser shim for `node:fs` (sync) and `node:fs/promises` (async).
//
// The only real filesystem read in the browser is the system-prompt file at
// engine module init — `readFileSync`, which Vite inlines as `__TT_PROMPT__`
// (see vite.config.ts). Every other fs call belongs to core's path-based
// loaders (`loadCsv`/`writeRows`), which the web no longer uses: input parses
// through the file-io codec registry, output serializes through a codec, and
// joins read staged lookup rows. Those functions still ship in the bundle
// (core is shared) but are never invoked here, so the async surface is
// throwing stubs rather than an in-memory store.

declare const __TT_PROMPT__: string;

export function readFileSync(path: string | URL): string {
  if (typeof path === 'string' && path.includes('prompt-app-edit.md')) {
    return __TT_PROMPT__;
  }
  throw new Error(`fs shim: readFileSync is unsupported for ${String(path)}`);
}

export function existsSync(): boolean {
  return false;
}

const unsupported = (name: string): never => {
  throw new Error(`fs shim: ${name} is unsupported in the browser`);
};

// node:fs/promises surface — present only so core's path loaders resolve in the
// bundle; the web never calls them.
export function readFile(): Promise<string> {
  return unsupported('readFile');
}
export function writeFile(): Promise<void> {
  return unsupported('writeFile');
}
export function mkdir(): Promise<void> {
  return unsupported('mkdir');
}

export default { readFileSync, existsSync, readFile, writeFile, mkdir };
