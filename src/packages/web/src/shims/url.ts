// Browser shim for `node:url`. The engine calls `fileURLToPath(import.meta.url)`
// once, to locate the system-prompt file on disk; in the browser that file is
// inlined by Vite, so the returned path only has to be something the fs shim
// recognizes as the prompt path.

export function fileURLToPath(_url: string | URL): string {
  return '/tamedtable/packages/headless/index.ts';
}

export default { fileURLToPath };
