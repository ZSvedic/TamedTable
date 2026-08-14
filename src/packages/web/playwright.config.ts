import { defineConfig } from '@playwright/test';

// CI tests the PRODUCTION build, `bun run build` then `bun run preview`, not
// the dev server. Dev doesn't tree-shake or minify, which is exactly the class
// of bug that shipped in PR 259 (Vite's prod build tree-shook Zod's locale
// away and a tour died). Local runs default to the faster dev server; set
// PW_MODE=preview to reproduce CI locally. Preview reuses the dev port so the
// baseURL, and specs that build absolute sample URLs from it, never change.
const preview = !!process.env.CI || process.env.PW_MODE === 'preview';
const PORT = 5173;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
  },
  webServer: {
    command: preview
      ? `bun run build && bun run preview --port ${PORT} --strictPort`
      : 'bun run dev',
    url: `http://localhost:${PORT}/TamedTable/app/`,
    reuseExistingServer: !process.env.CI,
    // The production build (duckdb-wasm chunks) can take a while cold in CI.
    timeout: 180_000,
  },
  projects: [
    // The green suite a reviewer must see pass, everything except the bug
    // inventory under e2e/red/.
    { name: 'chromium', testIgnore: '**/e2e/red/**' },
    // The bug inventory: browser findings that fail on purpose. CI does NOT
    // gate on this project (`test:e2e:red` runs it on demand).
    { name: 'red', testMatch: '**/e2e/red/**/*.e2e.ts' },
  ],
});
