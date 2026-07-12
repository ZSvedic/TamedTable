import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebController } from './controller.ts';
import type { TutorialSources, TutorialManifestEntry } from './controller.ts';
import { BrowserFilePort } from '@tamedtable/file-io/browser-fs';
import { browserVoicePort } from '@tamedtable/voice-input/browser-voice';
import { browserContinuousPort } from '@tamedtable/voice-input/browser-vad';
import { App } from './App.tsx';
import { captureInstallPrompt } from './install-prompt.ts';
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

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

const tutorialSources: TutorialSources = {
  manifest: __TT_TUTORIAL_MANIFEST__,
  // Feature source, fixtures, cassettes, and voice clips are served same-origin
  // by the staticDirPlugin copies in vite.config (dev + build).
  loadFeature: (name) => fetchText(`${base}tutorials/${name}`),
  loadFixture: (name) => fetchText(`${base}samples/${name}`),
  loadCassette: (feature) => fetchText(`${base}cassettes/${feature}.json`),
  loadAudio: (name) => fetchBytes(`${base}samples/${name}`),
};

const controller = createWebController({
  file: new BrowserFilePort(),
  // The port factories return null on a browser without the capture APIs;
  // unset here keeps the mic / waveform buttons hidden there.
  voice: browserVoicePort() ?? undefined,
  // Hands-free mode starts at the Balanced tuning (snappier than the library
  // default 1.4 s) so a turn is sent ~0.7 s after you stop.
  continuousVoice: browserContinuousPort({ redemptionMs: 700, minSpeechMs: 300 }) ?? undefined,
  tutorialSources,
});

// Keep the page title in sync with activity; nothing else needed here for now.
controller.subscribe(() => {
  // Intentionally empty — config is persisted inside the controller.
});

// Deep link: ?feature=<file>&scenario=<name> opens the named tour and plays
// it; ?tours (any value) opens the Tours panel chooser instead — the
// homepage's "take a guided tour" links use it. Reading the URL belongs here
// (alongside the app build data), not the controller. Unmatched/missing
// params boot normally — the controller no-ops.
const params = new URLSearchParams(window.location.search);
if (params.has('tours')) controller.openTutorial();
else void controller.openTutorialFromLink(params.get('feature'), params.get('scenario'));

// Catch Android's one-shot install event for the Settings panel's
// "Add to home screen" button.
captureInstallPrompt();

const root = document.getElementById('root');
if (!root) throw new Error('TamedTable: #root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);
