// #VoiceInput
// Continuous (hands-free) voice: the mic stays open and a client-side VAD cuts
// each spoken turn into a clip — no button. This mirrors VoicePort exactly: the
// host injects a ContinuousVoicePort (browserContinuousPort() at runtime, a stub
// in tests). Each detected turn arrives as a WAV Blob, which the app sends on the
// ordinary patch turn — the same audio-to-model call the press-and-hold mic
// makes, so a continuous turn costs one model call and reuses the same context.

import type { VadTuning } from './vad.ts';

export interface ContinuousVoiceHandlers {
  /** A finished spoken turn, as a WAV Blob ready for the patch turn. */
  onSegment: (clip: Blob) => void | Promise<void>;
  /** A turn has begun — the user started speaking. */
  onSpeechStart?: () => void;
  onError?: (err: Error) => void;
}

export interface ContinuousVoicePort {
  /** Ask for the mic, load the VAD, and start listening. Rejects on mic denial
   *  or a failed model/asset fetch. */
  start(handlers: ContinuousVoiceHandlers): Promise<void>;
  /** Stop listening and release the mic. */
  stop(): void;
  /** Re-tune turn detection while running (e.g. shorten redemptionMs). */
  setTuning?(tuning: Partial<VadTuning>): void;
}
