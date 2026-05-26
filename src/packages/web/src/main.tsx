import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebController } from './controller.ts';
import { BrowserFilePort } from './browser-fs.ts';
import { App } from './App.tsx';
import './index.css';

// The model preference persists in localStorage. The API key is persisted by
// the controller itself (also localStorage); leaving it out of opts here lets
// the controller pick up the stored value on its own.
const MODEL_STORAGE = 'tamedtable.model';

const controller = createWebController({
  file: new BrowserFilePort(),
  workDir: '/tamedtable',
  model: localStorage.getItem(MODEL_STORAGE) ?? undefined,
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
