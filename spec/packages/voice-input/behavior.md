# Voice input

The `@tamedtable/voice-input` package owns recording a spoken request: the
`VoicePort` recording interface, the browser implementation that captures
microphone audio and re-encodes it to WAV, and `buildVoicePrompt` — the
deterministic instruction text sent next to the audio. It owns no UI (the mic
button lives in chat-panel) and makes no network calls: there is no
transcription step — the audio rides along on the ordinary patch turn, so a
voice request costs exactly as many model calls as a typed one.

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

Pure text assembly — no network, no DOM. The prompt tells the model the
request is spoken, asks for a verbatim `transcript` argument on the patch
call, and appends the table context so spoken references ("this column",
"the selected cell") resolve against the view:

- `File: <filename>` and `Columns: <comma-separated ids>` always appear.
- When a cell is selected, a `Selected cell:` line adds its column, 1-based
  row, and JSON-quoted value; with no selection the line is absent.

## Demo page

The demo (`demo.html` + `demo.ts`, deployed under `/demos/voice-input/`)
renders `buildVoicePrompt` for a sample context into `#out` (the smoke test's
ready signal) and drives a real `browserVoicePort()`: Start (`#vi-start`)
asks for the microphone, Stop (`#vi-stop`) shows the WAV's type and byte size
in `#vi-result` with an `<audio>` element to play it back, Cancel
(`#vi-cancel`) discards. The state line (`#vi-state`) tracks
idle/recording/stopped. Automated `@web` scenarios run Chromium with a fake
microphone; the live page uses the real one.
