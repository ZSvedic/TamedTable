// #WebUI
// The bundled sample-file list, shared by the Open-sample picker and the empty
// page. The filenames are frozen at build time by vite.config.ts
// (__TT_SAMPLE_FILES__); here we compose each into a full same-origin URL so a
// pick loads through the ordinary URL path and the address stays copy-pasteable.
import type { RecommendedSample, ToolbarSample } from '@tamedtable/toolbar';
import type { ShowcaseSample } from './showcase-samples.ts';

// Sample files bundled into the deployed site by vite.config.ts. Frozen at
// build time (goldens excluded — they are tour outputs, not files to open).
declare const __TT_SAMPLE_FILES__: readonly string[];

// The picker's recommended rows — one per showcase tour, in homepage order.
// Derived at build time by vite.config.ts from the tours themselves.
declare const __TT_SHOWCASE_SAMPLES__: readonly ShowcaseSample[];

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

/** The picker's recommended samples as `{ name, url, title }`, in homepage
 *  order — the file each showcase tour opens. */
export function recommendedSamples(): RecommendedSample[] {
  return [...__TT_SHOWCASE_SAMPLES__].map(({ title, file }) => ({
    title,
    name: file,
    url: sampleUrl(file),
  }));
}
