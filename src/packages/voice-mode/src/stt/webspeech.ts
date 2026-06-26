// #VoiceMode
// Provider A — the browser's own SpeechRecognition. No key, no model download,
// no VAD: the engine listens, draws its own turn boundaries, and streams text.
// Chrome and Edge only.
//
// Privacy caveat, stated loudly: in Chrome the audio is sent to Google's
// servers for recognition. This provider is not private and not offline. It is
// here because it is the fastest way to feel the hands-free loop with zero
// setup — not because it fits BYOK. The Whisper provider is the one that
// generalizes across keys.

import type { STTProvider, STTListenCallbacks, STTListenHandle } from './types.ts';

// The constructor lives under one of two names depending on the browser.
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

function recognitionCtor(): SpeechRecognitionCtor | null {
  const w = globalThis as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface WebSpeechOptions {
  /** BCP-47 language tag the engine recognizes. Default 'en-US'. */
  lang?: string;
}

export function webSpeechSTT(opts: WebSpeechOptions = {}): STTProvider {
  return {
    name: 'web-speech',
    partial: true,
    selfDriven: true,
    listen(cb: STTListenCallbacks): STTListenHandle {
      const Ctor = recognitionCtor();
      if (!Ctor) throw new Error('SpeechRecognition is not available in this browser.');

      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = opts.lang ?? 'en-US';

      // The engine stops on its own after a pause; we restart it to stay
      // hands-free, unless the caller asked us to stop.
      let stopped = false;

      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i]!;
          const text = result[0].transcript.trim();
          if (!text) continue;
          if (result.isFinal) cb.onFinal(text);
          else cb.onPartial?.(text);
        }
      };
      rec.onerror = (e) => {
        // 'no-speech' and 'aborted' are routine in a continuous loop — ignore.
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        // 'network' / 'not-allowed' / 'service-not-allowed' are fatal: the engine
        // can't reach its cloud speech backend (Google in Chrome, Microsoft in
        // Edge — and Edge's is markedly flakier) or was denied. Restarting would
        // just respin the same error, so stop the loop and surface it once.
        if (e.error === 'network' || e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          stopped = true;
        }
        cb.onError?.(new Error(`SpeechRecognition error: ${e.error}`));
      };
      rec.onend = () => {
        if (!stopped) rec.start();
      };

      rec.start();
      return {
        stop() {
          stopped = true;
          rec.abort();
        },
      };
    },
  };
}
