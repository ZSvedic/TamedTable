// #VoiceInput
// Browser ContinuousVoicePort backed by @ricky0123/vad-web. DOM- and
// WASM-bound, so it lives apart from the DOM-free package entry and is reached
// only from main.tsx (a separate entry point, like browser-voice.ts), keeping
// the VAD/ONNX out of the Node test build.

import { createVad, DEFAULT_TUNING, type VadTuning, type VadHandle } from './vad.ts';
import { encodeWav } from './wav.ts';
import type { ContinuousVoicePort, ContinuousVoiceHandlers } from './continuous.ts';

/** VAD-backed ContinuousVoicePort; null where the browser lacks the capture
 *  APIs (same guard as browserVoicePort), so the host leaves hands-free
 *  unwired (waveform button hidden) instead of throwing. */
export function browserContinuousPort(tuning: Partial<VadTuning> = {}): ContinuousVoicePort | null {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null;
  if ((globalThis as { AudioContext?: unknown }).AudioContext === undefined) return null;

  let vad: VadHandle | null = null;

  return {
    async start(h: ContinuousVoiceHandlers): Promise<void> {
      vad = await createVad(
        {
          onSpeechStart: () => h.onSpeechStart?.(),
          onSpeechEnd: (pcm) => {
            // VAD emits 16 kHz mono Float32: the rate every voice model wants.
            const wav = encodeWav(pcm, 16000);
            void h.onSegment(new Blob([wav as BlobPart], { type: 'audio/wav' }));
          },
        },
        { ...DEFAULT_TUNING, ...tuning },
      );
      await vad.start();
    },
    stop(): void {
      void vad?.destroy();
      vad = null;
    },
    setTuning(t: Partial<VadTuning>): void {
      vad?.setOptions(t);
    },
  };
}
