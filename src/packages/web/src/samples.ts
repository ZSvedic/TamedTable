// #WebUI
// The bundled sample-file list, shared by the Open-sample picker and the empty
// page. The filenames are frozen at build time by vite.config.ts
// (__TT_SAMPLE_FILES__); here we compose each into a full same-origin URL so a
// pick loads through the ordinary URL path and the address stays copy-pasteable.
import type { ToolbarSample } from '@tamedtable/toolbar';

// Sample files bundled into the deployed site by vite.config.ts. Frozen at
// build time.
declare const __TT_SAMPLE_FILES__: readonly string[];

/** Compose a full URL to a bundled sample file. import.meta.env.BASE_URL is
 *  "/TamedTable/" on the deployed site and "/" in some test configs; both
 *  compose correctly through URL(). */
function sampleUrl(name: string): string {
  return new URL(`${import.meta.env.BASE_URL}samples/${name}`, window.location.href).toString();
}

/** The bundled samples as `{ name, url }`, sorted at build time. */
export function bundledSamples(): ToolbarSample[] {
  return [...__TT_SAMPLE_FILES__].map((name) => ({ name, url: sampleUrl(name) }));
}
