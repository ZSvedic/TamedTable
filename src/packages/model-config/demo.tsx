// #ModelConfig demo logic — referenced by demo.html as an external module so
// `bun build` bundles it (inline scripts are left unbundled and 404 on the
// imports). Mounts the real ModelChooser — the role WebController plays in
// the app — and shows the resolveConfig result live. State seeds from, and
// every change persists to, the same localStorage blob the main app uses.
// Below the config sits a dev test-call harness issuing real provider calls.
// Spec: spec/packages/model-config/behavior.md § Demo page.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ALL_MODELS, KEY_FIELD, SUPPORTED_PREFIXES, modelFor,
  connectedProviders, defaultModel, defaultCellModel, detectProvider, resolveConfig,
  type Provider, type ResolvedConfig,
} from './index.ts';
import { ModelChooser, type ConnectedCard, type RoleRow } from './ModelChooser.tsx';
import { verifyKey, measureModel, type FetchLike } from './probe.ts';
import {
  readStoredConfig, writeStoredConfig,
  readStoredProbes, writeStoredProbes, type ProviderProbe,
} from './storage.ts';
import { sendTestPrompt, sendVoicePrompt } from './demo-llm.ts';

interface ActiveRecording {
  rec: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
}

/** The demo's chooser runs against a stub provider rather than a live one: its
 *  job is to exercise the component and the connect flow, and a demo page that
 *  billed real accounts (or needed real keys to show anything) would do
 *  neither. The test-call harness lower down is the part that talks to a real
 *  API with a real key. The stub accepts any key whose prefix is recognised and
 *  answers 100 in / 900 out tokens in 6.3 seconds, so every card's numbers are
 *  its catalogue prices rather than a made-up figure. */
function stubProbe(): { fetch: FetchLike; now: () => number } {
  let clock = 0;
  return {
    now: () => clock,
    fetch: async () => {
      clock += 6300;
      return new Response(
        JSON.stringify({
          data: { is_free_tier: false },
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
          content: [{ type: 'text', text: 'ok' }],
          choices: [{ message: { content: 'ok' } }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 900 },
          usage: {
            input_tokens: 100, output_tokens: 900,
            prompt_tokens: 100, completion_tokens: 900,
          },
        }),
        { status: 200, headers: { 'x-gemini-service-tier': 'standard' } },
      );
    },
  };
}

function Demo() {
  const seed = useRef(readStoredConfig()).current;
  const [stored, setStored] = useState<Partial<ResolvedConfig>>(seed);
  const [probes, setProbes] = useState<Partial<Record<Provider, ProviderProbe>>>(
    useRef(readStoredProbes()).current,
  );
  const [measuring, setMeasuring] = useState<Partial<Record<Provider, boolean>>>({});
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // The models follow the provider defaults — they are not user-selectable.
  const resolved = resolveConfig({}, {
    ...stored,
    model: defaultModel(stored.provider ?? 'gemini'),
    cellModel: defaultCellModel(stored.provider ?? 'gemini'),
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
      groqKey: resolved.groqKey,
      openrouterKey: resolved.openrouterKey,
      puterToken: resolved.puterToken,
    });
    writeStoredProbes(probes);
  }, [
    resolved.provider, resolved.model, resolved.cellModel, resolved.geminiKey,
    resolved.openaiKey, resolved.anthropicKey, resolved.groqKey, resolved.openrouterKey,
    resolved.puterToken,
    probes,
  ]);

  // ── Connect flow ──────────────────────────────────────────────────────────
  // Same shape as the web controller's: detect, verify (the gate), store and
  // select, then measure in the background so a slow provider never holds the
  // card back.

  const measureBoth = async (provider: Provider, key: string): Promise<void> => {
    setMeasuring((m) => ({ ...m, [provider]: true }));
    setProbes((p) => ({ ...p, [provider]: { tier: p[provider]?.tier ?? null } }));
    const stub = stubProbe();
    for (const role of ['primary', 'secondary'] as const) {
      const modelId = role === 'primary' ? defaultModel(provider) : defaultCellModel(provider);
      try {
        const measure = await measureModel(provider, key, modelId, stub);
        setProbes((p) => ({ ...p, [provider]: { ...p[provider]!, [role]: measure } }));
      } catch {
        // A working key with an unknown price is still a working key.
        setProbes((p) => ({ ...p, [provider]: { ...p[provider]!, [role]: null } }));
      }
    }
    setMeasuring((m) => ({ ...m, [provider]: false }));
  };

  const addKey = (): Promise<void> => addKeyWith(keyInput.trim());

  const addKeyWith = async (raw: string): Promise<void> => {
    const key = raw.trim();
    if (key === '' || busy) return;
    const provider = detectProvider(key);
    if (!provider) {
      setError(`Key not recognised. Supported prefixes: ${SUPPORTED_PREFIXES.join(', ')}.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { tier } = await verifyKey(provider, key, stubProbe());
      // Re-adding a connected provider replaces its key in place: the card has
      // no key field, so the alternative is deleting the card to fix a key.
      setStored((s) => ({ ...s, provider, [KEY_FIELD[provider]]: key }));
      setProbes((p) => ({ ...p, [provider]: { tier } }));
      setKeyInput('');
      void measureBoth(provider, key);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeProvider = (p: Provider): void => {
    setStored((s) => {
      const next = { ...s, [KEY_FIELD[p]]: null };
      // The default falls back to the last remaining card, or to none.
      if (s.provider === p) {
        const left = connectedProviders(resolveConfig({}, next));
        next.provider = left[left.length - 1] ?? 'gemini';
      }
      return next;
    });
    setProbes(({ [p]: _dropped, ...rest }) => rest);
  };

  const roleRow = (p: Provider, role: 'primary' | 'secondary'): RoleRow => {
    const model = role === 'primary' ? defaultModel(p) : defaultCellModel(p);
    const priced = modelFor(p, model);
    const speed = probes[p]?.[role];
    return {
      model,
      // Price is the catalogue's, per thousand tokens — never measured.
      inUsdPer1kTok: priced ? priced.inUsdPerMtok / 1000 : null,
      outUsdPer1kTok: priced ? priced.outUsdPerMtok / 1000 : null,
      speed: speed === undefined ? (measuring[p] ? 'measuring' : null) : speed,
    };
  };

  const connected: ConnectedCard[] = connectedProviders(resolved).map((p) => ({
    id: p,
    tier: probes[p]?.tier ?? null,
    voice: modelFor(p, defaultModel(p))?.voiceInput ?? false,
    primary: roleRow(p, 'primary'),
    secondary: roleRow(p, 'secondary'),
  }));

  // ── Test call state ───────────────────────────────────────────────────────

  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<ActiveRecording | null>(null);
  // Serialize release behind press: a quick tap must not fire stopMic before
  // getUserMedia resolves, or the recording would be left running.
  const startGate = useRef<Promise<void>>(Promise.resolve());

  const hasVoice = ALL_MODELS.some((m) => m.id === resolved.model && m.voiceInput);

  const send = async (): Promise<void> => {
    if (!query.trim() || sending) return;
    setSending(true);
    setResponse('…');
    try {
      setResponse(await sendTestPrompt(resolved, query.trim()));
    } catch (e) {
      setResponse(`Error: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  // Press-and-hold, matching the main app's mic: holding records, releasing
  // sends. Pointer capture keeps the release event even if it lands outside
  // the button.
  const startMic = async (): Promise<void> => {
    if (sending || recRef.current) return;
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
    setSending(true);
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
      setSending(false);
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
        connected={connected}
        selected={connected.length > 0 ? resolved.provider : null}
        keyInput={keyInput}
        error={error}
        busy={busy}
        byokHelpUrl="../../FAQ.html#byok"
        onKeyInputChange={(value) => {
          setKeyInput(value);
          // Typing clears the error — the user is already fixing it.
          if (error !== '') setError('');
        }}
        onAdd={() => void addKey()}
        onSelect={(p) => setStored((s) => ({ ...s, provider: p }))}
        onRemove={removeProvider}
        onPuterSignIn={() => {
          // No popup on a demo page: a stub token stands in for the one the
          // real sign-in mints, so the block still drives the connect path.
          setKeyInput('eyJhbGciOiJIUzI1NiJ9.demo');
          void addKeyWith('eyJhbGciOiJIUzI1NiJ9.demo');
        }}
        onRefresh={(p) => {
          const key = (resolved[KEY_FIELD[p]] as string | null) ?? '';
          if (key) void measureBoth(p, key);
        }}
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
          disabled={sending}
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
            disabled={sending}
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
          disabled={sending || !query.trim()}
          style={{ padding: '6px 12px', font: 'inherit', cursor: 'pointer' }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
      <pre id="tc-response" style={{ whiteSpace: 'pre-wrap', minHeight: '2.5rem' }}>{response}</pre>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Demo />);
