// #LLMCells — unit tests for the per-cell model choice. The regression this
// guards: cell calls are text-only and must share the main model's provider, so
// a cross-provider cell model must be coerced to the main provider's text
// default rather than used as-is.
import { describe, it, expect } from 'bun:test';
import { resolveCellModelId } from './index.ts';

describe('resolveCellModelId', () => {
  it('uses the default cell model for a Gemini main model', () => {
    expect(resolveCellModelId('gemini-3.5-flash')).toBe('gemini-3.1-flash-lite');
    expect(resolveCellModelId('gemini-3.1-pro-preview')).toBe('gemini-3.1-flash-lite');
  });

  it('falls back to the provider text default for a cross-provider cell model', () => {
    expect(resolveCellModelId('gpt-5.5')).toBe('gpt-5.4-mini');
    expect(resolveCellModelId('claude-sonnet-4-6')).toBe('claude-haiku-4-5');
    expect(resolveCellModelId('claude-haiku-4-5')).toBe('claude-haiku-4-5');
  });

  it('honors an explicit cell model when it matches the main provider', () => {
    expect(resolveCellModelId('gpt-5.5', 'gpt-5.4-mini')).toBe('gpt-5.4-mini');
    expect(resolveCellModelId('claude-sonnet-4-6', 'claude-haiku-4-5')).toBe('claude-haiku-4-5');
    expect(resolveCellModelId('gemini-3.5-flash', 'gemini-3.5-flash')).toBe('gemini-3.5-flash');
  });

  it('ignores a cross-provider explicit cell model', () => {
    expect(resolveCellModelId('gpt-5.5', 'claude-haiku-4-5')).toBe('gpt-5.4-mini');
    expect(resolveCellModelId('gemini-3.5-flash', 'gpt-5.4-mini')).toBe('gemini-3.1-flash-lite');
  });
});
