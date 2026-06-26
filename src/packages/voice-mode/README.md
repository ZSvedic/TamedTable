# @tamedtable/voice-mode

Hands-free continuous voice for the browser: open the mic, talk, and each spoken
turn becomes one `onTranscript` call — no button. A client-side Voice Activity
Detector draws the turn boundaries, so it stays provider-agnostic, 100%
in-browser, and BYOK-friendly. This package is a standalone feasibility module
plus a throwaway demo; it does **not** touch the table or the ETL pipeline. The
design and rationale live in [SPEC.md](SPEC.md).

## Run the demo

One command, from this folder:

```
cd src/packages/voice-mode
bun run demo
```

That runs `bun demo.html` — bun bundles the demo and prints a local URL. Open
it, allow the mic, flip **Full Voice Mode on**, and talk: *"add milk"*, *"remove
milk"*, *"clear the list"*. The list mutates live; the status panel shows state,
partial/final transcript, and time-to-transcript per turn.

- **Web Speech** (default) needs no key but is Chrome/Edge only and routes audio
  to Google.
- **Whisper** works in any browser — pick it, choose OpenAI or Groq, and paste
  your key (kept in the tab, sent only to that provider).

The demo uses the same `bun demo.html` setup as every other package here, so the
deploy workflow bundles it to the Pages site under `demos/voice-mode/`.
`bun run typecheck` type-checks the package on its own.

## Using the module

```ts
import { createVoiceSession, whisperSTT } from '@tamedtable/voice-mode';

const session = createVoiceSession({
  stt: whisperSTT({ apiKey }),            // or webSpeechSTT()
  onTranscript: (text) => doSomething(text),
  onStateChange: (s) => console.log(s),   // idle → listening → speech → transcribing → listening
});
await session.start();   // mic + model load
// ... user talks ...
session.destroy();       // release mic + worklet + model
```

`checkSupport()` returns PASS/FAIL booleans for `getUserMedia`, WebAssembly,
AudioWorklet, and SpeechRecognition — call it before showing the UI.

## Memory and load cost

The Whisper (VAD) path loads three assets on first `start()`: the Silero ONNX
model (~1–2 MB), onnxruntime-web's WASM, and the audio worklet. They come from a
pinned jsDelivr CDN by default — static files, still no backend — so the cost is
a one-time download plus WASM compile, typically a few hundred ms to ~1 s before
the first turn is heard. After that, listening is cheap: the model and runtime
sit resident (low tens of MB of JS heap in Chrome; watch the live readout in the
demo) and each turn is a short ONNX inference per ~32 ms frame.

To run fully offline, self-host the assets and point the VAD at them:

```ts
createVoiceSession({
  stt, onTranscript,
  vad: { baseAssetPath: '/vad/', onnxWASMBasePath: '/ort/' },
});
```

Copy `@ricky0123/vad-web/dist/{vad.worklet.bundle.min.js,silero_vad_v5.onnx}`
and `onnxruntime-web/dist/*.wasm` into those paths.

## Browser support

| Browser | VAD + Whisper | Web Speech |
|---|---|---|
| Chrome | ✅ | ✅ (Google backend) |
| Edge | ✅ | ⚠️ Microsoft backend — often returns `network` even though Chrome works |
| Safari (16.4+) | ✅ (AudioWorklet + WASM) | ❌ no SpeechRecognition |
| Firefox | ✅ | ❌ no SpeechRecognition |

Web Speech is the same API across Chrome and Edge but a different cloud service
behind it: Chrome routes to Google, Edge to Microsoft. Edge's is much flakier, so
a `network` error there is common — the demo says so and points you to Whisper.

Minimum requirements: `getUserMedia`, WebAssembly, and AudioWorklet for the VAD
path; Web Speech additionally needs `SpeechRecognition` (Chrome/Edge only). The
demo's capability panel reports each on load.

## Known limitations

- **Web Speech privacy and reliability.** The audio is sent to a cloud backend —
  Google in Chrome, Microsoft in Edge — so it is neither private nor BYOK-fitting,
  it is here for zero-setup testing only. Edge's backend frequently returns a
  `network` error even where Chrome works; the fix is to use Whisper, not to
  retry Edge.
- **Safari and Firefox** have no `SpeechRecognition`, so they are Whisper-only.
- **No barge-in.** The demo never talks back, so interrupting playback isn't
  handled — a real integration would need it (see SPEC.md risks).
- **Turn-end latency is tunable, not free.** `redemptionFrames` trades snappiness
  against clipping slow talkers; the default (~0.25 s of silence) suits
  conversational speech.
- **Whisper cost and latency.** Each turn is a separate HTTP round-trip billed to
  your key; expect a few hundred ms to a couple of seconds per turn.
