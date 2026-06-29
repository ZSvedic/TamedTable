// #VoiceMode
// What the browser must provide before full voice mode can run. The demo prints
// this as a PASS/FAIL list on load; callers can gate the UI on it. Pure feature
// detection — no permissions are requested, nothing is started.

export interface SupportReport {
  /** Mic capture. Required to hear anything. */
  getUserMedia: boolean;
  /** Runs the Silero VAD model. Required by the VAD. */
  webAssembly: boolean;
  /** Hosts the VAD's audio processing off the main thread. Required by the VAD. */
  audioWorklet: boolean;
}

export function checkSupport(): SupportReport {
  const hasMedia =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';
  const hasWorklet =
    typeof AudioContext !== 'undefined' && 'audioWorklet' in AudioContext.prototype;

  return {
    getUserMedia: hasMedia,
    webAssembly: typeof WebAssembly !== 'undefined',
    audioWorklet: hasWorklet,
  };
}
