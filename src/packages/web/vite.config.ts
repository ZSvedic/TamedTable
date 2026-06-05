import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The engine (@tamedtable/headless) is authored for Bun/Node. It is reused
// here unmodified; Vite bridges the gap to the browser by aliasing the few
// Node-only modules it touches to in-package shims, and by inlining the
// system-prompt file the engine otherwise reads from disk at module init.
const here = dirname(fileURLToPath(import.meta.url));
const promptText = readFileSync(join(here, '../../../spec/prompt-app-edit.md'), 'utf8');
const shim = (file: string): string => join(here, 'src/shims', file);

// Tutorial: inline all @tutorial-tagged feature files plus their fixtures so
// the browser can build TutorialSources without a network fetch or API key.
const tutorialFeatureNames = ['filter.feature', 'aggregate.feature', 'join.feature'];
const tutorialInputNames   = ['filter-input.csv', 'datanorm-input.csv', 'join-country-codes.csv'];
const tutorialGoldenNames  = ['filter-expected.jsonl', 'aggregate-by-country-expected.jsonl'];

function readTc(name: string): string {
  return readFileSync(join(here, '../../../spec/test-cases', name), 'utf8');
}

const tutorialBundle = {
  features: Object.fromEntries(tutorialFeatureNames.map((n) => [n, readTc(n)])),
  inputs:   Object.fromEntries(tutorialInputNames.map((n) => [n, readTc(n)])),
  goldens:  Object.fromEntries(tutorialGoldenNames.map((n) => [n, readTc(n)])),
};

// Sample CSV/JSONL files surfaced as quick-picks in the Open URL dialog.
// We bundle them into the deployed site (under /samples/) rather than
// linking to raw.githubusercontent.com — same-origin fetch sidesteps any
// CORS quirks on GitHub Pages and keeps the demo working offline in dev.
const samplesDir = join(here, '../../../spec/test-cases');
const sampleFiles = readdirSync(samplesDir)
  .filter((name) => name.endsWith('.csv') || name.endsWith('.jsonl'))
  .sort();

function samplesPlugin(): Plugin {
  return {
    name: 'tamedtable-samples',
    configureServer(server) {
      // Dev: serve the sample files straight from spec/test-cases/ — no
      // pre-copy step needed when iterating locally. The base prefix
      // (e.g. /TamedTable/) is part of the incoming URL because this
      // middleware runs ahead of Vite's base rewriting.
      const base = server.config.base.replace(/\/$/, '');
      const re = new RegExp(`^${base}/samples/([^?#]+)`);
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '';
        const match = url.match(re);
        if (!match || !match[1]) return next();
        const name = match[1];
        if (!sampleFiles.includes(name)) return next();
        const path = join(samplesDir, name);
        try {
          const stat = statSync(path);
          if (!stat.isFile()) return next();
        } catch {
          return next();
        }
        // Hand the file to Vite's static handler by rewriting the URL onto
        // a path it knows how to serve. Simpler: read + send directly.
        const _res2 = _res as unknown as {
          setHeader: (k: string, v: string) => void;
          end: (data: Buffer | string) => void;
        };
        const data = readFileSync(path);
        _res2.setHeader(
          'Content-Type',
          name.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'application/x-ndjson; charset=utf-8',
        );
        _res2.end(data);
      });
    },
    closeBundle() {
      // Build: copy the sample files into the output's samples/ folder.
      // Vite's default outDir is dist/ relative to the package; we anchor
      // off `here` so the path resolves the same regardless of cwd.
      const outDir = join(here, 'dist', 'samples');
      mkdirSync(outDir, { recursive: true });
      for (const name of sampleFiles) {
        copyFileSync(join(samplesDir, name), join(outDir, name));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), samplesPlugin()],
  base: '/TamedTable/',
  define: {
    // The system-prompt file the engine reads at module init, inlined. The
    // engine's `process` references are satisfied by a stub in index.html.
    __TT_PROMPT__: JSON.stringify(promptText),
    // The list of bundled sample files (filenames only) the Open URL dialog
    // shows as quick-picks. Frozen at build time.
    __TT_SAMPLE_FILES__: JSON.stringify(sampleFiles),
    __TT_TUTORIAL__: JSON.stringify(tutorialBundle),
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
