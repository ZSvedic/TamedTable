// #ModelConfig demo logic — referenced by demo.html as an external module so
// `bun build` bundles it (inline scripts are left unbundled and 404 on ./index.ts).
import { ALL_MODELS, resolveConfig, type Provider } from './index.ts';

const tbody = document.querySelector('#models tbody')!;
tbody.innerHTML = ALL_MODELS.map((m) =>
  `<tr><td>${m.id}</td><td>${m.name}</td><td>${m.provider}</td><td>${m.voiceInput ? '✓' : ''}</td></tr>`,
).join('');

const fields = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'TAMEDTABLE_MODEL'];
const out = document.getElementById('out')!;
const val = (id: string) =>
  (document.getElementById(id) as HTMLInputElement).value.trim() || undefined;

function render() {
  const env: Record<string, string | undefined> = {};
  for (const f of fields) env[f] = val(f);
  const stored: { provider?: Provider; model?: string } = {};
  const p = val('storedProvider');
  if (p) stored.provider = p as Provider;
  if (val('storedModel')) stored.model = val('storedModel');
  out.textContent = JSON.stringify(resolveConfig(env, stored), null, 2);
}
for (const el of document.querySelectorAll('input')) el.addEventListener('input', render);
render();
