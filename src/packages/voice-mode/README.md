# @tamedtable/voice-mode

Hands-free continuous voice for the browser: open the mic, talk, and each spoken
turn becomes one `onTranscript` call — no button. A client-side Voice Activity
Detector draws the turn boundaries, then the clip goes straight to **Gemini
Flash**, which transcribes it using a keyword context you supply. 100%
in-browser, no backend, BYOK. This package is a standalone feasibility module
plus a throwaway demo; it does **not** touch the table or the ETL pipeline. The
design and rationale live in [SPEC.md](SPEC.md).

## Run the demo

One command, from this folder:

```
cd src/packages/voice-mode
bun run demo
```

That runs `bun demo.html` — bun bundles the demo and prints a local URL. Open it,
paste a **Gemini API key**, allow the mic, flip **Full Voice Mode on**, and talk:
*"add milk"*, *"remove milk"*, *"clear the list"*. The list mutates live; the
status panel shows state, final transcript, and time-to-transcript per turn.

The **Recognition context** box is prefilled with example keywords. They ride
along with the audio so the model prefers those spellings — edit it live to see a
term like a column name or an odd brand come back right. The key stays in the tab
and is sent only to Google.

The demo uses the same `bun demo.html` setup as every other package here, so the
deploy workflow bundles it to the Pages site under `demos/voice-mode/`.
`bun run typecheck` type-checks the package on its own.

## Using the module

```ts
import { createVoiceSession, geminiSTT } from '@tamedtable/voice-mode';

const session = createVoiceSession({
  stt: geminiSTT({
    apiKey,
    model: 'gemini-2.5-flash',                 // optional; this is the default
    context: () => columns.join(', '),         // pulled fresh each turn to bias recognition
  }),
  onTranscript: (text) => doSomething(text),
  onStateChange: (s) => console.log(s),        // idle → listening → speech → transcribing → listening
});
await session.start();   // mic + VAD model load
// ... user talks ...
session.destroy();       // release mic + worklet + model
```

`checkSupport()` returns PASS/FAIL booleans for `getUserMedia`, WebAssembly, and
AudioWorklet — call it before showing the UI.

## Why transcribe through Gemini, not a plain STT API

A plain speech-to-text engine can't be told "this is a table with a column called
`DOB`." The browser's own Web Speech can't either — its grammar API was removed.
Sending the audio to an LLM lets us pass a **recognition context** (column names,
the commands the app understands, domain terms) and ask it to prefer those
spellings, which is the difference between `DOB` and `dee oh bee`. `geminiSTT`
takes `context` as a callback so it re-reads the live table each turn. It also
keeps BYOK to one key — no second STT vendor, and Anthropic offers no
transcription endpoint anyway.

## Memory and load cost

The VAD loads three assets on first `start()`: the Silero ONNX model (~2 MB),
onnxruntime-web's WASM, and the audio worklet. They come from a pinned jsDelivr
CDN by default — static files, still no backend — so the cost is a one-time
download plus WASM compile, typically a few hundred ms to ~1 s before the first
turn is heard. After that, listening is cheap: the model and runtime sit resident
(low tens of MB of JS heap in Chrome; watch the live readout in the demo) and each
turn is a short ONNX inference per ~32 ms frame. The Gemini call adds the only
per-turn network latency — a few hundred ms to ~2 s.

To run fully offline (the VAD only — Gemini still needs the network), self-host
the assets and point the VAD at them:

```ts
createVoiceSession({
  stt, onTranscript,
  vad: { baseAssetPath: '/vad/', onnxWASMBasePath: '/ort/' },
});
```

Copy `@ricky0123/vad-web/dist/{vad.worklet.bundle.min.js,silero_vad_v5.onnx}`
and `onnxruntime-web/dist/*.wasm` into those paths.

## Browser support

| Browser | VAD + Gemini |
|---|---|
| Chrome / Edge | ✅ |
| Safari (16.4+) | ✅ (AudioWorklet + WASM) |
| Firefox | ✅ |

No browser speech API is involved, so there's no Chrome-only gap and no
Edge-Microsoft-backend flakiness — the path is the same everywhere. Minimum
requirements: `getUserMedia`, WebAssembly, and AudioWorklet; the demo's
capability panel reports each on load.

## Known limitations

- **Every turn is a billed Gemini call.** A VAD false-trigger (a cough, the TV,
  someone else talking) spends one. In a real integration each turn would also
  mutate the table, so continuous mode needs a confirm/guard the demo skips.
- **No barge-in.** The demo never talks back, so interrupting playback isn't
  handled — a real integration would need it (see SPEC.md risks).
- **Turn-end latency is tunable, not free.** `redemptionMs` trades snappiness
  against clipping slow talkers; the default (~1.4 s of silence) suits
  conversational speech.
- **Context is capped by the prompt, not magic.** Keywords bias recognition but
  won't invent words the model can't hear; keep the list to the terms that
  actually matter.
- **CORS / key exposure.** The browser calls Google directly with the key, like
  any BYOK client app — fine for local testing and personal use; a shared
  deployment would front it with the user's own key entry, never a baked-in key.
