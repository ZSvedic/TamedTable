// #VoiceInput
// Press-and-hold voice input. Owns the recording port (browser MediaRecorder
// or a test stub), the mic state machine, and the 30 s auto-stop timer. A
// release runs the ordinary patch turn with the audio riding along as a file
// part: one model call, no separate transcription step.
import { basename } from 'node:path';
import type { RequestAudio, RequestDebugInfo } from '@tamedtable/headless';
import { supportsVoiceInput } from '@tamedtable/model-config';
import {
  buildVoicePrompt,
  type VoiceContext,
  type VoicePort,
  type ContinuousVoicePort,
} from '@tamedtable/voice-input';
import { describeError, summarizeDebug } from './controller-messages.ts';
import type { ControllerHost } from './controller-context.ts';
import { track } from './analytics.ts';

/** Placeholder chat-bubble/history label for a voice turn, replaced by
 *  `\u{1F399} <transcript>` once the model returns the transcript. */
const VOICE_REQUEST_LABEL = '\u{1F399} Voice request';

export class VoiceManager {
  private readonly voice: VoicePort | undefined;
  private readonly continuous: ContinuousVoicePort | undefined;
  private voiceAbort: AbortController | null = null;
  /** Cancels the pending 30 s auto-stop, set while a recording is live. */
  private voiceAutoStopCancel: (() => void) | null = null;
  /** True while a continuous turn is being applied, so a second detected turn
   *  that lands mid-request is dropped rather than overlapping the first. */
  private continuousBusy = false;
  /** Bumped on every mic-session start and abandon, so a start whose await
   *  (the permission prompt) outlives its session never goes live. */
  private voiceEpoch = 0;
  /** A quick tap landed while the start was still pending: come up latched. */
  private latchOnStart = false;

  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
    this.voice = host.opts.voice;
    this.continuous = host.opts.continuousVoice;
  }

  /** True when the mic button should show: the selected model accepts voice
   *  input *and* its provider is one we can send audio to (supportsVoiceInput),
   *  the selected provider has a key, and a recording port is wired. A playing tour is the exception: its voice
   *  step replays a recorded Gemini turn key-free and spotlights the mic, so
   *  the button shows while the tour is active even with no key. */
  voiceAvailable(): boolean {
    if (this.voice === undefined) return false;
    if (this.host.tutorial.isTutorialActive()) return true;
    const { provider, model } = this.host.config;
    return supportsVoiceInput(provider, model) && !!this.host.settingsMgr.activeApiKey();
  }

  /** Press-and-hold start: begin recording, auto-stopping after 30 s. The
   *  awaited `startRecording` is the browser permission prompt, the state
   *  machine sits in `starting` while it is up, so a release, Escape, or a
   *  closed gate in that window ends the session and the grant lands on a
   *  session that immediately releases the microphone. */
  async startVoice(): Promise<void> {
    if (!this.voice || this.host.voiceStatus !== 'idle') return;
    if (!this.voiceAvailable()) return;
    const epoch = ++this.voiceEpoch;
    this.latchOnStart = false;
    this.host.voiceStatus = 'starting';
    this.host.notify();
    try {
      await this.voice.startRecording();
    } catch (e) {
      if (this.voiceEpoch === epoch) {
        this.host.pushToast('error', `Could not start recording: ${(e as Error).message}`);
        this.host.voiceStatus = 'idle';
        this.host.notify();
      }
      return;
    }
    if (this.voiceEpoch !== epoch || this.host.voiceStatus !== 'starting') {
      // Released or cancelled while the permission prompt was up, the grant
      // just lit a microphone nobody is holding; release it right away.
      try {
        this.voice.cancelRecording();
      } catch {
        // Teardown of an unwanted session is best-effort.
      }
      return;
    }
    this.host.voiceStatus = this.latchOnStart ? 'latched' : 'recording';
    this.latchOnStart = false;
    const schedule = this.host.opts.voiceSchedule
      ?? ((fn: () => Promise<void>, ms: number) => {
        const t = setTimeout(() => void fn(), ms);
        return () => clearTimeout(t);
      });
    this.voiceAutoStopCancel = schedule(() => this.stopVoice(), 30_000);
    this.host.notify();
  }

  /** Quick tap (released before it counts as a hold): keep recording, but
   *  hands-free: the button swaps to explicit cancel (✕) / send (✓) controls.
   *  A tap that lands while the start is still pending (the permission
   *  prompt) is remembered, so the granted session comes up latched. */
  latchVoice(): void {
    if (!this.voice) return;
    if (this.host.voiceStatus === 'starting') {
      this.latchOnStart = true;
      return;
    }
    if (this.host.voiceStatus !== 'recording') return;
    this.host.voiceStatus = 'latched';
    this.host.notify();
  }

  /** Release (or the ✓ control on a latched recording): stop recording and run
   *  the ordinary patch turn with the audio riding along as a file part: one
   *  model call, no transcription step. A release during `starting` (the
   *  permission prompt is still up) has nothing recorded to send: it ends
   *  the pending session instead. */
  async stopVoice(): Promise<void> {
    if (!this.voice) return;
    if (this.host.voiceStatus === 'starting') {
      this.voiceEpoch++;
      this.host.voiceStatus = 'idle';
      this.host.notify();
      return;
    }
    if (this.host.voiceStatus !== 'recording' && this.host.voiceStatus !== 'latched') return;
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
      // A microphone failure surfaces like any other voice failure: the toast
      // AND an assistant chat message: the toast fades, the chat entry stays.
      this.host.fail(`Voice input failed: ${(e as Error).message}`);
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
   *  does. Shared by the mic-release path and the tutorial `play-audio` step,
   *  which replays this exact request from a cassette, key-free. */
  async sendAudioRequest(audio: RequestAudio, signal?: AbortSignal): Promise<void> {
    // Staying in a finished tour: the engine still replays from the tour's
    // cassette, which cannot answer a request it never recorded: ignore
    // silently like sendChat does (the UI disables the mic). A playing tour's
    // play-audio step is unaffected (not stayed).
    if (this.host.tutorial.isTutorialStayed()) return;
    // Placeholder bubble; the same model call that patches the spec also
    // returns a transcript, which replaces it the moment the call lands.
    const bubbleId = this.host.pushMessage('user', VOICE_REQUEST_LABEL);
    let heard: string | undefined;
    try {
      track('voice-request');
      await this.host.engine.request(buildVoicePrompt(this.buildVoiceContext()), {
        signal,
        audio,
        label: VOICE_REQUEST_LABEL,
        onTranscript: (t) => {
          heard = `\u{1F399} ${t}`;
          this.host.updateMessage(bubbleId, heard);
        },
      });
      // A declined confirmation (the run-all estimate, a lookup) dropped the
      // patch: nothing committed, so there is no history entry to relabel.
      // Relabelling would rewrite the previous, unrelated entry, and no
      // success reply to post (code-contract § Voice: the label is rewritten
      // "on success" only). The placeholder bubble keeps the transcript.
      if (this.host.engine.lastCommitId === null) return;
      if (heard) this.host.patch.relabelLast(heard);
      const debug = this.host.lastDebug;
      this.host.pushMessage(
        'assistant',
        debug ? summarizeDebug(debug) : 'Done.',
        debug,
        true,
        this.host.engine.lastCommitId ?? undefined,
      );
    } catch (e) {
      // A cassette replay miss during a tour ends it cleanly: same safety
      // net as sendChat, never the raw fingerprint-mismatch error.
      if (this.host.tutorial.consumeReplayMiss()) {
        this.host.pushToast('info', 'Tour ended: the guided replay went off-script.');
        this.host.tutorial.cancelTutorial();
        return;
      }
      // Same failure surface as a typed request: error toast plus an
      // assistant message carrying the per-attempt debug info.
      const debug = (e as { debug?: RequestDebugInfo }).debug;
      const { message, reportable } = describeError(e, this.host.config.provider);
      this.host.fail(`Voice input failed: ${message}`, debug, reportable);
    }
  }

  /** Escape: discard the recording without sending anything. During
   *  `starting` there is nothing live yet: end the pending session and let
   *  startVoice's continuation release the microphone once the prompt
   *  settles. */
  cancelVoice(): void {
    if (this.host.voiceStatus === 'idle') return;
    this.clearVoiceTimer();
    this.voiceAbort?.abort();
    this.voiceAbort = null;
    if (this.host.voiceStatus === 'starting') {
      this.voiceEpoch++;
    } else {
      try {
        this.voice?.cancelRecording();
      } catch {
        // A teardown failure must not strand the UI in a recording state.
      }
    }
    this.host.voiceStatus = 'idle';
    this.host.notify();
  }

  /** Called after every config change: the mic and waveform are shown only
   *  for a voice-capable model with a key, so when a provider switch or key
   *  removal closes that gate, any live session is torn down with it: the
   *  controls unmount, and a stranded recording would keep the microphone
   *  hot and still send through the placeholder-key fallback. */
  enforceGate(): void {
    if (!this.voiceAvailable() && this.host.voiceStatus !== 'idle') this.cancelVoice();
    if (!this.continuousAvailable() && this.host.continuousStatus !== 'idle') this.stopContinuous();
  }

  // ── Continuous (hands-free) voice ─────────────────────────────────────────

  /** Same gate as the mic button, but for the continuous port: a voice-capable
   *  model, a key for its provider, and a continuous port wired. */
  continuousAvailable(): boolean {
    if (this.continuous === undefined) return false;
    const { provider, model } = this.host.config;
    return supportsVoiceInput(provider, model) && !!this.host.settingsMgr.activeApiKey();
  }

  /** One toggle: start listening if idle, stop if already running. A click
   *  while the VAD is still loading (`starting`) is ignored: re-entering
   *  start would open a second session holding the microphone forever, and
   *  the port keeps a single handle so stop would release only one. */
  async toggleContinuous(): Promise<void> {
    if (this.host.continuousStatus === 'starting') return;
    if (this.host.continuousStatus === 'idle') await this.startContinuous();
    else this.stopContinuous();
  }

  /** Open the mic and start the VAD. Each detected turn flows to
   *  onContinuousSegment → the ordinary audio patch turn. The state machine
   *  sits in `starting` across the seconds-long VAD load; if the session is
   *  stopped in that window (a closed gate), the load's completion releases
   *  the session it just opened instead of going live. */
  async startContinuous(): Promise<void> {
    if (!this.continuous || this.host.continuousStatus !== 'idle') return;
    if (!this.continuousAvailable()) return;
    this.host.continuousStatus = 'starting';
    this.host.notify();
    try {
      await this.continuous.start({
        onSegment: (clip) => this.onContinuousSegment(clip),
        onError: (e) => this.host.pushToast('error', `Voice error: ${e.message}`),
      });
    } catch (e) {
      this.host.pushToast('error', `Could not start hands-free voice: ${(e as Error).message}`);
      if (this.host.continuousStatus === 'starting') this.host.continuousStatus = 'idle';
      this.host.notify();
      return;
    }
    if (this.host.continuousStatus !== 'starting') {
      try {
        this.continuous.stop();
      } catch {
        // Teardown of an unwanted session is best-effort.
      }
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

  /** Apply one detected turn through the ordinary audio patch turn, the same
   *  call the mic release makes, so context and cost match. A turn that arrives
   *  while one is still applying is dropped, so two patch turns never overlap. */
  private async onContinuousSegment(clip: Blob): Promise<void> {
    // Dropped unless the session is plainly listening AND no other turn: a
    // continuous one (continuousBusy), or a typed/mic one (host.streaming):
    // is still applying: any overlap, not just a continuous-on-continuous
    // one, must drop the clip rather than error (code-contract § Voice).
    if (this.continuousBusy || this.host.streaming || this.host.continuousStatus !== 'listening') return;
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
      // The selection is a view position (#LazyExec): map it back to the
      // derived row the model should be told about.
      const derived = this.host.view.viewOrder(this.host.engine.rawRows())[this.host.selection.row]
        ?? this.host.selection.row;
      const value = this.host.engine.displayRows()[derived]?.[this.host.selection.column];
      ctx.selectedCell = {
        col: this.host.selection.column,
        row: derived,
        value: value === undefined || value === null ? '' : String(value),
      };
    }
    return ctx;
  }
}
