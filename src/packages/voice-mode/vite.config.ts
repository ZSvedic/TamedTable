import { defineConfig } from 'vite';

// Standalone demo build — independent of the main app's bun pipeline, so the
// whole package can be launched on its own with `bun run demo`. The demo lives
// in demo/, and the VAD's model/wasm assets load from a pinned CDN at runtime
// (see demo/main.ts), so nothing extra needs bundling or copying here.
export default defineConfig({
  root: 'demo',
  // @ricky0123/vad-web ships as CommonJS, so let Vite's dep optimizer pre-bundle
  // it (and its onnxruntime-web import) — that handles the CJS→ESM interop the
  // raw dev server can't, so the `MicVAD` named export resolves. The VAD still
  // fetches its model/wasm from the CDN at runtime; only the JS is bundled.
  optimizeDeps: { include: ['@ricky0123/vad-web', 'onnxruntime-web'] },
});
