// #VoiceInput
// Turn the raw PCM a VAD turn carries into WAV bytes the patch turn can send.
// Pure, no deps. (Press-and-hold goes MediaRecorder → model-config's blobToWav;
// continuous voice starts from Float32 PCM, so it needs this.)

/** Float32 PCM (-1..1) → 16-bit PCM WAV bytes. Mono, caller's sample rate. */
export function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
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
