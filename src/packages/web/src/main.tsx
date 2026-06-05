import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { parseTours } from '@tamedtable/gherkin-tour';
import { createWebController } from './controller.ts';
import type { TutorialSources } from './controller.ts';
import { BrowserFilePort } from './lib/browser-fs.ts';
import { App } from './App.tsx';
import './index.css';

declare const __TT_TUTORIAL__: {
  features: Record<string, string>;
  inputs:   Record<string, string>;
  goldens:  Record<string, string>;
};

// The model preference persists in localStorage. The API key is persisted by
// the controller itself (also localStorage); leaving it out of opts here lets
// the controller pick up the stored value on its own.
const MODEL_STORAGE = 'tamedtable.model';

const tutorialSources: TutorialSources = {
  tours:   Object.values(__TT_TUTORIAL__.features).flatMap((src) => parseTours(src)),
  inputs:  __TT_TUTORIAL__.inputs,
  goldens: __TT_TUTORIAL__.goldens,
};

const controller = createWebController({
  file: new BrowserFilePort(),
  workDir: '/tamedtable',
  model: localStorage.getItem(MODEL_STORAGE) ?? undefined,
  tutorialSources,
});

controller.subscribe(() => {
  localStorage.setItem(MODEL_STORAGE, controller.getSettings().model);
});

const root = document.getElementById('root');
if (!root) throw new Error('TamedTable: #root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);
