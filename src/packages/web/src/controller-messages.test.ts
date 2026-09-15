// #Analyze #WebUI: the chat reply for a committed request leads with the
// model's one-sentence summary when it gave one, above "Executed steps:".
import { describe, expect, it } from 'bun:test';
import type { RequestDebugInfo } from '@tamedtable/headless';
import { describeError, summarizeDebug } from './controller-messages.ts';

const base: RequestDebugInfo = {
  userRequest: 'Show only customers in the USA',
  turns: [{ ops: [], outcome: 'committed' }],
  expressions: [],
  steps: ['filter (js)'],
  cellSamples: [],
  modelCalls: [],
  inputTokens: 0,
  outputTokens: 0,
  elapsedMs: 0,
};

describe('summarizeDebug', () => {
  it('leads with the summary above the step list', () => {
    expect(summarizeDebug({ ...base, summary: 'Kept only the USA customers.' })).toBe(
      'Kept only the USA customers.\nExecuted steps:\n1. filter (js)',
    );
  });

  it('is unchanged without a summary', () => {
    expect(summarizeDebug(base)).toBe('Executed steps:\n1. filter (js)');
  });
});

describe('describeError', () => {
  it('turns an exhausted answer budget into a reportable sentence', () => {
    expect(describeError(new Error('Runner: answer budget exhausted'))).toEqual({
      message: "Couldn't answer that after 4 attempts. Try asking in a different way.",
      reportable: true,
    });
  });
});
