// #ModelConfig demo logic — referenced by demo.html as an external module so
// `bun build` bundles it (inline scripts are left unbundled and 404 on the
// imports). Mounts the real ModelChooser — the role WebController plays in
// the app — and shows the resolveConfig result live. State seeds from, and
// every change persists to, the same localStorage blob the main app uses.
// Below the config sits a dev test-call harness issuing real provider calls.
// Spec: spec/packages/model-config/behavior.md § Demo page.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ALL_MODELS, resolveConfig, type Provider } from './index.ts';
import { ModelChooser } from './ModelChooser.tsx';
import { readStoredConfig, writeStoredConfig } from './storage.ts';
import { sendTestPrompt, transcribeAudio } from './demo-llm.ts';

interface ActiveRecording {
  rec: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
}

function Demo() {
  const stored = useRef(readStoredConfig()).current;
  const [provider, setProvider] = useState<Provider>(stored.provider ?? 'anthropic');
  const [model, setModel] = useState(stored.model ?? 'claude-sonnet-4-6');
  const [keys, setKeys] = useState<Record<Provider, string>>({
    gemini: stored.geminiKey ?? '',
    openai: stored.openaiKey ?? '',
    anthropic: stored.anthropicKey ?? '',
  });
  const [expanded, setExpanded] = useState<Provider | null>(null);

  const resolved = resolveConfig({}, {
    provider,
    model,
    geminiKey: keys.gemini || null,
    openaiKey: keys.openai || null,
    anthropicKey: keys.anthropic || null,
  });

  // Persist every change to the blob the main app reads (and vice versa).
  useEffect(() => {
    writeStoredConfig(resolved);
  }, [resolved.provider, resolved.model, resolved.geminiKey, resolved.openaiKey, resolved.anthropicKey]);

  // ── Test call state ───────────────────────────────────────────────────────

  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<ActiveRecording | null>(null);

  const hasVoice = ALL_MODELS.some((m) => m.id === resolved.model && m.voiceInput);

  const send = async (): Promise<void> => {
    if (!query.trim() || busy) return;
    setBusy(true);
    setResponse('…');
    try {
      setResponse(await sendTestPrompt(resolved, query.trim()));
    } catch (e) {
      setResponse(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = async (): Promise<void> => {
    if (busy) return;
    if (!recRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks: Blob[] = [];
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        rec.start();
        recRef.current = { rec, stream, chunks };
        setRecording(true);
      } catch (e) {
        setResponse(`Error: could not start recording: ${(e as Error).message}`);
      }
      return;
    }
    const { rec, stream, chunks } = recRef.current;
    const audio = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      rec.stop();
    });
    stream.getTracks().forEach((t) => t.stop());
    recRef.current = null;
    setRecording(false);
    setBusy(true);
    try {
      setQuery(await transcribeAudio(resolved, audio));
    } catch (e) {
      setResponse(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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

      <h2>Test call — {resolved.model}</h2>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          id="tc-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
          placeholder={hasVoice ? 'Type a query or dictate it…' : 'Type a query…'}
          disabled={busy}
          style={{ flex: 1, padding: '6px 8px', font: 'inherit' }}
        />
        {hasVoice && (
          <button
            id="tc-mic"
            type="button"
            onClick={() => void toggleMic()}
            disabled={busy}
            title={recording ? 'Stop and transcribe' : 'Record a query'}
            style={{
              padding: '6px 10px',
              font: 'inherit',
              cursor: 'pointer',
              background: recording ? '#dc2626' : undefined,
              color: recording ? '#fff' : undefined,
            }}
          >
            {recording ? '■' : '🎙'}
          </button>
        )}
        <button
          id="tc-send"
          type="button"
          onClick={() => void send()}
          disabled={busy || !query.trim()}
          style={{ padding: '6px 12px', font: 'inherit', cursor: 'pointer' }}
        >
          {busy ? '…' : 'Send'}
        </button>
      </div>
      <pre id="tc-response" style={{ whiteSpace: 'pre-wrap', minHeight: '2.5rem' }}>{response}</pre>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Demo />);
