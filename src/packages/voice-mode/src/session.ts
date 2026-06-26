// #VoiceMode
// The orchestrator. It owns the state machine and routes each detected turn to
// whichever STT provider was plugged in. Two wirings, picked by the provider:
//
//   selfDriven (Web Speech) : listening ⇄ speech, the engine emits final text
//   segment    (Whisper)    : listening → speech → transcribing → (emit) → listening
//
//        idle ──start()──▶ listening ──speech start──▶ speech
//          ▲                   ▲                          │ speech end
//          │                   │                          ▼
//          └── destroy()       └──── onTranscript ── transcribing
//                                  (stt fails: → error → listening)

import { createVad, DEFAULT_TUNING, type VadTuning, type VadHandle } from './vad.ts';
import type { STTProvider, STTListenHandle } from './stt/types.ts';

export type VoiceState = 'idle' | 'listening' | 'speech' | 'transcribing' | 'error';

export interface VoiceError {
  /** Where it broke, so the caller can word the message. */
  stage: 'mic' | 'vad-load' | 'stt' | 'unsupported';
  message: string;
  cause?: unknown;
}

export interface VoiceSessionOptions {
  stt: STTProvider;
  /** Final text for one finished turn. The heart of the loop. */
  onTranscript: (text: string) => void;
  /** Interim guess while the user is still talking (Web Speech only). */
  onPartialTranscript?: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (err: VoiceError) => void;
  /** VAD knob overrides, merged onto the defaults. Ignored for Web Speech. */
  vad?: Partial<VadTuning>;
}

export interface VoiceSession {
  /** Asks for the mic and (for the VAD path) loads the model, then listens.
   *  Rejects if the mic is denied or the browser can't run the provider. */
  start(): Promise<void>;
  /** Stops listening but keeps a loaded VAD model warm for a quick restart. */
  stop(): void;
  /** Releases the mic, worklet, and model. The session can't be restarted. */
  destroy(): void;
  readonly state: VoiceState;
}

export function createVoiceSession(opts: VoiceSessionOptions): VoiceSession {
  let state: VoiceState = 'idle';
  let vad: VadHandle | null = null;
  let listenHandle: STTListenHandle | null = null;
  let destroyed = false;

  const setState = (next: VoiceState): void => {
    if (state === next) return;
    state = next;
    opts.onStateChange?.(state);
  };
  const fail = (err: VoiceError): void => {
    setState('error');
    opts.onError?.(err);
  };

  async function startSelfDriven(): Promise<void> {
    // Web Speech does its own mic + turn detection; we just relay its events.
    listenHandle = opts.stt.listen!({
      onPartial: (t) => {
        setState('speech');
        opts.onPartialTranscript?.(t);
      },
      onFinal: (t) => {
        opts.onTranscript(t);
        setState('listening');
      },
      onError: (e) => fail({ stage: 'stt', message: e.message, cause: e }),
    });
    setState('listening');
  }

  async function startSegment(): Promise<void> {
    // VAD draws the turn boundaries; each finished clip goes to transcribe().
    const tuning: VadTuning = { ...DEFAULT_TUNING, ...opts.vad };
    try {
      vad = await createVad(
        {
          onSpeechStart: () => setState('speech'),
          onSpeechEnd: (pcm) => {
            setState('transcribing');
            opts.stt
              .transcribe!({ pcm, sampleRate: 16000 })
              .then((text) => {
                if (destroyed) return;
                if (text) opts.onTranscript(text);
                setState('listening');
              })
              .catch((e: unknown) => {
                if (destroyed) return;
                fail({ stage: 'stt', message: errMsg(e), cause: e });
                setState('listening'); // a failed turn shouldn't end the session
              });
          },
          onMisfire: () => setState('listening'),
        },
        tuning,
      );
    } catch (e) {
      // MicVAD.new() throws on mic denial or a failed asset/model fetch.
      const denied = errMsg(e).toLowerCase().includes('denied') || isNotAllowed(e);
      throw { stage: denied ? 'mic' : 'vad-load', message: errMsg(e), cause: e } as VoiceError;
    }
    await vad.start();
    setState('listening');
  }

  return {
    async start(): Promise<void> {
      if (destroyed) throw new Error('Session has been destroyed.');
      if (state !== 'idle' && state !== 'error') return; // already running
      try {
        if (opts.stt.selfDriven) await startSelfDriven();
        else await startSegment();
      } catch (e) {
        const ve = (e as VoiceError).stage
          ? (e as VoiceError)
          : { stage: 'mic' as const, message: errMsg(e), cause: e };
        fail(ve);
        throw e;
      }
    },
    stop(): void {
      listenHandle?.stop();
      listenHandle = null;
      vad?.pause();
      setState('idle');
    },
    destroy(): void {
      destroyed = true;
      listenHandle?.stop();
      listenHandle = null;
      vad?.destroy();
      vad = null;
      setState('idle');
    },
    get state() {
      return state;
    },
  };
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
function isNotAllowed(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'NotAllowedError';
}
