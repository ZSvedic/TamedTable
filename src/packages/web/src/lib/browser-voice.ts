// #VoiceInput
// Browser VoicePort backed by MediaRecorder. DOM-bound, so it lives apart from
// the DOM-free voice.ts (which the Node test build imports through index.ts) and
// is reached only from main.tsx.
//
// stopRecording re-encodes the captured audio (webm/opus or mp4/aac, browser-
// dependent) to 16 kHz mono PCM16 WAV before resolving — the one format every
// voice-capable provider accepts (OpenAI's input_audio takes only wav/mp3).

import { blobToWavBytes } from '@tamedtable/model-config/audio-wav';
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
          const recorded = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          teardown();
          blobToWavBytes(recorded).then(
            (wav) => resolve(new Blob([wav as BlobPart], { type: 'audio/wav' })),
            reject,
          );
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
