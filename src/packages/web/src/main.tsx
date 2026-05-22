import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebController } from './controller.ts';
import { BrowserFilePort } from './browser-fs.ts';
import { App } from './App.tsx';
import './index.css';

// The API key lives per browser tab — sessionStorage, not localStorage. The
// model preference is harmless to keep, so it persists across tabs in
// localStorage.
const KEY_STORAGE = 'tamedtable.apiKey';
const MODEL_STORAGE = 'tamedtable.model';

const controller = createWebController({
  file: new BrowserFilePort(),
  workDir: '/tamedtable',
  apiKey: sessionStorage.getItem(KEY_STORAGE) ?? undefined,
  model: localStorage.getItem(MODEL_STORAGE) ?? undefined,
});

controller.subscribe(() => {
  const { apiKey, model } = controller.getSettings();
  if (apiKey) sessionStorage.setItem(KEY_STORAGE, apiKey);
  else sessionStorage.removeItem(KEY_STORAGE);
  localStorage.setItem(MODEL_STORAGE, model);
});

const root = document.getElementById('root');
if (!root) throw new Error('TamedTable: #root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);
