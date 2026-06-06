// #VoiceInput
// Voice input for the web UI: build the Gemini prompt from table context, make
// the single audio→text round trip, and record audio in the browser.
//
// The whole feature is one Gemini call — no separate speech-to-text step. The
// returned text is fed into the ordinary chat pipeline, so undo / history /
// replay all keep working. This module stays DOM-free at import time: the
// MediaRecorder is only touched inside browserVoicePort(), which the browser
// calls at runtime and tests never load.

import type { FetchLike } from './ports.ts';

/** What the table looks like when the user speaks — handed to Gemini so spoken
 *  references ("this column", "the selected cell") resolve against the view. */
export interface VoiceContext {
  filename: string;
  columns: string[];
  selectedCell?: { col: string; row: number; value: string };
}

/** The recording surface. The browser implementation wraps MediaRecorder;
 *  tests inject a stub returning a fixed Blob. */
export interface VoicePort {
  startRecording(): Promise<void>;
  stopRecording(): Promise<Blob>;
  cancelRecording(): void;
}

/** Build the deterministic Gemini prompt from the table context. Pure — no
 *  network, no DOM — so it is unit- and Gherkin-testable. */
export function buildVoicePrompt(ctx: VoiceContext): string {
  const lines = [
    'You are the voice front-end of TamedTable, a tool that edits a table from',
    'natural-language requests. Listen to the attached audio and write the',
    "user's request as a single, clear table instruction (e.g. \"normalize phone",
    'numbers", "sort by date descending"). Reply with only that request text —',
    'no preamble, no quotes, no explanation.',
    '',
    'Current table context:',
    `- File: ${ctx.filename}`,
    `- Columns: ${ctx.columns.join(', ')}`,
  ];
  if (ctx.selectedCell) {
    const { col, row, value } = ctx.selectedCell;
    lines.push(`- Selected cell: column "${col}", row ${row + 1}, value ${JSON.stringify(value)}`);
  }
  return lines.join('\n');
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Base64-encode bytes in either a browser or a Node/Bun runtime. */
function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

/** One round trip: audio + prompt → Gemini → request text. Raw fetch, no SDK
 *  and no new npm dependency. `fetchImpl` is the cassette hook in tests. */
export async function callGeminiVoice(
  key: string,
  model: string,
  audio: Blob,
  prompt: string,
  signal?: AbortSignal,
  fetchImpl?: FetchLike,
): Promise<string> {
  const doFetch: FetchLike = fetchImpl ?? ((input, init) => fetch(input, init));
  const bytes = new Uint8Array(await audio.arrayBuffer());
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: audio.type || 'audio/webm', data: toBase64(bytes) } },
        ],
      },
    ],
  });

  const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await doFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    signal,
  });
  if (!res.ok) {
    throw new Error(`Gemini voice request failed: HTTP ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as GeminiResponse;
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini voice request returned no text.');
  return text;
}
