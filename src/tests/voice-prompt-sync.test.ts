// #VoiceInput
// Guard: the voice instruction in @tamedtable/voice-input is a byte-identical
// copy of spec/prompt-app-edit.md § VOICE_PROMPT. The package is zero-dep and
// browser-safe, so unlike headless it can't read the spec file at init — this
// test is what makes the spec section canonical. The text is
// fingerprint-load-bearing: a drifted copy orphans every voice cassette.

import { describe, it, expect } from 'bun:test';
import { VOICE_INSTRUCTION } from '@tamedtable/voice-input';

function section(md: string, name: string): string {
  const m = md.match(new RegExp(`^## ${name}\\s*$([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
  if (!m) throw new Error(`spec/prompt-app-edit.md: missing "## ${name}" section`);
  return m[1]!.trim();
}

describe('voice prompt sync', () => {
  it('VOICE_INSTRUCTION matches spec/prompt-app-edit.md § VOICE_PROMPT', async () => {
    const md = await Bun.file('../spec/prompt-app-edit.md').text();
    expect(
      VOICE_INSTRUCTION,
      'voice-input VOICE_INSTRUCTION drifted from spec/prompt-app-edit.md § VOICE_PROMPT — sync them (and re-record voice cassettes if the wording really must change)'
    ).toBe(section(md, 'VOICE_PROMPT'));
  });
});
