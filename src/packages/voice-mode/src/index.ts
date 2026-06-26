// #VoiceMode
// Public API for hands-free continuous voice. Plug in an STT provider, get a
// session whose state machine turns a live mic into one onTranscript call per
// spoken turn — no button. See SPEC.md for the why and the state diagram.
//
//   const session = createVoiceSession({
//     stt: webSpeechSTT(),                 // or whisperSTT({ apiKey })
//     onTranscript: (text) => act(text),
//   });
//   await session.start();   // ... user just talks ...
//   session.destroy();

export { createVoiceSession } from './session.ts';
export type {
  VoiceSession,
  VoiceSessionOptions,
  VoiceState,
  VoiceError,
} from './session.ts';

export { webSpeechSTT } from './stt/webspeech.ts';
export type { WebSpeechOptions } from './stt/webspeech.ts';
export { whisperSTT } from './stt/whisper.ts';
export type { WhisperOptions } from './stt/whisper.ts';
export type { STTProvider, AudioSegment } from './stt/types.ts';

export { DEFAULT_TUNING } from './vad.ts';
export type { VadTuning } from './vad.ts';

export { checkSupport } from './support.ts';
export type { SupportReport } from './support.ts';
