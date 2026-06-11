/// <reference lib="dom" />
// #FileIO demo logic — referenced by demo.html as an external module so
// `bun build` bundles it (inline scripts are left unbundled and 404 on ./index.ts).
import type { Spec } from '@tamedtable/core';
import { detectFormat, fetchTable, serializeFlow, type PickedFile } from './index.ts';
import { BrowserFilePort } from './browser-fs.ts';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

const port = new BrowserFilePort();
$('fio-fsa').textContent = port.hasFileSystemAccess
  ? 'File System Access API: available — Open and Save use real dialogs.'
  : 'File System Access API: missing — Open uses an upload field, Save downloads.';

let current: PickedFile | null = null;

function show(picked: PickedFile, format?: string): void {
  current = picked;
  $('fio-name').textContent = picked.name;
  $('fio-format').textContent = format ?? detectFormat(picked.name, null) ?? 'unknown';
  $('fio-preview').textContent = picked.text.split('\n').slice(0, 20).join('\n');
  $('fio-error').textContent = '';
  ($('fio-save') as HTMLButtonElement).disabled = false;
}

function showError(e: unknown): void {
  $('fio-error').textContent = (e as Error).message;
}

$('fio-open').addEventListener('click', async () => {
  try {
    const picked = await port.pickOpen(['.csv', '.jsonl']);
    if (picked) show(picked);
  } catch (e) {
    showError(e);
  }
});

$('fio-fetch').addEventListener('click', async () => {
  $('fio-error').textContent = '';
  try {
    const fetched = await fetchTable(($('fio-url') as HTMLInputElement).value);
    show(fetched, fetched.format);
  } catch (e) {
    showError(e);
  }
});

$('fio-save').addEventListener('click', async () => {
  if (!current) return;
  try {
    const outcome = await port.pickSave(current.name, ['.csv', '.jsonl'], current.text);
    $('fio-outcome').textContent =
      outcome.status === 'cancelled' ? 'cancelled' : `${outcome.status} as ${outcome.name}`;
  } catch (e) {
    showError(e);
  }
});

// A canned spec so serializeFlow output is visible without loading anything.
// Rendering into #out doubles as the demo smoke test's ready signal.
const sampleSpec: Spec = {
  table: 'data/people.csv',
  columns: [{ id: 'name' }, { id: 'age' }],
  transformations: [],
};
$('out').textContent = serializeFlow(sampleSpec);
