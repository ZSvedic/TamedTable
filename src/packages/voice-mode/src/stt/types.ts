// #VoiceMode
// The one swappable network step. Everything else in voice-mode is fixed: mic,
// VAD, state machine. Speech-to-text is what changes per provider and per key,
// so it hides behind this interface.
//
// A provider is one of two shapes. A *segment* provider (Whisper) gets one
// captured clip at a time and returns its text — the session runs the VAD and
// feeds it. A *self-driven* provider (Web Speech) does its own mic capture and
// turn detection, so the session steps aside and just relays its events.

/** One speech turn the VAD captured: raw PCM at the VAD's fixed 16 kHz mono. */
export interface AudioSegment {
  pcm: Float32Array;
  sampleRate: 16000;
}

export interface STTListenCallbacks {
  /** Interim guess; may change or be wrong. Only fires if `partial` is true. */
  onPartial?: (text: string) => void;
  /** Final text for one finished turn. */
  onFinal: (text: string) => void;
  onError?: (err: Error) => void;
}

export interface STTListenHandle {
  stop(): void;
}

export interface STTProvider {
  readonly name: string;
  /** Does this provider emit interim hypotheses while the user is still talking? */
  readonly partial: boolean;
  /** True when the provider runs its own mic + turn detection (Web Speech). The
   *  session then calls `listen()` and skips @ricky0123/vad-web entirely. */
  readonly selfDriven: boolean;
  /** Segment providers implement this: transcribe one VAD-captured clip. */
  transcribe?(audio: AudioSegment): Promise<string>;
  /** Self-driven providers implement this: take over continuous recognition. */
  listen?(cb: STTListenCallbacks): STTListenHandle;
}
