// #VoiceMode
// Public API for hands-free continuous voice. A client-side VAD draws turn
// boundaries (no button) and hands each spoken turn to Gemini Flash, which
// transcribes the audio directly — biased by a keyword context you supply — and
// calls back with the text. See SPEC.md for the why and the state diagram.
//
//   const session = createVoiceSession({
//     stt: geminiSTT({ apiKey, context: () => 'milk, eggs, bread, add, remove, clear' }),
//     onTranscript: (text) => act(text),
//   });
//   await session.start();   // ... user just talks ...
//   session.destroy();

export { createVoiceSession } from './session.ts';
export type { VoiceSession, VoiceSessionOptions, VoiceState, VoiceError } from './session.ts';

export { geminiSTT } from './stt/gemini.ts';
export type { GeminiOptions } from './stt/gemini.ts';
export type { STTProvider, AudioSegment } from './stt/types.ts';

export { DEFAULT_TUNING } from './vad.ts';
export type { VadTuning } from './vad.ts';

export { checkSupport } from './support.ts';
export type { SupportReport } from './support.ts';
