import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { parseTours } from '@tamedtable/gherkin-tour';
import { createWebController } from './controller.ts';
import type { TutorialSources, ResolvedConfig } from './controller.ts';
import { BrowserFilePort } from '@tamedtable/file-io/browser-fs';
import { browserVoicePort } from '@tamedtable/voice-input/browser-voice';
import { App } from './App.tsx';
import './index.css';

declare const __TT_TUTORIAL__: {
  features: Record<string, string>;
  inputs:   Record<string, string>;
  goldens:  Record<string, string>;
};

// Config is now persisted by the controller itself via
// @tamedtable/model-config/storage.
// We still subscribe to persist the model separately for forward compat with
// any older stored 'tamedtable.model' entries (the controller ignores that key;
// this subscription is a no-op that doesn't write anything we need, but it
// keeps the observer pattern intact for future use).

const tutorialSources: TutorialSources = {
  // Stamp each tour with its source filename (the map key) so a deep link can
  // match on (feature, name) — parseTours sees only the source string.
  tours:   Object.entries(__TT_TUTORIAL__.features).flatMap(
    ([feature, src]) => parseTours(src).map((t) => ({ ...t, feature })),
  ),
  inputs:  __TT_TUTORIAL__.inputs,
  goldens: __TT_TUTORIAL__.goldens,
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
