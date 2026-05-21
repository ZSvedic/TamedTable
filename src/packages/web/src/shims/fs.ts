// Browser shim for `node:fs` (sync surface). The engine's only synchronous
// read is the system-prompt file at module init; Vite inlines its content
// into `__TT_PROMPT__` (see vite.config.ts).

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

export default { readFileSync, existsSync };
