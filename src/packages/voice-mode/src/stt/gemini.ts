// #VoiceMode
// Transcribe a VAD-captured clip by sending the audio straight to Gemini Flash —
// no separate speech-to-text vendor. The clip rides as inline base64 WAV on a
// generateContent call with the user's own key (BYOK), so it works for any
// provider key the user already has and keeps the no-backend promise.
//
// The point of going through an LLM instead of a plain STT API: it takes a
// recognition *context*. We pass a list of likely words (column names, the
// commands the app understands, domain terms) and ask the model to prefer those
// spellings — so "DOB" or "bananas" come back right instead of "dee oh bee".

import type { STTProvider, AudioSegment } from './types.ts';
import { encodeWav, bytesToBase64 } from '../wav.ts';

export interface GeminiOptions {
  /** Google AI (Gemini) API key. Stays in the browser; sent only to Google. */
  apiKey: string;
  /** Model id. Defaults to gemini-2.5-flash; override to match your access. */
  model?: string;
  /** Called once per turn to build the recognition context — a list of words
   *  the speaker is likely to use. Returned fresh each turn so it can track the
   *  current table (columns, selected cell) as it changes. */
  context?: () => string;
  /** Override the API base, e.g. for a proxy. Defaults to Google's endpoint. */
  baseUrl?: string;
}

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function geminiSTT(opts: GeminiOptions): STTProvider {
  const model = opts.model?.trim() || DEFAULT_MODEL;
  const base = opts.baseUrl ?? DEFAULT_BASE;

  return {
    name: 'gemini-flash',
    async transcribe(audio: AudioSegment): Promise<string> {
      const b64 = bytesToBase64(encodeWav(audio.pcm, audio.sampleRate));
      const keywords = opts.context?.().trim();
      const instruction = [
        'You are the speech-to-text engine of a voice-controlled app.',
        'Transcribe the spoken command in the audio verbatim, as plain lowercase text.',
        keywords
          ? `The speaker is likely to use these words — prefer these spellings: ${keywords}.`
          : '',
        'Output only the transcript: no quotes, no labels, no extra words.',
      ]
        .filter(Boolean)
        .join(' ');

      const url = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: instruction }, { inline_data: { mime_type: 'audio/wav', data: b64 } }] },
          ],
          generationConfig: { temperature: 0 },
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Gemini transcription failed (${res.status}): ${detail.slice(0, 200)}`);
      }
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? '')
        .join('')
        .trim();
      return text;
    },
  };
}
