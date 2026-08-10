// #ModelConfig demo logic — referenced by demo.html as an external module so
// `bun build` bundles it (inline scripts are left unbundled and 404 on the
// imports). Mounts the real ModelChooser — the role WebController plays in
// the app — and shows the resolveConfig result live. State seeds from, and
// every change persists to, the same localStorage blob the main app uses.
// Below the config sits a dev test-call harness issuing real provider calls.
// Spec: spec/packages/model-config/behavior.md § Demo page.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ALL_MODELS, defaultModel, defaultCellModel, resolveConfig, type Provider } from './index.ts';
import { ModelChooser, type KeyTest } from './ModelChooser.tsx';
import { readStoredConfig, writeStoredConfig } from './storage.ts';
import { sendTestPrompt, sendVoicePrompt } from './demo-llm.ts';

interface PuterGlobal {
  auth?: { signIn?: () => Promise<unknown>; isSignedIn?: () => boolean };
}

interface ActiveRecording {
  rec: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
}

function Demo() {
  const stored = useRef(readStoredConfig()).current;
  const [provider, setProvider] = useState<Provider>(stored.provider ?? 'gemini');
  const [keys, setKeys] = useState<Record<Provider, string>>({
    puter: '',
    gemini: stored.geminiKey ?? '',
    openai: stored.openaiKey ?? '',
    anthropic: stored.anthropicKey ?? '',
    openrouter: stored.openrouterKey ?? '',
  });
  const [expanded, setExpanded] = useState<Provider | null>(null);
  const [keyTest, setKeyTest] = useState<KeyTest | null>(null);
  const [puterSignedIn, setPuterSignedIn] = useState(() => Boolean((globalThis as { puter?: PuterGlobal }).puter?.auth?.isSignedIn?.()));

  // Models are no longer user-selectable — they follow the provider defaults.
  // Feeding the provider's defaults as the stored model/cellModel keeps the
  // two roles pinned to those defaults whenever the provider changes.
  const resolved = resolveConfig({}, {
    provider,
    model: defaultModel(provider),
    cellModel: defaultCellModel(provider),
    geminiKey: keys.gemini || null,
    openaiKey: keys.openai || null,
    anthropicKey: keys.anthropic || null,
    openrouterKey: keys.openrouter || null,
  });

  // Persist every CHANGE to the blob the main app reads (and vice versa) — a
  // page load is not a change, so the mount run is skipped: writing on mount
  // would rewrite the blob unprompted and reset fields the demo doesn't
  // thread (alwaysRunAll) to resolveConfig's defaults. On a real change the
  // demo's fields are merged over the stored blob, so those fields survive.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    writeStoredConfig({
      ...readStoredConfig(),
      provider: resolved.provider,
      model: resolved.model,
      cellModel: resolved.cellModel,
      geminiKey: resolved.geminiKey,
      openaiKey: resolved.openaiKey,
      anthropicKey: resolved.anthropicKey,
      openrouterKey: resolved.openrouterKey,
    });
  }, [resolved.provider, resolved.model, resolved.cellModel, resolved.geminiKey, resolved.openaiKey, resolved.anthropicKey, resolved.openrouterKey]);

  // ── Test call state ───────────────────────────────────────────────────────

  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<ActiveRecording | null>(null);
  // Serialize release behind press: a quick tap must not fire stopMic before
  // getUserMedia resolves, or the recording would be left running.
  const startGate = useRef<Promise<void>>(Promise.resolve());

  const hasVoice = ALL_MODELS.some((m) => m.id === resolved.model && m.voiceInput);

  const signInPuter = async (): Promise<void> => {
    const auth = (globalThis as { puter?: PuterGlobal }).puter?.auth;
    if (!auth?.signIn) {
      setKeyTest({ provider: 'puter', state: 'error', message: 'Puter.js is not loaded.' });
      return;
    }
    try {
      await auth.signIn();
      setPuterSignedIn(true);
      setKeyTest({ provider: 'puter', state: 'ok', message: 'Signed in to Puter.js' });
    } catch (e) {
      const err = e as { msg?: unknown; message?: unknown };
      const detail = err.msg ?? err.message;
      setKeyTest({
        provider: 'puter',
        state: 'error',
        message: typeof detail === 'string' ? detail : detail === undefined
          ? JSON.stringify(e) || 'Puter.js sign-in was cancelled.'
          : JSON.stringify(detail),
      });
    }
  };

  const testProvider = async (p: Provider): Promise<void> => {
    setKeyTest({ provider: p, state: 'running', message: 'Testing…' });
    const started = Date.now();
    try {
      const answer = await sendTestPrompt({ ...resolved, provider: p, model: defaultModel(p), cellModel: defaultCellModel(p) }, 'Reply with OK.');
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      setKeyTest({ provider: p, state: 'ok', message: `${answer.slice(0, 40) || defaultCellModel(p)} answered in ${seconds}s` });
    } catch (e) {
      setKeyTest({ provider: p, state: 'error', message: (e as Error).message });
    }
  };

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

  // Press-and-hold, matching the main app's mic: holding records, releasing
  // sends. Pointer capture keeps the release event even if it lands outside
  // the button.
  const startMic = async (): Promise<void> => {
    if (busy || recRef.current) return;
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
  };

  const stopMic = async (): Promise<void> => {
    if (!recRef.current) return;
    const { rec, stream, chunks } = recRef.current;
    const audio = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      rec.stop();
    });
    stream.getTracks().forEach((t) => t.stop());
    recRef.current = null;
    setRecording(false);
    setBusy(true);
    setResponse('…');
    try {
      // One round trip: the audio is the query; the same call returns what
      // the model heard (→ query input) and its answer (→ response field).
      const reply = await sendVoicePrompt(resolved, audio);
      if (reply.transcript) setQuery(reply.transcript);
      setResponse(reply.answer);
    } catch (e) {
      setResponse(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const cancelMic = (): void => {
    const active = recRef.current;
    if (!active) return;
    active.rec.onstop = null;
    active.rec.stop();
    active.stream.getTracks().forEach((t) => t.stop());
    recRef.current = null;
    setRecording(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <h2>ModelChooser</h2>
      <ModelChooser
        models={ALL_MODELS}
        provider={resolved.provider}
        primaryModel={resolved.model}
        secondaryModel={resolved.cellModel}
        keys={keys}
        expandedProvider={expanded}
        byokHelpUrl="/TamedTable/BYOK-setup.html"
        changeModelsHelpUrl="../../FAQ.html#change-models"
        testState={keyTest}
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
        onPuterSignIn={() => void signInPuter()}
        puterSignedIn={puterSignedIn}
        onTestKey={(p) => void testProvider(p)}
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
          placeholder={hasVoice ? 'Type a query, or use the mic to speak one…' : 'Type a query…'}
          disabled={busy}
          style={{ flex: 1, padding: '6px 8px', font: 'inherit' }}
        />
        {hasVoice && (
          <button
            id="tc-mic"
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              startGate.current = startMic();
            }}
            onPointerUp={() => void startGate.current.then(stopMic)}
            onPointerCancel={() => void startGate.current.then(cancelMic)}
            disabled={busy}
            title={recording ? 'Release to send' : 'Hold to record a spoken query'}
            style={{
              padding: '6px 10px',
              font: 'inherit',
              cursor: 'pointer',
              background: recording ? '#dc2626' : undefined,
              color: recording ? '#fff' : undefined,
            }}
          >
            {recording ? '●' : '🎙'}
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
