// #VoiceMode
// The orchestrator. It owns the state machine and routes each detected turn to
// the transcriber. One wiring now: the VAD draws turn boundaries, each finished
// clip goes to the provider, the text comes back.
//
//        idle ──start()──▶ listening ──speech start──▶ speech
//          ▲                   ▲                          │ speech end
//          │                   │                          ▼
//          └── destroy()       └──── onTranscript ── transcribing
//                                  (transcribe fails: → error → listening)

import { createVad, DEFAULT_TUNING, type VadTuning, type VadHandle } from './vad.ts';
import type { STTProvider } from './stt/types.ts';

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
  onStateChange?: (state: VoiceState) => void;
  onError?: (err: VoiceError) => void;
  /** VAD knob overrides, merged onto the defaults. */
  vad?: Partial<VadTuning>;
}

export interface VoiceSession {
  /** Asks for the mic and loads the VAD model, then listens. Rejects if the mic
   *  is denied or the browser can't run the VAD. */
  start(): Promise<void>;
  /** Stops listening but keeps a loaded VAD model warm for a quick restart. */
  stop(): void;
  /** Releases the mic, worklet, and model. The session can't be restarted. */
  destroy(): void;
  /** Re-tune the VAD while it runs — e.g. shorten redemptionMs for snappier
   *  turn-ends. No-op before start() or after destroy(). */
  updateVad(opts: Partial<VadTuning>): void;
  readonly state: VoiceState;
}

export function createVoiceSession(opts: VoiceSessionOptions): VoiceSession {
  let state: VoiceState = 'idle';
  let vad: VadHandle | null = null;
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

  async function startVad(): Promise<void> {
    const tuning: VadTuning = { ...DEFAULT_TUNING, ...opts.vad };
    try {
      vad = await createVad(
        {
          onSpeechStart: () => setState('speech'),
          onSpeechEnd: (pcm) => {
            setState('transcribing');
            opts.stt
              .transcribe({ pcm, sampleRate: 16000 })
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
        await startVad();
      } catch (e) {
        const ve = (e as VoiceError).stage
          ? (e as VoiceError)
          : { stage: 'mic' as const, message: errMsg(e), cause: e };
        fail(ve);
        throw e;
      }
    },
    stop(): void {
      vad?.pause();
      setState('idle');
    },
    destroy(): void {
      destroyed = true;
      vad?.destroy();
      vad = null;
      setState('idle');
    },
    updateVad(opts: Partial<VadTuning>): void {
      vad?.setOptions(opts);
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
