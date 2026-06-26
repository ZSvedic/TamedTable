# voice-mode — spec

This package owns hands-free continuous voice: the microphone stays open, the
user just talks, and each spoken turn is detected, transcribed, and handed to a
callback — no button. It does **not** own anything app-specific: no table, no
ETL pipeline, no LLM. It is a standalone, reusable module plus a throwaway demo
for judging feasibility, memory, and browser support before we decide whether to
wire it into TamedTable.

## Worked example

```ts
const session = createVoiceSession({
  stt: webSpeechSTT(),                    // or whisperSTT({ apiKey, endpoint })
  onStateChange: (s) => render(s),        // idle → listening → speech → transcribing → listening
  onPartialTranscript: (t) => preview(t), // live, may be wrong (Web Speech only)
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

We will not use OpenAI's Realtime API (or any vendor duplex voice socket).
TamedTable is bring-your-own-key across Anthropic, OpenAI, and OpenRouter, and
**Anthropic has no equivalent duplex voice API** — building on one vendor's
socket would break BYOK and force a token-minting backend. So turn detection
runs 100% in the browser, provider-agnostic, with no backend and no
ephemeral-token server. The only network calls are the STT requests the user's
own key pays for (and Web Speech needs none).

## Architecture

```
getUserMedia ──▶ VAD (@ricky0123/vad-web: Silero model, ONNX, WASM, AudioWorklet)
                  │  onSpeechStart            onSpeechEnd(Float32Array @ 16 kHz)
                  ▼                            ▼
             state: speech            encode WAV ──▶ STTProvider.transcribe(audio)
                                                          ▼
                                                   onTranscript(text)
```

The VAD wrapper (`vad.ts`) hides `@ricky0123/vad-web` behind two events: speech
started, speech ended (with the captured PCM). The session (`session.ts`) owns
the state machine and routes each ended segment to whichever STT provider was
plugged in. STT is the only swappable network step.

## Public API

```ts
function createVoiceSession(opts: VoiceSessionOptions): VoiceSession;

interface VoiceSessionOptions {
  stt: STTProvider;
  onTranscript: (text: string) => void;       // final text, one per turn
  onPartialTranscript?: (text: string) => void;// interim guess, Web Speech only
  onStateChange?: (state: VoiceState) => void;
  onError?: (err: VoiceError) => void;
  vad?: Partial<VadTuning>;                     // thresholds, silence frames
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

## STT provider interface

```ts
interface STTProvider {
  readonly name: string;
  readonly partial: boolean;                 // does it emit interim text?
  transcribe(audio: AudioSegment): Promise<string>;
  // Web Speech drives its own recognition; the session calls listen() instead
  listen?(cb: { onPartial; onFinal; onError }): { stop(): void };
}

interface AudioSegment { pcm: Float32Array; sampleRate: 16000; }
```

Two implementations ship:

| Provider | Key | Browsers | Privacy |
|---|---|---|---|
| **Web Speech** (`webspeech.ts`) | none | Chrome/Edge only | audio is routed to Google's servers — document this loudly |
| **Whisper HTTP** (`whisper.ts`) | user's key (BYOK) | any | each VAD segment is POSTed as WAV to OpenAI `audio/transcriptions` or Groq `whisper-large-v3` |

Web Speech is a special case: it *is* both VAD and STT, so when it is the
provider the session leans on its native `onresult`/`onend` events through the
optional `listen()` path and skips `@ricky0123/vad-web` entirely. The Whisper
path is the one that exercises the full mic → VAD → encode → POST loop, and is
the one that generalizes to Anthropic/OpenRouter keys later.

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
- **Browser support.** Needs `getUserMedia`, WebAssembly, and `AudioWorklet`
  everywhere; Web Speech additionally needs `SpeechRecognition` (Chrome/Edge).
  Safari has `AudioWorklet` but no `SpeechRecognition`, so Safari is Whisper-only.
- **Asset serving.** `@ricky0123/vad-web` fetches its worklet, `.onnx` model, and
  ONNX-runtime `.wasm` at runtime from `baseAssetPath` / `onnxWASMBasePath`. Its
  own default is `/` (self-host expected), which 404s under a bundler, so the
  package points both at a pinned jsDelivr CDN by default — static files, still
  no backend. Override them to self-host for a fully offline build.

## Dependencies (justification)

- `@ricky0123/vad-web` — the VAD itself; wraps Silero + ONNX runtime. Core.
- `onnxruntime-web` — its peer dependency; runs the model.
- Build/serve the demo with Vite (its own setup inside the package), so the
  worklet/model/wasm assets serve cleanly and the demo launches standalone,
  independent of the main app's bun build. (This deviates from the repo's
  `bun demo.html` convention only because vad-web's runtime asset fetching is
  fiddly under the bun HTML bundler — flagged for review.)
