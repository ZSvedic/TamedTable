// #VoiceInput
// The button replacement for continuous voice. Wraps @ricky0123/vad-web (Silero
// VAD on ONNX in an AudioWorklet) and hands the caller two events: a turn
// started, a turn ended with its captured PCM. All the ONNX/WASM/worklet detail
// lives behind this file. DOM-free at import time — the mic is only touched in
// createVad(), which only browser-vad.ts calls, so the Node test build never
// loads it.
//
// @ricky0123/vad-web fetches its worklet, the Silero .onnx model, and
// onnxruntime-web's .wasm at runtime. Its own default base path is `/` (it
// expects you to self-host), which 404s under a bundler, so we point both paths
// at a pinned jsDelivr CDN by default — static files, so no backend. Override to
// self-host for a fully offline build. The onnxruntime-web version below must
// track this package's installed version, since vad-web bundles the matching glue.

import { MicVAD } from '@ricky0123/vad-web';
import type { FrameProcessorOptions } from '@ricky0123/vad-web';

const VAD_VERSION = '0.0.30';
const ORT_VERSION = '1.26.0';

/** Turn-detection knobs, in milliseconds to match @ricky0123/vad-web's own
 *  options. redemptionMs is the lever for the delay before a turn is sent.
 *  Defaults are the library's, tuned for conversation. */
export interface VadTuning {
  /** Frame score above this starts a turn. 0..1. */
  positiveSpeechThreshold: number;
  /** Frame score below this counts toward ending a turn. 0..1. */
  negativeSpeechThreshold: number;
  /** Silence held before a turn closes. Lower = snappier, but clips slow talkers. */
  redemptionMs: number;
  /** Shorter speech than this is treated as a misfire, not a turn. */
  minSpeechMs: number;
  /** Audio kept before speech onset, so turns don't start clipped. */
  preSpeechPadMs: number;
  /** Where the worklet + .onnx model load from. Defaults to a pinned CDN. */
  baseAssetPath: string;
  /** Where onnxruntime-web's .wasm loads from. Defaults to a pinned CDN. */
  onnxWASMBasePath: string;
}

export const DEFAULT_TUNING: VadTuning = {
  positiveSpeechThreshold: 0.3,
  negativeSpeechThreshold: 0.25,
  redemptionMs: 1400,
  minSpeechMs: 400,
  preSpeechPadMs: 800,
  baseAssetPath: `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_VERSION}/dist/`,
  onnxWASMBasePath: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`,
};

export interface VadCallbacks {
  onSpeechStart(): void;
  /** A finished turn: Float32 PCM at 16 kHz mono. */
  onSpeechEnd(pcm: Float32Array): void;
  /** A blip too short to be real speech — no turn emitted. */
  onMisfire?(): void;
}

export interface VadHandle {
  start(): Promise<void>;
  pause(): Promise<void>;
  destroy(): Promise<void>;
  /** Change turn-detection knobs on a running VAD — no reload. Only the
   *  frame-processor fields apply live; asset paths are fixed at load. */
  setOptions(opts: Partial<VadTuning>): void;
}

/** Build and load the VAD. Not listening until you call start(). Loading
 *  touches the mic (getUserMedia) and downloads the model, so this rejects on
 *  mic denial or a failed asset fetch. */
export async function createVad(cb: VadCallbacks, tuning: VadTuning): Promise<VadHandle> {
  const vad = await MicVAD.new({
    model: 'v5',
    startOnLoad: false,
    positiveSpeechThreshold: tuning.positiveSpeechThreshold,
    negativeSpeechThreshold: tuning.negativeSpeechThreshold,
    redemptionMs: tuning.redemptionMs,
    minSpeechMs: tuning.minSpeechMs,
    preSpeechPadMs: tuning.preSpeechPadMs,
    baseAssetPath: tuning.baseAssetPath,
    onnxWASMBasePath: tuning.onnxWASMBasePath,
    onSpeechStart: () => cb.onSpeechStart(),
    onSpeechEnd: (audio: Float32Array) => cb.onSpeechEnd(audio),
    onVADMisfire: () => cb.onMisfire?.(),
  });

  return {
    start: () => vad.start(),
    pause: () => vad.pause(),
    destroy: () => vad.destroy(),
    setOptions: (opts: Partial<VadTuning>) => {
      const fp: Partial<FrameProcessorOptions> = {};
      if (typeof opts.positiveSpeechThreshold === 'number') fp.positiveSpeechThreshold = opts.positiveSpeechThreshold;
      if (typeof opts.negativeSpeechThreshold === 'number') fp.negativeSpeechThreshold = opts.negativeSpeechThreshold;
      if (typeof opts.redemptionMs === 'number') fp.redemptionMs = opts.redemptionMs;
      if (typeof opts.minSpeechMs === 'number') fp.minSpeechMs = opts.minSpeechMs;
      if (typeof opts.preSpeechPadMs === 'number') fp.preSpeechPadMs = opts.preSpeechPadMs;
      vad.setOptions(fp);
    },
  };
}
