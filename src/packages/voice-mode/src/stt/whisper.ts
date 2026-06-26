// #VoiceMode
// Provider B — POST each VAD-captured clip to a Whisper-style HTTP endpoint with
// the user's own key (BYOK). Works against OpenAI's audio/transcriptions and
// Groq's whisper-large-v3 unchanged, since Groq mirrors OpenAI's wire format.
// Any browser: this is the path that fits BYOK and the one Safari can use.
//
// The clip arrives as raw Float32 PCM at 16 kHz (what the VAD emits). We wrap it
// in a minimal WAV container — the one format both endpoints accept — and send
// it as multipart form data. No backend: the request goes straight from the
// browser to the provider with the key the user pasted.

import type { STTProvider, AudioSegment } from './types.ts';

export interface WhisperOptions {
  /** The user's API key. Stays in the browser; sent only to `baseUrl`. */
  apiKey: string;
  /** Transcriptions endpoint. Defaults to OpenAI; pass Groq's to switch. */
  baseUrl?: string;
  /** Model name the endpoint expects. Defaults to OpenAI's whisper-1. */
  model?: string;
  /** BCP-47 hint to bias recognition. Optional. */
  language?: string;
}

const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions';

export function whisperSTT(opts: WhisperOptions): STTProvider {
  const baseUrl = opts.baseUrl ?? OPENAI_URL;
  const model = opts.model ?? 'whisper-1';

  return {
    name: 'whisper',
    partial: false,
    selfDriven: false,
    async transcribe(audio: AudioSegment): Promise<string> {
      const wav = encodeWav(audio.pcm, audio.sampleRate);
      const form = new FormData();
      form.append('file', new Blob([wav], { type: 'audio/wav' }), 'turn.wav');
      form.append('model', model);
      form.append('response_format', 'text');
      if (opts.language) form.append('language', opts.language);

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${opts.apiKey}` },
        body: form,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Transcription failed (${res.status}): ${detail.slice(0, 200)}`);
      }
      // response_format=text returns the bare transcript, no JSON envelope.
      return (await res.text()).trim();
    },
  };
}

/** Float32 PCM (-1..1) → 16-bit PCM WAV bytes. Mono, caller's sample rate. */
function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + pcm.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  const dataSize = pcm.length * bytesPerSample;
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]!));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += bytesPerSample;
  }
  return buffer;
}
