// #ModelConfig demo-only LLM calls — used by demo.tsx, not exported from the
// package. One text completion call and one spoken-query call per provider,
// issued straight from the browser with raw fetch (no SDK). The
// Anthropic call needs the `anthropic-dangerous-direct-browser-access` header;
// that is acceptable here because the key is the user's own, entered locally.

import type { ResolvedConfig } from './index.ts';

// This file ships only in the demo browser bundle, but the Node typecheck
// (no DOM lib) still covers it — declare the minimal Web Audio surface used.
interface DecodedAudio {
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}
declare const OfflineAudioContext: new (
  channels: number,
  length: number,
  sampleRate: number,
) => { decodeAudioData(buf: ArrayBuffer): Promise<DecodedAudio> };

const VOICE_PROMPT =
  "The user's query is spoken in the attached audio. Reply with ONLY a JSON " +
  'object — no markdown fences, no other text — of the shape ' +
  '{"transcript": "<verbatim transcript of the audio>", ' +
  '"answer": "<your answer to the query>"}.';

export interface VoiceReply {
  /** Verbatim transcript of the spoken query; empty when the model's reply
   *  could not be parsed as JSON. */
  transcript: string;
  answer: string;
}

/** Parse the model's JSON reply; a stray fence is tolerated. A reply that
 *  isn't valid JSON degrades to { transcript: '', answer: <raw text> }. */
function parseVoiceReply(raw: string): VoiceReply {
  const text = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  try {
    const parsed = JSON.parse(text) as { transcript?: unknown; answer?: unknown };
    if (typeof parsed.answer === 'string') {
      return {
        transcript: typeof parsed.transcript === 'string' ? parsed.transcript : '',
        answer: parsed.answer,
      };
    }
  } catch { /* fall through to the raw-text fallback */ }
  return { transcript: '', answer: raw };
}

function keyFor(cfg: ResolvedConfig): string {
  const key =
    cfg.provider === 'gemini' ? cfg.geminiKey :
    cfg.provider === 'openai' ? cfg.openaiKey :
    cfg.anthropicKey;
  if (!key) throw new Error(`No API key set for ${cfg.provider}.`);
  return key;
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${detail}`);
  }
  return res.json();
}

// ── Per-provider response shapes (only the fields we read) ─────────────────

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}
interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
}
interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
}

function geminiText(data: GeminiResponse): string {
  return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
}

async function callGemini(key: string, model: string, parts: unknown[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const text = geminiText((await post(url, {}, { contents: [{ parts }] })) as GeminiResponse);
  if (!text) throw new Error('Gemini returned no text.');
  return text;
}

async function callOpenAI(key: string, model: string, content: unknown, audio: boolean): Promise<string> {
  const data = (await post(
    'https://api.openai.com/v1/chat/completions',
    { authorization: `Bearer ${key}` },
    {
      model,
      messages: [{ role: 'user', content }],
      // `modalities` is only accepted by audio-capable models.
      ...(audio ? { modalities: ['text'] } : {}),
    },
  )) as OpenAIResponse;
  const text = (data.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('OpenAI returned no text.');
  return text;
}

async function callAnthropic(key: string, model: string, text: string): Promise<string> {
  const data = (await post(
    'https://api.anthropic.com/v1/messages',
    {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    { model, max_tokens: 1024, messages: [{ role: 'user', content: text }] },
  )) as AnthropicResponse;
  const out = (data.content ?? []).map((b) => b.text ?? '').join('').trim();
  if (!out) throw new Error('Anthropic returned no text.');
  return out;
}

// ── Public surface ──────────────────────────────────────────────────────────

/** One real completion round trip to the resolved provider/model. */
export async function sendTestPrompt(cfg: ResolvedConfig, text: string): Promise<string> {
  const key = keyFor(cfg);
  if (cfg.provider === 'gemini') return callGemini(key, cfg.model, [{ text }]);
  if (cfg.provider === 'openai') return callOpenAI(key, cfg.model, text, false);
  return callAnthropic(key, cfg.model, text);
}

/** One round trip with the spoken query as the request: audio + instructions
 *  in, a verbatim transcript and the model's answer out. Only valid for
 *  models with voiceInput: true (Gemini models and gpt-4o-audio-preview). */
export async function sendVoicePrompt(cfg: ResolvedConfig, audio: Blob): Promise<VoiceReply> {
  const key = keyFor(cfg);
  // Both providers accept base64 WAV; MediaRecorder output (webm/opus or
  // mp4/aac) is re-encoded so one format works everywhere.
  const wav = toBase64(await blobToWavBytes(audio));
  let raw: string;
  if (cfg.provider === 'gemini') {
    raw = await callGemini(key, cfg.model, [
      { text: VOICE_PROMPT },
      { inline_data: { mime_type: 'audio/wav', data: wav } },
    ]);
  } else if (cfg.provider === 'openai') {
    raw = await callOpenAI(key, cfg.model, [
      { type: 'text', text: VOICE_PROMPT },
      { type: 'input_audio', input_audio: { data: wav, format: 'wav' } },
    ], true);
  } else {
    throw new Error(`${cfg.provider} models do not support voice input.`);
  }
  return parseVoiceReply(raw);
}

// ── Audio re-encoding: recorded blob → 16 kHz mono PCM16 WAV ────────────────

async function blobToWavBytes(blob: Blob): Promise<Uint8Array> {
  const rate = 16_000;
  // An OfflineAudioContext decodes (and resamples to its own rate) without
  // needing a user gesture; the 1-frame length is irrelevant for decoding.
  const ctx = new OfflineAudioContext(1, 1, rate);
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());

  // Mix down to mono.
  const mono = new Float32Array(decoded.length);
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const data = decoded.getChannelData(ch);
    for (let i = 0; i < decoded.length; i++) mono[i]! += data[i]! / decoded.numberOfChannels;
  }

  // PCM16 WAV header + samples.
  const out = new DataView(new ArrayBuffer(44 + mono.length * 2));
  const ascii = (off: number, s: string): void => {
    for (let i = 0; i < s.length; i++) out.setUint8(off + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF'); out.setUint32(4, 36 + mono.length * 2, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);            // PCM
  out.setUint16(22, 1, true);            // mono
  out.setUint32(24, decoded.sampleRate, true);
  out.setUint32(28, decoded.sampleRate * 2, true);
  out.setUint16(32, 2, true);            // block align
  out.setUint16(34, 16, true);           // bits per sample
  ascii(36, 'data'); out.setUint32(40, mono.length * 2, true);
  for (let i = 0; i < mono.length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]!));
    out.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(out.buffer);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  // Chunked to keep the argument list within engine limits for long clips.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
