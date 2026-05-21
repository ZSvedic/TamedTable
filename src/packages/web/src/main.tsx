import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebController } from './controller.ts';
import { BrowserFilePort } from './browser-fs.ts';
import { theme } from './theme.ts';
import { App } from './App.tsx';
import './index.css';

// The API key lives per browser tab — sessionStorage, not localStorage.
const KEY_STORAGE = 'tamedtable.apiKey';

const controller = createWebController({
  file: new BrowserFilePort(),
  workDir: '/tamedtable',
  apiKey: sessionStorage.getItem(KEY_STORAGE) ?? undefined,
});

controller.subscribe(() => {
  const key = controller.getSettings().apiKey;
  if (key) sessionStorage.setItem(KEY_STORAGE, key);
  else sessionStorage.removeItem(KEY_STORAGE);
});

document.body.style.margin = '0';
document.body.style.background = theme.color.bg;

const root = document.getElementById('root');
if (!root) throw new Error('TamedTable: #root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);
