import { afterAll, expect, test } from 'bun:test';
import { h, mount, unmountAll, setupReact } from '../../tests/ui-dom-harness.tsx';
import { ALL_MODELS, defaultCellModel, defaultModel } from './index.ts';
setupReact(await import('react'), await import('react-dom/client'));
const { ModelChooser } = await import('./ModelChooser.tsx');
afterAll(unmountAll);

test('connected card shows catalogue prices, speed, refresh immediately before delete', () => {
  const { el } = mount(h(ModelChooser, { models:ALL_MODELS, provider:'gemini', primaryModel:defaultModel('gemini'), secondaryModel:defaultCellModel('gemini'), keys:{gemini:'AIza-ok',openai:'',anthropic:'',openrouter:'',groq:''}, measurements:{gemini:{latencySec:9.4,measuredAt:1}}, onAddKey:async()=>{}, onSelect:()=>{}, onRemove:()=>{}, onRefresh:async()=>{}, onConnectPuter:async()=>{} }));
  expect(el.textContent).toContain('$0.0015 in / $0.0075 out per 1000 tokens · ~9.4 sec');
  const buttons=el.querySelectorAll('[data-mc-provider="gemini"] button');
  expect(buttons[0]?.getAttribute('aria-label')).toContain('Refresh');
  expect(buttons[1]?.getAttribute('aria-label')).toContain('Remove');
});
