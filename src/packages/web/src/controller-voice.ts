// #VoiceInput
// Press-and-hold voice input. Owns the recording port (browser MediaRecorder
// or a test stub), the mic state machine, and the 30 s auto-stop timer. A
// release runs the ordinary patch turn with the audio riding along as a file
// part — one model call, no separate transcription step.
import { basename } from 'node:path';
import type { RequestAudio, RequestDebugInfo } from '@tamedtable/headless';
import { ALL_MODELS } from '@tamedtable/model-config';
import { buildVoicePrompt, type VoiceContext, type VoicePort } from '@tamedtable/voice-input';
import { userFacingMessage, summarizeDebug } from './controller-messages.ts';
import type { ControllerHost } from './controller-context.ts';

/** Placeholder chat-bubble/history label for a voice turn, replaced by
 *  `\u{1F399} <transcript>` once the model returns the transcript. */
const VOICE_REQUEST_LABEL = '\u{1F399} Voice request';

export class VoiceManager {
  private readonly voice: VoicePort | undefined;
  private voiceAbort: AbortController | null = null;
  private voiceTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
    this.voice = host.opts.voice;
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
    this.voiceTimer = setTimeout(() => void this.stopVoice(), 30_000);
    this.host.notify();
  }

  /** Release: stop recording and run the ordinary patch turn with the audio
   *  riding along as a file part — one model call, no transcription step. */
  async stopVoice(): Promise<void> {
    if (!this.voice || this.host.voiceStatus !== 'recording') return;
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

  private clearVoiceTimer(): void {
    if (this.voiceTimer) {
      clearTimeout(this.voiceTimer);
      this.voiceTimer = undefined;
    }
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
