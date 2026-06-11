// #ModelConfig demo logic — referenced by demo.html as an external module so
// `bun build` bundles it (inline scripts are left unbundled and 404 on the
// imports). Mounts the real ModelChooser over local React state — the role
// WebController plays in the app — and shows the resolveConfig result live.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ALL_MODELS, resolveConfig, type Provider } from './index.ts';
import { ModelChooser } from './ModelChooser.tsx';

function Demo() {
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [keys, setKeys] = useState<Record<Provider, string>>({
    gemini: '', openai: '', anthropic: '',
  });
  const [expanded, setExpanded] = useState<Provider | null>(null);

  const resolved = resolveConfig({}, {
    provider,
    model,
    geminiKey: keys.gemini || null,
    openaiKey: keys.openai || null,
    anthropicKey: keys.anthropic || null,
  });

  return (
    <>
      <h2>ModelChooser</h2>
      <ModelChooser
        models={ALL_MODELS}
        provider={resolved.provider}
        model={resolved.model}
        keys={keys}
        expandedProvider={expanded}
        onProviderClick={(p) => {
          // Same semantics as WebController.clickProviderCard: expanding a
          // card selects that provider; collapsing changes nothing. A stale
          // stored model is coerced to the provider default by resolveConfig.
          if (expanded === p) {
            setExpanded(null);
          } else {
            setExpanded(p);
            setProvider(p);
          }
        }}
        onKeyChange={(p, value) => setKeys((prev) => ({ ...prev, [p]: value }))}
        onModelSelect={(id) => setModel(id)}
      />

      <h2>resolveConfig({'{}'}, stored)</h2>
      <pre id="out">{JSON.stringify(resolved, null, 2)}</pre>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Demo />);
