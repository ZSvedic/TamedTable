// #VoiceInput
// Browser VoicePort backed by MediaRecorder. DOM-bound, so it lives apart from
// the DOM-free voice.ts (which the Node test build imports through index.ts) and
// is reached only from main.tsx.

import type { VoicePort } from './voice.ts';

export function browserVoicePort(): VoicePort {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];

  const teardown = (): void => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    recorder = null;
    chunks = [];
  };

  return {
    async startRecording(): Promise<void> {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.start();
    },
    stopRecording(): Promise<Blob> {
      return new Promise((resolve, reject) => {
        const rec = recorder;
        if (!rec) {
          reject(new Error('No recording in progress.'));
          return;
        }
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          teardown();
          resolve(blob);
        };
        rec.stop();
      });
    },
    cancelRecording(): void {
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      teardown();
    },
  };
}
