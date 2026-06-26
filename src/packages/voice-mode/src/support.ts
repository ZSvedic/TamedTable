// #VoiceMode
// What the browser must provide before full voice mode can run. The demo prints
// this as a PASS/FAIL list on load; callers can gate the UI on it. Pure feature
// detection — no permissions are requested, nothing is started.

export interface SupportReport {
  /** Mic capture. Required by every provider. */
  getUserMedia: boolean;
  /** Runs the Silero VAD model. Required by the Whisper (VAD-driven) path. */
  webAssembly: boolean;
  /** Hosts the VAD's audio processing off the main thread. Required by the VAD path. */
  audioWorklet: boolean;
  /** The browser's own recognizer. Required only by the Web Speech provider. */
  speechRecognition: boolean;
}

export function checkSupport(): SupportReport {
  const w = globalThis as unknown as Record<string, unknown>;
  const hasMedia =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';
  const hasWorklet =
    typeof (w.AudioWorkletNode ?? (w.AudioContext as object | undefined)) !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
    'audioWorklet' in AudioContext.prototype;

  return {
    getUserMedia: hasMedia,
    webAssembly: typeof WebAssembly !== 'undefined',
    audioWorklet: hasWorklet,
    speechRecognition: 'SpeechRecognition' in w || 'webkitSpeechRecognition' in w,
  };
}
