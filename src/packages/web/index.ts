// Public, DOM-free entry point for @tamedtable/web. The browser bundle
// (React components, File System Access port) lives under src/ and is reached
// only through main.tsx — never re-exported here — so importing this module
// from a Node context (the Cucumber suite) pulls in no DOM dependency.

export {
  WebController,
  createWebController,
  userFacingMessage,
  summarizeDebug,
} from './src/controller.ts';
export type {
  WebControllerOptions,
  TutorialSources,
  WebSettings,
  Toast,
  ChatMessage,
  DialogKind,
} from './src/controller.ts';
export type { FilePort, PickedFile, SaveOutcome, FetchLike } from '@tamedtable/file-io';
export { buildVoicePrompt } from './src/lib/voice.ts';
export type { VoiceContext, VoicePort } from './src/lib/voice.ts';
