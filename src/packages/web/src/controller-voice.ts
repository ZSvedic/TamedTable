// #VoiceInput
// Press-and-hold voice input. Owns the recording port (browser MediaRecorder
// or a test stub), the mic state machine, and the 30 s auto-stop timer. A
// release runs the ordinary patch turn with the audio riding along as a file
// part — one model call, no separate transcription step.
import { basename } from 'node:path';
import type { RequestAudio, RequestDebugInfo } from '@tamedtable/headless';
import { ALL_MODELS } from '@tamedtable/model-config';
import {
  buildVoicePrompt,
  type VoiceContext,
  type VoicePort,
  type ContinuousVoicePort,
} from '@tamedtable/voice-input';
import { userFacingMessage, summarizeDebug, STAY_TOUR_MESSAGE } from './controller-messages.ts';
import type { ControllerHost } from './controller-context.ts';

/** Placeholder chat-bubble/history label for a voice turn, replaced by
 *  `\u{1F399} <transcript>` once the model returns the transcript. */
const VOICE_REQUEST_LABEL = '\u{1F399} Voice request';

export class VoiceManager {
  private readonly voice: VoicePort | undefined;
  private readonly continuous: ContinuousVoicePort | undefined;
  private voiceAbort: AbortController | null = null;
  /** Cancels the pending 30 s auto-stop, set while a recording is live. */
  private voiceAutoStopCancel: (() => void) | null = null;
  /** True while a continuous turn is being applied — so a second detected turn
   *  that lands mid-request is dropped rather than overlapping the first. */
  private continuousBusy = false;

  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
    this.voice = host.opts.voice;
    this.continuous = host.opts.continuousVoice;
  }

  /** True when the mic button should show: the selected model accepts voice
   *  input (catalogue voiceInput flag), the selected provider has a key, and
   *  a recording port is wired. */
  voiceAvailable(): boolean {
    if (this.voice === undefined) return false;
    const model = ALL_MODELS.find((m) => m.id === this.host.config.model);
    return !!model?.voiceInput && !!this.host.settingsMgr.activeApiKey();
  }

  /** Press-and-hold start: begin recording, auto-stopping after 30 s. */
  async startVoice(): Promise<void> {
    if (!this.voice || this.host.voiceStatus !== 'idle') return;
    if (!this.voiceAvailable()) return;
    try {
      await this.voice.startRecording();
    } catch (e) {
      this.host.pushToast('error', `Could not start recording: ${(e as Error).message}`);
      return;
    }
    this.host.voiceStatus = 'recording';
    const schedule = this.host.opts.voiceSchedule
      ?? ((fn: () => Promise<void>, ms: number) => {
        const t = setTimeout(() => void fn(), ms);
        return () => clearTimeout(t);
      });
    this.voiceAutoStopCancel = schedule(() => this.stopVoice(), 30_000);
    this.host.notify();
  }

  /** Quick tap (released before it counts as a hold): keep recording, but
   *  hands-free — the button swaps to explicit cancel (✕) / send (✓) controls.
   *  No-op unless a press-and-hold recording is currently live. */
  latchVoice(): void {
    if (!this.voice || this.host.voiceStatus !== 'recording') return;
    this.host.voiceStatus = 'latched';
    this.host.notify();
  }

  /** Release (or the ✓ control on a latched recording): stop recording and run
   *  the ordinary patch turn with the audio riding along as a file part — one
   *  model call, no transcription step. */
  async stopVoice(): Promise<void> {
    if (!this.voice || (this.host.voiceStatus !== 'recording' && this.host.voiceStatus !== 'latched')) return;
    this.clearVoiceTimer();
    this.host.voiceStatus = 'sending';
    this.voiceAbort = new AbortController();
    this.host.notify();

    let audio: RequestAudio;
    try {
      const blob = await this.voice.stopRecording();
      audio = {
        data: new Uint8Array(await blob.arrayBuffer()),
        mediaType: blob.type || 'audio/webm',
      };
    } catch (e) {
      this.host.pushToast('error', `Voice input failed: ${(e as Error).message}`);
      this.host.voiceStatus = 'idle';
      this.voiceAbort = null;
      this.host.notify();
      return;
    }

    try {
      await this.sendAudioRequest(audio, this.voiceAbort.signal);
    } finally {
      this.host.voiceStatus = 'idle';
      this.voiceAbort = null;
      this.host.notify();
    }
  }

  /** Run the ordinary patch turn for already-captured `audio`: post the
   *  placeholder user bubble, send the audio on a single model call (the same
   *  call returns the spec patch and a transcript), swap the bubble + history
   *  label to the transcript, and surface failures the same way a typed request
   *  does. Shared by the mic-release path and the tutorial `play-audio` step —
   *  which replays this exact request from a cassette, key-free. */
  async sendAudioRequest(audio: RequestAudio, signal?: AbortSignal): Promise<void> {
    // Staying in a finished tour: the engine still replays from the tour's
    // cassette, which cannot answer a request it never recorded — refuse like
    // sendChat does. A playing tour's play-audio step is unaffected (not stayed).
    if (this.host.tutorial.isTutorialStayed()) {
      this.host.fail(STAY_TOUR_MESSAGE);
      return;
    }
    // Placeholder bubble; the same model call that patches the spec also
    // returns a transcript, which replaces it the moment the call lands.
    const bubbleId = this.host.pushMessage('user', VOICE_REQUEST_LABEL);
    let heard: string | undefined;
    try {
      await this.host.engine.request(buildVoicePrompt(this.buildVoiceContext()), {
        signal,
        audio,
        label: VOICE_REQUEST_LABEL,
        onTranscript: (t) => {
          heard = `\u{1F399} ${t}`;
          this.host.updateMessage(bubbleId, heard);
        },
      });
      if (heard) this.host.patch.relabelLast(heard);
      const debug = this.host.lastDebug;
      this.host.pushMessage('assistant', debug ? summarizeDebug(debug) : 'Done.', debug);
    } catch (e) {
      // Same failure surface as a typed request: error toast plus an
      // assistant message carrying the per-attempt debug info.
      const debug = (e as { debug?: RequestDebugInfo }).debug;
      this.host.fail(`Voice input failed: ${userFacingMessage(e, this.host.config.provider)}`, debug);
    }
  }

  /** Escape: discard the recording without sending anything. */
  cancelVoice(): void {
    if (this.host.voiceStatus === 'idle') return;
    this.clearVoiceTimer();
    this.voiceAbort?.abort();
    this.voiceAbort = null;
    try {
      this.voice?.cancelRecording();
    } catch {
      // A teardown failure must not strand the UI in a recording state.
    }
    this.host.voiceStatus = 'idle';
    this.host.notify();
  }

  // ── Continuous (hands-free) voice ─────────────────────────────────────────

  /** Same gate as the mic button, but for the continuous port: a voice-capable
   *  model, a key for its provider, and a continuous port wired. */
  continuousAvailable(): boolean {
    if (this.continuous === undefined) return false;
    const model = ALL_MODELS.find((m) => m.id === this.host.config.model);
    return !!model?.voiceInput && !!this.host.settingsMgr.activeApiKey();
  }

  /** One toggle: start listening if idle, stop if already running. */
  async toggleContinuous(): Promise<void> {
    if (this.host.continuousStatus === 'idle') await this.startContinuous();
    else this.stopContinuous();
  }

  /** Open the mic and start the VAD. Each detected turn flows to
   *  onContinuousSegment → the ordinary audio patch turn. */
  async startContinuous(): Promise<void> {
    if (!this.continuous || this.host.continuousStatus !== 'idle') return;
    if (!this.continuousAvailable()) return;
    try {
      await this.continuous.start({
        onSegment: (clip) => this.onContinuousSegment(clip),
        onError: (e) => this.host.pushToast('error', `Voice error: ${e.message}`),
      });
    } catch (e) {
      this.host.pushToast('error', `Could not start hands-free voice: ${(e as Error).message}`);
      return;
    }
    this.host.continuousStatus = 'listening';
    this.host.notify();
  }

  /** Stop listening and release the mic. */
  stopContinuous(): void {
    if (this.host.continuousStatus === 'idle') return;
    try {
      this.continuous?.stop();
    } catch {
      // A teardown failure must not strand the button in a listening state.
    }
    this.host.continuousStatus = 'idle';
    this.host.notify();
  }

  /** Apply one detected turn through the ordinary audio patch turn — the same
   *  call the mic release makes, so context and cost match. A turn that arrives
   *  while one is still applying is dropped, so two patch turns never overlap. */
  private async onContinuousSegment(clip: Blob): Promise<void> {
    if (this.continuousBusy || this.host.continuousStatus === 'idle') return;
    this.continuousBusy = true;
    this.host.continuousStatus = 'sending';
    this.host.notify();
    try {
      const audio: RequestAudio = {
        data: new Uint8Array(await clip.arrayBuffer()),
        mediaType: clip.type || 'audio/wav',
      };
      await this.sendAudioRequest(audio);
    } finally {
      this.continuousBusy = false;
      // Back to listening unless the user stopped mid-request. The cast defeats
      // TS narrowing: stopContinuous() may have flipped the status during the
      // await above, which control-flow analysis can't see.
      if ((this.host.continuousStatus as string) !== 'idle') {
        this.host.continuousStatus = 'listening';
        this.host.notify();
      }
    }
  }

  private clearVoiceTimer(): void {
    this.voiceAutoStopCancel?.();
    this.voiceAutoStopCancel = null;
  }

  /** Snapshot the current table view for the voice instruction text. */
  private buildVoiceContext(): VoiceContext {
    const spec = this.host.engine.currentSpec();
    const filename = spec.table ? basename(spec.table) : basename(this.host.sourcePath) || 'table';
    const columns = spec.columns.map((c) => c.id);
    const ctx: VoiceContext = { filename, columns };
    if (this.host.selection) {
      const value = this.host.engine.displayRows()[this.host.selection.row]?.[this.host.selection.column];
      ctx.selectedCell = {
        col: this.host.selection.column,
        row: this.host.selection.row,
        value: value === undefined || value === null ? '' : String(value),
      };
    }
    return ctx;
  }
}
