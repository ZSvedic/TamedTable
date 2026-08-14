// #ModelConfig: browser-only audio re-encoding entry point.
// MediaRecorder output (webm/opus on Chrome, mp4/aac on Safari) → 16 kHz mono
// PCM16 WAV: the one format every voice-capable provider accepts (OpenAI's
// input_audio takes only wav/mp3; Gemini takes wav among others). Used by the
// web app's recording port and the demo's spoken-query call.

// This file is part of the Node typecheck (no DOM lib), declare the minimal
// Web Audio surface used.
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

/** Decode a recorded audio blob and re-encode it as 16 kHz mono PCM16 WAV. */
export async function blobToWavBytes(blob: Blob): Promise<Uint8Array> {
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
