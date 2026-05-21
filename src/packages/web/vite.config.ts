import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The engine (@tamedtable/headless) is authored for Bun/Node. It is reused
// here unmodified; Vite bridges the gap to the browser by aliasing the few
// Node-only modules it touches to in-package shims, and by inlining the
// system-prompt file the engine otherwise reads from disk at module init.
const here = dirname(fileURLToPath(import.meta.url));
const promptText = readFileSync(join(here, '../../../spec/prompt-app-edit.md'), 'utf8');
const shim = (file: string): string => join(here, 'src/shims', file);

export default defineConfig({
  plugins: [react()],
  define: {
    // The system-prompt file the engine reads at module init, inlined. The
    // engine's `process` references are satisfied by a stub in index.html.
    __TT_PROMPT__: JSON.stringify(promptText),
  },
  resolve: {
    alias: {
      // Order matters: 'node:fs/promises' must precede the 'node:fs' prefix.
      'node:fs/promises': shim('fs-promises.ts'),
      'node:fs': shim('fs.ts'),
      'node:path': shim('path.ts'),
      'node:url': shim('url.ts'),
      // DuckDB is a native addon — unavailable in a browser. {sql}
      // transformations are not part of the V4 web golden path.
      '@duckdb/node-api': shim('duckdb.ts'),
    },
  },
});
