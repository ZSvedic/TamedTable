// #LLMCells — unit tests for the per-cell model choice. The regression this
// guards: with gpt-audio as the main model, cell calls must NOT fall back to
// the main model (gpt-audio rejects text-only requests: "This model requires
// that either input content or output modality contain audio").
import { describe, it, expect } from 'bun:test';
import { resolveCellModelId } from './index.ts';

describe('resolveCellModelId', () => {
  it('uses the default cell model for an Anthropic main model', () => {
    expect(resolveCellModelId('claude-sonnet-4-6')).toBe('claude-sonnet-4-5');
    expect(resolveCellModelId('claude-haiku-4-5')).toBe('claude-sonnet-4-5');
  });

  it('falls back to the provider text default, never the main model', () => {
    expect(resolveCellModelId('gpt-audio')).toBe('gpt-5.4-mini');
    expect(resolveCellModelId('gpt-5.5')).toBe('gpt-5.4-mini');
    expect(resolveCellModelId('gemini-3.5-flash')).toBe('gemini-3.5-flash');
    expect(resolveCellModelId('gemini-3.1-pro-preview')).toBe('gemini-3.5-flash');
  });

  it('honors an explicit cell model when it matches the main provider', () => {
    expect(resolveCellModelId('gpt-audio', 'gpt-5.5')).toBe('gpt-5.5');
    expect(resolveCellModelId('claude-sonnet-4-6', 'claude-haiku-4-5')).toBe('claude-haiku-4-5');
  });

  it('ignores a cross-provider explicit cell model', () => {
    expect(resolveCellModelId('gpt-audio', 'claude-haiku-4-5')).toBe('gpt-5.4-mini');
    expect(resolveCellModelId('gemini-3.5-flash', 'gpt-5.4-mini')).toBe('gemini-3.5-flash');
  });
});
