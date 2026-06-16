import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebController } from './controller.ts';
import type { TutorialSources, TutorialManifestEntry } from './controller.ts';
import { BrowserFilePort } from '@tamedtable/file-io/browser-fs';
import { browserVoicePort } from '@tamedtable/voice-input/browser-voice';
import { App } from './App.tsx';
import './index.css';

// Lightweight tutorial scenario index, frozen into the bundle by vite.config.
// Everything heavy loads lazily, fetched same-origin under the deployed base.
declare const __TT_TUTORIAL_MANIFEST__: TutorialManifestEntry[];

const base = import.meta.env.BASE_URL; // e.g. '/TamedTable/'
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status} ${res.statusText}`);
  return res.text();
}

const tutorialSources: TutorialSources = {
  manifest: __TT_TUTORIAL_MANIFEST__,
  // Feature source, fixtures, and cassettes are served same-origin by the
  // staticDirPlugin copies in vite.config (dev + build).
  loadFeature: (name) => fetchText(`${base}tutorials/${name}`),
  loadFixture: (name) => fetchText(`${base}samples/${name}`),
  loadCassette: (feature) => fetchText(`${base}cassettes/${feature}.json`),
};

const controller = createWebController({
  file: new BrowserFilePort(),
  voice: browserVoicePort(),
  workDir: '/tamedtable',
  tutorialSources,
});

// Keep the page title in sync with activity; nothing else needed here for now.
controller.subscribe(() => {
  // Intentionally empty — config is persisted inside the controller.
});

// Deep link: ?feature=<file>&scenario=<name> opens the named tour and plays it.
// Reading the URL belongs here (alongside the app build data), not the
// controller. Unmatched/missing params boot normally — the controller no-ops.
const params = new URLSearchParams(window.location.search);
void controller.openTutorialFromLink(params.get('feature'), params.get('scenario'));

const root = document.getElementById('root');
if (!root) throw new Error('TamedTable: #root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);
