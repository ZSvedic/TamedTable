# Voice input

The `@tamedtable/voice-input` package owns capturing a spoken request in two
shapes: press-and-hold and hands-free. For press-and-hold it owns the
`VoicePort` recording interface, the browser implementation that captures
microphone audio and re-encodes it to WAV, and `buildVoicePrompt` — the
deterministic instruction text sent next to the audio. For hands-free it owns
the `ContinuousVoicePort` interface and a browser implementation backed by a
client-side voice-activity detector (VAD) that cuts each spoken turn into a WAV
clip with no button. It owns no UI (the buttons live in chat-panel) and assembles
no transcription step: every captured clip rides along on the ordinary patch
turn, so a voice request costs exactly as many model calls as a typed one.

## Worked example

The web controller holds a `VoicePort` (the browser's at runtime, a stub in
tests). When the user releases the mic button:

```
blob = await voice.stopRecording()        // audio/wav
prompt = buildVoicePrompt({
  filename: "people.csv",
  columns: ["name", "phone"],
  selectedCell: { col: "phone", row: 2, value: "555-0199" },
})
runner.request(prompt, { audio: blob })   // one ordinary patch turn
```

## VoicePort

The recording surface the host injects:

```
startRecording()  → Promise<void>
stopRecording()   → Promise<Blob>     // resolves with audio/wav
cancelRecording() → void              // discard, never resolves stop
```

`browserVoicePort()` (separate `browser-voice` entry point, DOM required)
wraps MediaRecorder. `stopRecording` re-encodes the captured audio (webm/opus
or mp4/aac, browser-dependent) to 16 kHz mono PCM16 WAV — the one format
every voice-capable provider accepts — via model-config's `audio-wav` helper.
Cancelling stops the recorder and releases the microphone without resolving.

## buildVoicePrompt

Pure text assembly — no network, no DOM. The prompt opens with the fixed
instruction whose canonical text is
[prompt-app-edit.md § VOICE_PROMPT](../../prompt-app-edit.md) (the package
keeps a byte-identical `VOICE_INSTRUCTION` copy; a guard test fails CI if it
drifts), then appends the table context so spoken references ("this column",
"the selected cell") resolve against the view:

- `File: <filename>` and `Columns: <comma-separated ids>` always appear.
- When a cell is selected, a `Selected cell:` line adds its column, 1-based
  row, and JSON-quoted value; with no selection the line is absent.

The whole prompt is fingerprint-load-bearing: cassette replay matches a voice
request byte-for-byte, so any wording change orphans every recorded voice
cassette and forces a re-record.

## audioMediaType

Maps an audio filename's extension to the MIME type the voice patch turn
sends. Shared by the test mic stub and the tutorial `play-audio` step so a
replayed tour request fingerprints identically to the recorded voice turn —
the mapping is as fingerprint-critical as the prompt text:

| Extension | MIME type |
|---|---|
| `.m4a` | `audio/mp4` |
| `.mp3` | `audio/mpeg` |
| `.wav` | `audio/wav` |
| `.webm` | `audio/webm` |

Any other extension throws.

## ContinuousVoicePort

Hands-free capture. The host injects a port; the browser implementation
(`browserContinuousPort`, separate `browser-vad` entry point — DOM and WASM
required) wraps `@ricky0123/vad-web`, the Silero VAD running on ONNX in an
AudioWorklet.

```
start(handlers)  → Promise<void>   // ask for the mic, load the VAD, listen
stop()           → void            // stop listening, release the mic
setTuning(t?)    → void            // re-tune turn detection while running
```

Once started, the VAD watches the live microphone entirely in the browser — no
audio leaves the machine to find turn boundaries. When the speaker pauses, it
cuts that stretch into 16 kHz mono PCM, which the port encodes to a WAV `Blob`
and hands to `handlers.onSegment`. The app sends that clip on the ordinary patch
turn, exactly as a mic release does. `VadTuning` carries the knobs in
milliseconds — `redemptionMs` (silence before a turn closes; the felt delay),
`minSpeechMs`, the speech thresholds, and the asset paths. The model and wasm
load from a pinned jsDelivr CDN by default (static files, no backend);
`baseAssetPath` / `onnxWASMBasePath` override to self-host for offline use.

## Demo page

The demo (`demo.html` + `demo.ts`, deployed under `/demos/voice-input/`) exercises
all three jobs by hand — no LLM, so a captured turn is just a clip you can play.

- **buildVoicePrompt** renders for a sample context into `#out` (the smoke test's
  ready signal).
- **Press-and-hold** drives a real `browserVoicePort()`: Start (`#vi-start`) asks
  for the microphone, Stop (`#vi-stop`) shows the WAV's type and byte size in
  `#vi-result` with an `<audio>` to play it back, Cancel (`#vi-cancel`) discards;
  `#vi-state` tracks idle/recording/stopped.
- **Hands-free** drives a real `browserContinuousPort()`: the toggle (`#hf-toggle`)
  starts/stops listening (`#hf-state`), each detected turn shows its clip size in
  `#hf-result` with an `<audio>` to play it, and Snappy/Balanced/Relaxed presets
  plus `redemptionMs` / `minSpeechMs` inputs re-tune the VAD live.
- A capability panel (`#caps`) reports getUserMedia, WebAssembly, and AudioWorklet.

Automated `@web` scenarios run Chromium with a fake microphone and only drive the
press-and-hold controls (the VAD's model loads from a CDN); the live page uses the
real microphone and VAD.
