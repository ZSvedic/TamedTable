# voice-mode — spec

This package owns hands-free continuous voice: the microphone stays open, the
user just talks, and each spoken turn is detected, transcribed by Gemini Flash,
and handed to a callback — no button. It does **not** own anything app-specific:
no table, no ETL pipeline, no command parsing. It is a standalone, reusable
module plus a throwaway demo for judging feasibility, memory, and browser support
before we decide whether to wire it into TamedTable.

## Worked example

```ts
const session = createVoiceSession({
  stt: geminiSTT({                        // audio → Gemini Flash, biased by keywords
    apiKey,
    context: () => 'milk, eggs, bread, add, remove, clear',
  }),
  onStateChange: (s) => render(s),        // idle → listening → speech → transcribing → listening
  onTranscript: (t) => applyCommand(t),   // final text for one spoken turn
});

await session.start();   // asks for the mic, loads the VAD model, starts listening
// user says "add milk" … silence … the loop fires onTranscript("add milk")
// user says "remove milk" … onTranscript("remove milk")
session.stop();          // stops listening, keeps the model warm
session.destroy();       // releases mic + worklet + model
```

The whole point is the contrast with push-to-talk dictation (what `voice-input`
already does): there, the user holds a button, the app records, and one clip
goes out. Here nobody touches anything — the **client-side VAD draws the turn
boundaries** that the button used to draw.

## Why client-side VAD, not a realtime API

We will not use a vendor duplex voice socket (OpenAI Realtime, Gemini Live).
TamedTable is bring-your-own-key across Anthropic, OpenAI, OpenRouter, and Google,
and those sockets need ephemeral tokens minted by a backend — and **Anthropic has
no equivalent duplex voice API** at all. So turn detection runs 100% in the
browser with no backend and no token server. The VAD draws the turn boundary the
button used to; the only network call per turn is the transcription the user's
own key pays for.

## Architecture

```
getUserMedia ──▶ VAD (@ricky0123/vad-web: Silero model, ONNX, WASM, AudioWorklet)
                  │  onSpeechStart            onSpeechEnd(Float32Array @ 16 kHz)
                  ▼                            ▼
             state: speech     encode WAV ──▶ STTProvider.transcribe(audio)
                                                  │  (Gemini Flash + keyword context)
                                                  ▼
                                           onTranscript(text)
```

The VAD wrapper (`vad.ts`) hides `@ricky0123/vad-web` behind two events: speech
started, speech ended (with the captured PCM). The session (`session.ts`) owns
the state machine and hands each ended segment to the transcriber. Transcription
is the only network step.

## Public API

```ts
function createVoiceSession(opts: VoiceSessionOptions): VoiceSession;

interface VoiceSessionOptions {
  stt: STTProvider;
  onTranscript: (text: string) => void;       // final text, one per turn
  onStateChange?: (state: VoiceState) => void;
  onError?: (err: VoiceError) => void;
  vad?: Partial<VadTuning>;                     // thresholds, silence timeout
}

interface VoiceSession {
  start(): Promise<void>;   // mic + model load; rejects if denied/unsupported
  stop(): void;             // stop listening, keep model in memory
  destroy(): void;          // release everything
  readonly state: VoiceState;
}

type VoiceState =
  | 'idle' | 'listening' | 'speech' | 'transcribing' | 'error';
```

State machine — one turn is a loop:

```
idle ──start()──▶ listening ──speech detected──▶ speech
  ▲                   ▲                             │ silence detected
  │                   │                             ▼
  └──destroy()        └────onTranscript()──── transcribing
                                  (on STT failure: → error → listening)
```

`stop()` returns to `idle` from any state. Mid-turn audio at `stop()` is dropped,
not transcribed.

## Transcriber interface

```ts
interface STTProvider {
  readonly name: string;
  transcribe(audio: AudioSegment): Promise<string>;
}

interface AudioSegment { pcm: Float32Array; sampleRate: 16000; }
```

One implementation ships — **Gemini Flash** (`gemini.ts`). Each VAD segment is
encoded to WAV and sent as inline base64 audio on a `generateContent` call with
the user's own Google key (BYOK), so there is no separate speech-to-text vendor
and no backend.

The reason to transcribe through an LLM rather than a plain STT API is the
**recognition context**. `geminiSTT` takes a `context: () => string` callback,
pulled fresh each turn, and asks the model to prefer those spellings:

```ts
geminiSTT({ apiKey, model: 'gemini-2.5-flash', context: () => columns.join(', ') });
```

So domain words — a column name like `DOB`, an odd brand, "bananas" — come back
right instead of mis-spelled. A plain STT engine can't be steered this way; the
browser's own Web Speech can't either (its grammar API was removed). Pulling the
context per turn means it tracks the live table (selected cell, current columns)
as it changes.

## Open questions / risks

- **Barge-in.** The demo has no TTS talking back, so barge-in (user interrupts
  playback) is out of scope here. Flagged because real integration needs it.
- **Silence timeout.** `redemptionMs` in the VAD decides how long a pause ends a
  turn; too short clips slow talkers, too long feels laggy. Tunable, default
  ~1.4 s (the library's own); demo exposes it.
- **WASM + model load cost.** First `start()` downloads the Silero ONNX model
  (~1–2 MB) and ONNX-runtime WASM, then compiles the worklet — a one-time hit of
  a few hundred ms to ~1 s. The demo measures time-to-first-listen.
- **Memory footprint.** ONNX runtime + model + audio worklet sit resident while
  listening. The demo shows `performance.memory` (Chrome) so we can watch it.
- **Browser support.** Needs `getUserMedia`, WebAssembly, and `AudioWorklet` —
  all present in current Chrome, Edge, Safari 16.4+, and Firefox. No browser
  speech API is involved, so there is no Chrome-only gap.
- **Cost and misfires.** Every detected turn is a billed Gemini call. A VAD
  false-trigger (a cough, background talk) spends one. In a real integration each
  turn would also mutate the table, so continuous mode needs a confirm/guard the
  demo doesn't.
- **Asset serving.** `@ricky0123/vad-web` fetches its worklet, `.onnx` model, and
  ONNX-runtime `.wasm` at runtime from `baseAssetPath` / `onnxWASMBasePath`. Its
  own default is `/` (self-host expected), which 404s under a bundler, so the
  package points both at a pinned jsDelivr CDN by default — static files, still
  no backend. Override them to self-host for a fully offline build.

## Dependencies (justification)

- `@ricky0123/vad-web` — the VAD itself; wraps Silero + ONNX runtime. Core.
- `onnxruntime-web` — its dependency; runs the model.
- No build-tool dependency: the demo is a `demo.html` that bun bundles and serves
  with `bun run demo`, the same as every other package here, so the deploy
  workflow picks it up unchanged. bun's bundler handles vad-web's CommonJS and
  loads the model/wasm from a CDN at runtime — nothing extra to copy.
