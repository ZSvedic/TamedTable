import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseTours } from '@tamedtable/gherkin-tour';

// The engine (@tamedtable/headless) is authored for Bun/Node. It is reused
// here unmodified; Vite bridges the gap to the browser by aliasing the few
// Node-only modules it touches to in-package shims, and by inlining the
// system-prompt file the engine otherwise reads from disk at module init.
const here = dirname(fileURLToPath(import.meta.url));
const promptText = readFileSync(join(here, '../../../spec/prompt-app-edit.md'), 'utf8');
const shim = (file: string): string => join(here, 'src/shims', file);

const specTcDir = join(here, '../../../spec/test-cases');
const cassetteDir = join(here, '../../tests/__cassettes__');

// Tutorial: the @tutorial/@web feature files. We ship only a lightweight
// MANIFEST (scenario name + tags + source file) in the JS bundle; the heavy
// assets — feature source, input/golden fixtures, and recorded cassettes —
// load lazily, fetched same-origin from /tutorials/, /samples/, and
// /cassettes/. That keeps page load small and lets a key-free visitor play a
// full tour by replaying the tour's cassette.
const tutorialFeatureNames = [
  'filter.feature', 'aggregate.feature', 'join.feature',
  'colsplit.feature', 'dedupe.feature', 'pivot.feature', 'validate.feature',
  'voice.feature',
];

const tutorialManifest = tutorialFeatureNames.flatMap((feature) => {
  const src = readFileSync(join(specTcDir, feature), 'utf8');
  return parseTours(src)
    .filter((t) => t.tags.includes('@web'))
    .map((t) => ({ name: t.name, feature, tags: t.tags }));
});

// Static assets served same-origin: the sample CSV/JSONL files (also the
// tutorial inputs + goldens), the tutorial feature files, and the recorded
// cassettes. Each is copied into dist/ at build and served from its source dir
// by a dev middleware — same pattern, three directories.
const sampleFiles = readdirSync(specTcDir)
  .filter((name) => name.endsWith('.csv') || name.endsWith('.jsonl'))
  .sort();
// Voice clips for `play-audio` tour steps — served from /samples/ alongside the
// CSV/JSONL fixtures, but kept out of __TT_SAMPLE_FILES__ (the Open URL dialog's
// quick-picks are data files only).
const audioFiles = readdirSync(specTcDir).filter((name) => name.endsWith('.m4a')).sort();
const cassetteFiles = readdirSync(cassetteDir).filter((name) => name.endsWith('.json')).sort();

function contentTypeFor(name: string): string {
  if (name.endsWith('.csv')) return 'text/csv; charset=utf-8';
  if (name.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (name.endsWith('.json')) return 'application/json; charset=utf-8';
  if (name.endsWith('.m4a')) return 'audio/mp4';
  return 'text/plain; charset=utf-8';  // .feature
}

/** Serve `files` from `srcDir` under `/<route>/…` — dev middleware + a build
 *  copy into dist/<route>/. The base prefix (e.g. /TamedTable/) is part of the
 *  incoming dev URL because this middleware runs ahead of Vite's base rewrite. */
function staticDirPlugin(route: string, srcDir: string, files: string[]): Plugin {
  return {
    name: `tamedtable-${route}`,
    configureServer(server) {
      const base = server.config.base.replace(/\/$/, '');
      const re = new RegExp(`^${base}/${route}/([^?#]+)`);
      server.middlewares.use((req, _res, next) => {
        const match = (req.url ?? '').match(re);
        const name = match?.[1];
        if (!name || !files.includes(name)) return next();
        const path = join(srcDir, name);
        try {
          if (!statSync(path).isFile()) return next();
        } catch {
          return next();
        }
        const res = _res as unknown as {
          setHeader: (k: string, v: string) => void;
          end: (data: Buffer | string) => void;
        };
        res.setHeader('Content-Type', contentTypeFor(name));
        res.end(readFileSync(path));
      });
    },
    closeBundle() {
      const outDir = join(here, 'dist', route);
      mkdirSync(outDir, { recursive: true });
      for (const name of files) copyFileSync(join(srcDir, name), join(outDir, name));
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    staticDirPlugin('samples', specTcDir, [...sampleFiles, ...audioFiles]),
    staticDirPlugin('tutorials', specTcDir, tutorialFeatureNames),
    staticDirPlugin('cassettes', cassetteDir, cassetteFiles),
  ],
  // The web app is published under /app/; the site root serves the marketing
  // homepage (marketing/web/), assembled by .github/scripts/build-site.sh.
  // The deploy/preview workflows override the prefix via TAMEDTABLE_WEB_BASE so
  // a PR preview at /TamedTable/pr-preview/pr-<N>/ bakes matching asset URLs.
  base: process.env.TAMEDTABLE_WEB_BASE ?? '/TamedTable/app/',
  define: {
    // The system-prompt file the engine reads at module init, inlined. The
    // engine's `process` references are satisfied by a stub in index.html.
    __TT_PROMPT__: JSON.stringify(promptText),
    // The list of bundled sample files (filenames only) the Open URL dialog
    // shows as quick-picks. Frozen at build time.
    __TT_SAMPLE_FILES__: JSON.stringify(sampleFiles),
    // Lightweight tutorial scenario index — names + tags + source file. The
    // feature source, fixtures, goldens, and cassettes load lazily.
    __TT_TUTORIAL_MANIFEST__: JSON.stringify(tutorialManifest),
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
