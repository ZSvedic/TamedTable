// #VoiceMode
// The transcriber seam. The mic, VAD, and state machine are fixed; what turns a
// captured speech segment into text is swappable behind this interface. One
// implementation ships — Gemini Flash, which takes the audio directly and uses
// a caller-supplied keyword list to bias what it hears.

/** One speech turn the VAD captured: raw PCM at the VAD's fixed 16 kHz mono. */
export interface AudioSegment {
  pcm: Float32Array;
  sampleRate: 16000;
}

export interface STTProvider {
  readonly name: string;
  /** Transcribe one VAD-captured clip to text. */
  transcribe(audio: AudioSegment): Promise<string>;
}
