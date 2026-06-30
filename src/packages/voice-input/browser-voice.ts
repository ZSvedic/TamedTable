// #VoicePort
// Browser VoicePort backed by the Web Audio graph. DOM-bound, so it lives apart
// from the DOM-free voice.ts (which the Node test build imports through index.ts)
// and is reached only from main.tsx.
//
// Press-and-hold records the live microphone straight into 16 kHz mono PCM16
// WAV — the one format every voice-capable provider accepts (OpenAI's
// input_audio takes only wav/mp3; Gemini takes wav among others). It captures
// raw PCM through an AudioContext, exactly like the hands-free VAD path, rather
// than recording a compressed container with MediaRecorder and decoding it back.
// MediaRecorder is skipped on purpose: on some setups (notably macOS) it hands
// back an empty/header-only clip that then fails to decode ("Unable to decode
// audio data"), while the Web Audio graph still receives real samples — so the
// mic mirrors the waveform button, which never had that problem.

import { encodeWav } from './wav.ts';
import type { VoicePort } from './index.ts';

/** The rate every voice model wants. We ask the AudioContext for it directly;
 *  if the browser refuses, we record at whatever rate it gives and encode at
 *  that rate (still a valid WAV the provider accepts). */
const TARGET_RATE = 16_000;

export function browserVoicePort(): VoicePort {
  let ctx: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let node: ScriptProcessorNode | null = null;
  let chunks: Float32Array[] = [];
  let frames = 0;

  const teardown = (): void => {
    try {
      node?.disconnect();
      source?.disconnect();
    } catch {
      // Nodes already torn down — ignore.
    }
    stream?.getTracks().forEach((track) => track.stop());
    void ctx?.close();
    node = null;
    source = null;
    stream = null;
    ctx = null;
    chunks = [];
    frames = 0;
  };

  return {
    async startRecording(): Promise<void> {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Prefer a 16 kHz context so no resampling is needed; fall back to the
      // default rate if the browser won't honour the request.
      try {
        ctx = new AudioContext({ sampleRate: TARGET_RATE });
      } catch {
        ctx = new AudioContext();
      }
      // A user gesture (the press) opened this, but a context can still start
      // suspended under the autoplay policy — resume so frames actually flow.
      await ctx.resume();
      source = ctx.createMediaStreamSource(stream);
      // ScriptProcessorNode is deprecated in favour of AudioWorklet, but it
      // needs no separate worklet module to bundle and is supported everywhere
      // the app runs. One input channel mixes the mic down to mono for us.
      node = ctx.createScriptProcessor(4096, 1, 1);
      chunks = [];
      frames = 0;
      node.onaudioprocess = (e: AudioProcessingEvent): void => {
        const data = e.inputBuffer.getChannelData(0);
        // getChannelData returns a reused view — copy before it is overwritten.
        chunks.push(new Float32Array(data));
        frames += data.length;
      };
      // The node must reach the destination to be pulled, but we never write its
      // output buffer, so it emits silence — no microphone feedback.
      source.connect(node);
      node.connect(ctx.destination);
    },
    async stopRecording(): Promise<Blob> {
      const rate = ctx?.sampleRate ?? TARGET_RATE;
      const pcm = new Float32Array(frames);
      let offset = 0;
      for (const chunk of chunks) {
        pcm.set(chunk, offset);
        offset += chunk.length;
      }
      teardown();
      if (pcm.length === 0) {
        throw new Error('the recording was empty — hold the mic and speak, then release.');
      }
      const wav = encodeWav(pcm, rate);
      return new Blob([wav as BlobPart], { type: 'audio/wav' });
    },
    cancelRecording(): void {
      teardown();
    },
  };
}
