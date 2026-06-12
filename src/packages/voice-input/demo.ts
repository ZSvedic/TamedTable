// #VoicePort demo logic — referenced by demo.html as an external module so
// `bun build` bundles it. Renders buildVoicePrompt for a sample context into
// #out (the demo smoke test's ready signal) and drives a real
// browserVoicePort() through the Start / Stop / Cancel buttons.
import { buildVoicePrompt } from './index.ts';
import { browserVoicePort } from './browser-voice.ts';

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const startBtn = $('vi-start') as HTMLButtonElement;
const stopBtn = $('vi-stop') as HTMLButtonElement;
const cancelBtn = $('vi-cancel') as HTMLButtonElement;

const port = browserVoicePort();

function setState(state: 'idle' | 'recording' | 'stopped'): void {
  $('vi-state').textContent = state;
  startBtn.disabled = state === 'recording';
  stopBtn.disabled = state !== 'recording';
  cancelBtn.disabled = state !== 'recording';
}

startBtn.addEventListener('click', async () => {
  try {
    await port.startRecording();
    setState('recording');
  } catch (e) {
    $('vi-result').textContent = (e as Error).message;
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    const blob = await port.stopRecording();
    $('vi-result').textContent = `${blob.type} · ${blob.size.toLocaleString('en-US')} bytes`;
    const audio = $('vi-audio') as HTMLAudioElement;
    audio.src = URL.createObjectURL(blob);
    audio.style.display = '';
    setState('stopped');
  } catch (e) {
    $('vi-result').textContent = (e as Error).message;
    setState('idle');
  }
});

cancelBtn.addEventListener('click', () => {
  port.cancelRecording();
  $('vi-result').textContent = 'cancelled';
  setState('idle');
});

$('out').textContent = buildVoicePrompt({
  filename: 'people.csv',
  columns: ['name', 'phone', 'country'],
  selectedCell: { col: 'phone', row: 2, value: '555-0199' },
});
