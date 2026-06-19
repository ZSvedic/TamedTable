// #VoicePort
// Voice input: build the instruction text that accompanies the
// spoken audio, and record audio in the browser.
//
// There is no transcription step and no separate voice network call: the
// recorded audio rides along on the ordinary patch turn as a file part (see
// Runner.request's `audio` option in spec/code-contract.md), so a voice
// request costs exactly as many model calls as a typed one. This module stays
// DOM-free at import time: the MediaRecorder is only touched inside
// browserVoicePort(), which the browser calls at runtime and tests never load.

/** What the table looks like when the user speaks — added to the instruction
 *  text so spoken references ("this column", "the selected cell") resolve
 *  against the view. */
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

/** Map an audio filename's extension to the MIME type the voice patch turn
 *  sends. Shared by the test mic stub and the tutorial `play-audio` step so a
 *  replayed tour request fingerprints identically to the recorded voice turn. */
export function audioMediaType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
  switch (ext) {
    case 'm4a': return 'audio/mp4';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'webm': return 'audio/webm';
    default: throw new Error(`unsupported audio extension on "${filename}"`);
  }
}

/** Build the deterministic instruction text sent next to the audio on the
 *  patch turn. Pure — no network, no DOM — so it is unit- and
 *  Gherkin-testable. */
export function buildVoicePrompt(ctx: VoiceContext): string {
  const lines = [
    "The user's request is spoken in the attached audio clip. Listen to it",
    'and carry out that request directly — there is no written request text.',
    'Also set the `transcript` argument of apply_spec_patch to a verbatim',
    'transcript of the audio.',
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
