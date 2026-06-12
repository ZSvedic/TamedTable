// MOCK for review — proposed dual-selection ModelChooser (primary + secondary
// model per provider). Self-contained so it doesn't disturb the real
// ModelChooser/SettingsPanel until the UX is approved. Throwaway; delete after.
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ALL_MODELS, type ModelDef, type Provider } from './index.ts';

// ── light theme tokens (mirror ModelChooser defaults) ──
const ink = '#27272a', ink3 = '#71717a';
const surface = '#ffffff', surface2 = '#f7f7f8', surface3 = '#ececef';
const line = '#e0e0e3', line2 = '#cfcfd4';
const accent = '#4a8fd4', accentSoft = '#e9f2fb';
const ok = '#247a4d', okSoft = '#e4f4ea';
const fontUi = 'system-ui, sans-serif';
const fontMono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

interface ProviderMeta { id: Provider; name: string; tagline: string; envHint: string; keyPlaceholder: string; }
const PROVIDERS: ProviderMeta[] = [
  { id: 'gemini',    name: 'Google',    tagline: 'Gemini models', envHint: 'or set GEMINI_API_KEY in .env',    keyPlaceholder: 'AIza…' },
  { id: 'openai',    name: 'OpenAI',    tagline: 'GPT models',    envHint: 'or set OPENAI_API_KEY in .env',    keyPlaceholder: 'sk-…' },
  { id: 'anthropic', name: 'Anthropic', tagline: 'Claude models', envHint: 'or set ANTHROPIC_API_KEY in .env', keyPlaceholder: 'sk-ant-…' },
];

const radioKnob = (selected: boolean): ReactNode => (
  <span aria-hidden style={{
    flex: '0 0 auto', width: 14, height: 14, borderRadius: 7,
    border: `1.5px solid ${selected ? accent : line2}`,
    background: selected ? accent : 'transparent',
    boxShadow: selected ? `inset 0 0 0 2.5px ${surface}` : 'none',
  }} />
);

const voiceBadge = (hasVoice: boolean): ReactNode => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px',
    borderRadius: 12, fontFamily: fontUi, fontSize: 11.5, fontWeight: 500,
    background: hasVoice ? okSoft : surface3, color: hasVoice ? ok : ink3, flexShrink: 0, marginRight: 4,
  }}>{hasVoice ? '🎙 Voice' : 'No voice'}</span>
);

const voiceTag = (voice: boolean): ReactNode =>
  voice ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 10,
      fontFamily: fontUi, fontSize: 11.5, background: okSoft, color: ok, flexShrink: 0,
    }}>🎙 voice</span>
  ) : null;

// One expanded provider card showing the primary/secondary matrix.
function Card({ meta, expanded }: { meta: ProviderMeta; expanded: boolean }) {
  const models = ALL_MODELS.filter((m) => m.provider === meta.id);
  const providerHasVoice = models.some((m) => m.voiceInput);
  const [primary, setPrimary] = useState<string>(
    (models.find((m) => m.default) ?? models[0]!).id,
  );
  const [secondary, setSecondary] = useState<string>(
    (models.find((m) => (m as ModelDef & { secondaryDefault?: boolean }).secondaryDefault) ?? models[0]!).id,
  );
  const isProviderSelected = meta.id === 'anthropic'; // mock: Anthropic active

  const colHead = (label: string): ReactNode => (
    <span style={{ width: 56, textAlign: 'center', fontFamily: fontUi, fontSize: 11, fontWeight: 600, color: ink3, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</span>
  );

  return (
    <div style={{ border: `1px solid ${expanded ? accent : line}`, borderRadius: 10, background: surface, marginBottom: 8 }}>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        {radioKnob(isProviderSelected)}
        <span style={{ flex: 1 }}>
          <span style={{ fontFamily: fontUi, fontSize: 14, fontWeight: 600, color: ink, display: 'block' }}>{meta.name}</span>
          <span style={{ fontFamily: fontUi, fontSize: 11.5, color: ink3 }}>{meta.tagline}</span>
        </span>
        {voiceBadge(providerHasVoice)}
      </div>

      {expanded && (
        <div style={{ padding: '8px 14px 12px', borderTop: `1px solid ${line}` }}>
          {/* key field */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${line2}`, borderRadius: 6, padding: '6px 8px', background: surface2 }}>
            <input type="password" defaultValue="" placeholder={meta.keyPlaceholder}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: fontMono, fontSize: 12.5, color: ink }} />
            <span style={{ color: ink3, fontSize: 13 }}>👁</span>
          </div>
          <div style={{ fontFamily: fontMono, fontSize: 11.5, color: ink3, marginTop: 4 }}>{meta.envHint}</div>

          {/* role explainer */}
          <div style={{ fontFamily: fontUi, fontSize: 11.5, color: ink3, margin: '10px 0 6px', lineHeight: 1.4 }}>
            <b style={{ color: ink }}>Primary</b> writes the spec patch each turn{providerHasVoice ? ' (and handles voice input)' : ''}.{' '}
            <b style={{ color: ink }}>Secondary</b> fills per-row AI cells — pick a cheaper model for bulk work.
          </div>

          {/* column headers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px 4px' }}>
            {colHead('Primary')}
            {colHead('Secondary')}
            <span style={{ flex: 1 }} />
          </div>

          {/* matrix rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {models.map((m) => {
              const isP = m.id === primary, isS = m.id === secondary;
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 6px', borderRadius: 4,
                  background: isP ? accentSoft : 'transparent',
                }}>
                  <button type="button" onClick={() => setPrimary(m.id)} aria-label={`primary ${m.id}`}
                    style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'transparent', border: 0, cursor: 'pointer' }}>
                    {radioKnob(isP)}
                  </button>
                  <button type="button" onClick={() => setSecondary(m.id)} aria-label={`secondary ${m.id}`}
                    style={{ width: 56, display: 'flex', justifyContent: 'center', background: 'transparent', border: 0, cursor: 'pointer' }}>
                    {radioKnob(isS)}
                  </button>
                  <span style={{ fontFamily: fontMono, fontSize: 12.5, color: ink, flex: 1 }}>{m.id}</span>
                  {voiceTag(m.voiceInput)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Mock() {
  return (
    <div style={{ maxWidth: 480 }}>
      {PROVIDERS.map((meta) => <Card key={meta.id} meta={meta} expanded />)}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Mock />);
