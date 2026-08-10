import { expect, test } from 'bun:test';
import { createHeadlessRunner } from './index.ts';

test('host model callbacks handle both patch-turn and AI-cell calls', async () => {
  let patchCalls = 0;
  let cellCalls = 0;
  const runner = createHeadlessRunner({
    model: 'gemini-3.6-flash',
    cellModel: 'gemini-3.1-flash-lite',
    callPatch: async (_prompt, system) => {
      patchCalls++;
      expect(system).toContain('JSON Patch');
      return {
        ops: [{
          op: 'add',
          path: '/transformations/-',
          value: { kind: 'mutate', columns: 'clean', value: { llm: 'clean {raw}' } },
        }],
      };
    },
    callCells: async (prompts, model) => {
      cellCalls++;
      expect(model).toBe('gemini-3.1-flash-lite');
      return prompts.map(() => 'Clean');
    },
  });
  await runner.loadParsed([{ raw: ' dirty ' }], { columns: [{ id: 'raw' }], transformations: [] });
  await runner.request('clean raw');

  expect(patchCalls).toBe(1);
  expect(cellCalls).toBe(1);
  expect(runner.currentRows()).toEqual([{ raw: ' dirty ', clean: 'Clean' }]);
});
