import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { parseTours } from '@tamedtable/gherkin-tour';
import { createWebController } from './controller.ts';
import type { TutorialSources, ResolvedConfig } from './controller.ts';
import { BrowserFilePort } from './lib/browser-fs.ts';
import { browserVoicePort } from './lib/browser-voice.ts';
import { App } from './App.tsx';
import './index.css';

declare const __TT_TUTORIAL__: {
  features: Record<string, string>;
  inputs:   Record<string, string>;
  goldens:  Record<string, string>;
};

// Config is now persisted by the controller itself via controller-storage.ts.
// We still subscribe to persist the model separately for forward compat with
// any older stored 'tamedtable.model' entries (the controller ignores that key;
// this subscription is a no-op that doesn't write anything we need, but it
// keeps the observer pattern intact for future use).

const tutorialSources: TutorialSources = {
  tours:   Object.values(__TT_TUTORIAL__.features).flatMap((src) => parseTours(src)),
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

const root = document.getElementById('root');
if (!root) throw new Error('TamedTable: #root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);
