// TamedTable — clickable prototype of the current product.
// The full three-region shell wired with real state: open a sample, type or
// hold-to-speak a request, watch AI cells fill (pending pulse → cellHi flash →
// cellHi2 settle), undo/redo, save, switch themes. All visuals come from
// components.jsx (the ui-kit mirror) and TT_* tokens — nothing hardcoded.

const { useState: useStateP, useEffect: useEffectP, useRef: useRefP } = React;

// ── Command matching ──────────────────────────────────────────────────────
// Returns a descriptor for the request, or null for the fallback reply.
function matchCommand(text) {
  const lc = text.trim().toLowerCase();
  if (!lc) return null;
  const wantsFilter = /(keep|filter|only).*(score|rows)/.test(lc) || /score\s*(≥|>=|at least|above)/.test(lc);
  const wantsCountry = /country/.test(lc);
  const m = lc.match(/(\d+(?:\.\d+)?)/);
  const threshold = m ? parseFloat(m[1]) : 8;
  if (wantsFilter && wantsCountry) return { kind: 'filter+ai', threshold };
  if (wantsCountry) return { kind: 'ai' };
  if (wantsFilter) return { kind: 'filter', threshold };
  if (/normali[sz]e.*phone|e\.?164/.test(lc)) return { kind: 'normalize' };
  if (/drop|remove|dedup/.test(lc) && /duplicate|dupes?/.test(lc)) return { kind: 'dedupe' };
  if (/title ?case|capitali[sz]e/.test(lc)) return { kind: 'titlecase' };
  const sort = lc.match(/sort\s+(?:by\s+)?(\w+)(\s+desc)?/);
  if (sort) return { kind: 'sort', column: sort[1], desc: !!sort[2] };
  return null;
}

function normalizePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  const hasPlus = s.startsWith('+');
  const digits = s.replace(/[^\d]/g, '');
  if (digits.length === 0) return null;
  if (hasPlus) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits;
}

function titleCaseP(s) {
  return String(s || '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
}

function sleepP(ms) { return new Promise((res) => setTimeout(res, ms)); }

function makeDebug(userRequest, ops, cellSamples, llmCalls) {
  return {
    userRequest,
    modelCalls: [{ model: 'gemini-3.5-flash', calls: 1 }]
      .concat(llmCalls ? [{ model: 'gemini-3.5-flash', calls: llmCalls }] : []),
    inputTokens: 1800 + Math.floor(Math.random() * 900),
    outputTokens: 240 + Math.floor(Math.random() * 300),
    elapsedMs: 2400 + Math.floor(Math.random() * 2200),
    turns: [{ outcome: 'ok', ops }],
    cellSamples: cellSamples || [],
  };
}

// ── Root app ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 14;
const THEME_KEY = 'tt-theme';

function InteractiveApp() {
  const [theme, setTheme] = useStateP(() => localStorage.getItem(THEME_KEY) || 'light');
  useEffectP(() => { localStorage.setItem(THEME_KEY, theme); }, [theme]);
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  useEffectP(() => {
    document.body.style.background = t.bg;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // table state
  const [loaded, setLoaded] = useStateP(false);
  const [fileName, setFileName] = useStateP(null);
  const [cols, setCols] = useStateP(SAMPLE_COLS);
  const [colWidths, setColWidths] = useStateP(COL_WIDTHS);
  const [rows, setRows] = useStateP([]);
  const [page, setPage] = useStateP(1);
  const [selection, setSelection] = useStateP(null);
  const [editing, setEditing] = useStateP(null);
  const [editDraft, setEditDraft] = useStateP('');
  const [status, setStatus] = useStateP('idle');

  // history
  const [undoStack, setUndoStack] = useStateP([]);
  const [redoStack, setRedoStack] = useStateP([]);
  const snapshot = () => ({ cols, rows, colWidths });
  const pushUndo = () => { setUndoStack((s) => [...s, snapshot()]); setRedoStack([]); };
  const restore = (snap) => { setCols(snap.cols); setRows(snap.rows); setColWidths(snap.colWidths); setPage(1); };

  // chat state
  const [messages, setMessages] = useStateP([]);
  const [draft, setDraft] = useStateP('');
  const [streaming, setStreaming] = useStateP(false);
  const [requestCount, setRequestCount] = useStateP(0);
  const [micStatus, setMicStatus] = useStateP('idle');
  const msgId = useRefP(1);
  const cancelRef = useRefP(false);
  const chatScroll = useRefP(null);
  useEffectP(() => {
    const el = chatScroll.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  // AI-cell run state: { colIdx, filled, total, settled }
  const [aiRun, setAiRun] = useStateP(null);

  // overlays
  const [settingsOpen, setSettingsOpen] = useStateP(false);
  const [tutorialOpen, setTutorialOpen] = useStateP(false);
  const [dialog, setDialog] = useStateP({ open: false, url: '', error: null, loading: false });
  const [toasts, setToasts] = useStateP([]);
  const toastId = useRefP(1);

  // settings state
  const [provider, setProvider] = useStateP('gemini');
  const [expandedProvider, setExpandedProvider] = useStateP('gemini');
  const [primaryModel, setPrimaryModel] = useStateP('gemini-3.5-flash');
  const [secondaryModel, setSecondaryModel] = useStateP('gemini-3.5-flash');
  const [keys, setKeys] = useStateP({ gemini: '', openai: '', anthropic: '' });

  // tutorial state
  const [tutActive, setTutActive] = useStateP(false);
  const [tutScenario, setTutScenario] = useStateP(TUTORIAL_SCENARIOS[0]);
  const [tutStep, setTutStep] = useStateP(1);
  const TUT_STEPS = [
    'Open the sample file customers.csv with Open URL… in the toolbar.',
    'Type “keep rows with Score ≥ 8” into the chat input and press Enter.',
    'Ask for an AI column: “add a Country column from each phone number”.',
    'Watch the new cells fill — fresh values flash, pending ones pulse.',
    'Use Undo (or type :undo) to step back, then :save to export.',
  ];

  const addToast = (kind, message) => {
    const id = toastId.current++;
    setToasts((ts) => [...ts, { id, kind, message }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500);
  };
  const addMsg = (role, text, debug) => {
    setMessages((ms) => [...ms, { id: msgId.current++, role, text, debug }]);
  };

  // ── loading ─────────────────────────────────────────────────────────────
  const loadSample = (name) => {
    setCols(SAMPLE_COLS);
    setColWidths(COL_WIDTHS);
    setRows(SAMPLE_ROWS.map((r) => r.slice()));
    setFileName(name);
    setLoaded(true);
    setPage(1);
    setSelection(null);
    setUndoStack([]);
    setRedoStack([]);
    setStatus('idle');
    addToast('info', `Loaded ${name} (20 rows × 6 cols).`);
  };

  const submitUrl = async (url) => {
    setDialog((d) => ({ ...d, loading: true, error: null }));
    await sleepP(700);
    const sample = SAMPLE_FILES.find((s) => url === s.url || url.endsWith(s.name));
    if (sample) {
      setDialog({ open: false, url: '', error: null, loading: false });
      loadSample(sample.name);
    } else {
      setDialog((d) => ({
        ...d, loading: false,
        error: 'Could not fetch the URL — the server did not allow cross-origin requests. (In this prototype, only the bundled samples load.)',
      }));
    }
  };

  // ── transformations ─────────────────────────────────────────────────────
  const applyNormalize = (rs) => {
    const pi = cols.indexOf('Phone');
    if (pi < 0) return { rs, n: 0 };
    let n = 0;
    const out = rs.map((r) => {
      const c = r.slice();
      const v = normalizePhone(c[pi]);
      if (v !== c[pi]) n++;
      c[pi] = v == null ? '' : v;
      return c;
    });
    return { rs: out, n };
  };

  const runAiColumn = async (baseRows, baseCols, userText, opsSoFar, preface) => {
    const pi = baseCols.indexOf('Phone');
    const colIdx = baseCols.length;
    const newCols = [...baseCols, 'Country'];
    const values = baseRows.map((r) => countryOf(r[pi]));
    let cur = baseRows.map((r) => [...r, null]);
    setCols(newCols);
    setColWidths((w) => [...w.slice(0, baseCols.length), 110]);
    setRows(cur);
    setAiRun({ colIdx, filled: 0, total: cur.length });
    for (let i = 0; i < cur.length; i++) {
      if (cancelRef.current) {
        setAiRun(null);
        addMsg('assistant', `Stopped after filling ${i} of ${cur.length} Country cells.`);
        return false;
      }
      await sleepP(170);
      cur = cur.map((r, ri) => (ri === i ? [...r.slice(0, colIdx), values[i]] : r));
      setRows(cur);
      setAiRun({ colIdx, filled: i + 1, total: cur.length });
    }
    await sleepP(900);
    setAiRun(null);
    const samples = [0, 1, 2].filter((i) => i < cur.length).map((i) => ({ in: cur[i][pi], out: values[i] }));
    addMsg('assistant',
      `${preface}Added Country — ${cur.length} cells filled by ${secondaryModel}.`,
      makeDebug(userText, opsSoFar.concat([{ op: 'addColumn', name: 'Country', kind: 'llm', prompt: 'country of {Phone}' }]),
        [{ column: 'Country', samples }], cur.length));
    return true;
  };

  const handleSend = async (textArg) => {
    const text = (textArg != null ? textArg : draft).trim();
    if (!text || streaming) return;
    setDraft('');

    // colon commands
    if (text === ':undo') { doUndo(); return; }
    if (text === ':redo') { doRedo(); return; }
    if (text === ':save') { doSave(); return; }
    if (text === ':save-flow') { doSaveFlow(); return; }

    addMsg('user', text);
    if (!loaded) {
      addMsg('assistant', 'Error: No table is loaded. Open a file or a sample first.');
      return;
    }
    const cmd = matchCommand(text);
    if (!cmd) {
      addMsg('assistant', 'Error: I could not map that to a transformation. Try “normalize phone numbers”, “keep rows with Score ≥ 8”, “add a Country column”, “drop duplicate emails”, or “sort by Name”.');
      return;
    }

    pushUndo();
    setStreaming(true);
    setStatus('running');
    cancelRef.current = false;
    await sleepP(900);
    if (cancelRef.current) { setStreaming(false); setStatus('idle'); addMsg('assistant', 'Stopped.'); return; }

    let ok = true;
    if (cmd.kind === 'normalize') {
      const { rs, n } = applyNormalize(rows);
      setRows(rs);
      const empties = rs.filter((r) => r[cols.indexOf('Phone')] === '').length;
      addMsg('assistant',
        `Normalized ${n} phone numbers to E.164.${empties ? ` ${empties} cell${empties === 1 ? ' was' : 's were'} empty and stayed null.` : ''}`,
        makeDebug(text, [{ op: 'normalize', column: 'Phone', format: 'E.164' }],
          [{ column: 'Phone', samples: [{ in: '(415) 555-0142', out: '+14155550142' }, { in: '415.555.0188', out: '+14155550188' }] }]));
    } else if (cmd.kind === 'filter') {
      const si = cols.indexOf('Score');
      const kept = rows.filter((r) => parseFloat(r[si]) >= cmd.threshold);
      setRows(kept);
      setPage(1);
      addMsg('assistant', `Kept ${kept.length} of ${rows.length} rows (Score ≥ ${cmd.threshold}).`,
        makeDebug(text, [{ op: 'filter', expr: `Score >= ${cmd.threshold}` }]));
    } else if (cmd.kind === 'ai') {
      ok = await runAiColumn(rows, cols, text, [], '');
    } else if (cmd.kind === 'filter+ai') {
      const si = cols.indexOf('Score');
      const kept = rows.filter((r) => parseFloat(r[si]) >= cmd.threshold);
      setPage(1);
      ok = await runAiColumn(kept, cols, text,
        [{ op: 'filter', expr: `Score >= ${cmd.threshold}` }],
        `Kept ${kept.length} of ${rows.length} rows (Score ≥ ${cmd.threshold}). `);
    } else if (cmd.kind === 'dedupe') {
      const ei = cols.indexOf('Email');
      const seen = new Set();
      const out = rows.filter((r) => {
        const k = String(r[ei]).toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setRows(out);
      addMsg('assistant', `Removed ${rows.length - out.length} duplicate email${rows.length - out.length === 1 ? '' : 's'} — ${out.length} rows remain.`,
        makeDebug(text, [{ op: 'dedupe', column: 'Email' }]));
    } else if (cmd.kind === 'titlecase') {
      const ni = cols.indexOf('Name');
      setRows(rows.map((r) => { const c = r.slice(); c[ni] = titleCaseP(c[ni]); return c; }));
      addMsg('assistant', `Converted ${rows.length} names to Title Case.`,
        makeDebug(text, [{ op: 'map', column: 'Name', fn: 'titleCase' }]));
    } else if (cmd.kind === 'sort') {
      const ci = cols.findIndex((c) => c.toLowerCase() === cmd.column);
      if (ci < 0) {
        addMsg('assistant', `Error: No column named “${cmd.column}”. Columns: ${cols.join(', ')}.`);
        ok = false;
        setUndoStack((s) => s.slice(0, -1));
      } else {
        const numeric = rows.every((r) => r[ci] === '' || !isNaN(parseFloat(r[ci])));
        const sorted = rows.slice().sort((a, b) => {
          const x = numeric ? parseFloat(a[ci]) || 0 : String(a[ci]);
          const y = numeric ? parseFloat(b[ci]) || 0 : String(b[ci]);
          return (x < y ? -1 : x > y ? 1 : 0) * (cmd.desc ? -1 : 1);
        });
        setRows(sorted);
        addMsg('assistant', `Sorted by ${cols[ci]}${cmd.desc ? ' (descending)' : ''}.`,
          makeDebug(text, [{ op: 'sort', column: cols[ci], desc: !!cmd.desc }]));
      }
    }
    if (ok) setRequestCount((n) => n + 1);
    setStreaming(false);
    setStatus('idle');
  };

  const handleCancel = () => { cancelRef.current = true; };

  // ── toolbar actions ─────────────────────────────────────────────────────
  const doUndo = () => {
    if (undoStack.length === 0) return;
    const snap = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, snapshot()]);
    restore(snap);
    addToast('info', 'Undid the last transformation.');
  };
  const doRedo = () => {
    if (redoStack.length === 0) return;
    const snap = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, snapshot()]);
    restore(snap);
    addToast('info', 'Redid the transformation.');
  };
  const doSave = () => {
    setStatus('saved');
    addToast('info', `Saved ${fileName || 'table'} (${rows.length} rows × ${cols.length} cols).`);
    setTimeout(() => setStatus('idle'), 2500);
  };
  const doSaveFlow = () => {
    addToast('info', `Saved ${(fileName || 'table').replace(/\.\w+$/, '')}.flow — ${requestCount} replayable step${requestCount === 1 ? '' : 's'}.`);
  };

  // ── mic (press-and-hold) ────────────────────────────────────────────────
  const micTimer = useRefP(null);
  const onMicStart = () => setMicStatus('recording');
  const onMicStop = () => {
    setMicStatus('sending');
    micTimer.current = setTimeout(() => {
      setMicStatus('idle');
      setDraft('keep rows with Score ≥ 8, add a Country column from each phone number');
    }, 1100);
  };
  const onMicCancel = () => {
    clearTimeout(micTimer.current);
    setMicStatus('idle');
  };
  useEffectP(() => {
    if (micStatus !== 'recording') return;
    const onKey = (e) => { if (e.key === 'Escape') onMicCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [micStatus]);

  // ── table callbacks ─────────────────────────────────────────────────────
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(pageStart, pageStart + PAGE_SIZE);

  const cellFlag = aiRun ? (absRow, colIdx) => {
    if (colIdx !== aiRun.colIdx) return undefined;
    if (absRow >= aiRun.filled) return 'pending';
    if (absRow === aiRun.filled - 1) return 'flash';
    return 'flash2';
  } : undefined;

  const commitEdit = () => {
    if (!editing) return;
    const ci = cols.indexOf(editing.col);
    pushUndo();
    setRows((rs) => rs.map((r, i) => (i === editing.row ? r.map((v, j) => (j === ci ? editDraft : v)) : r)));
    setEditing(null);
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.ink, fontFamily: TT_TYPE.ui,
    }}>
      <Toolbar t={t} loaded={loaded} busy={streaming}
        fileName={fileName} rowCount={rows.length} colCount={cols.length}
        canUndo={undoStack.length > 0} canRedo={redoStack.length > 0}
        onOpenUrl={() => setDialog({ open: true, url: '', error: null, loading: false })}
        onOpenLocal={() => loadSample('customers.csv')}
        onSaveData={doSave} onSaveFlow={doSaveFlow}
        onUndo={doUndo} onRedo={doRedo}
        onToggleTheme={() => setTheme((m) => (m === 'dark' ? 'light' : 'dark'))}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenTutorial={() => setTutorialOpen(true)} />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ChatSidebar t={t} messages={messages} streaming={streaming} requestCount={requestCount}
          draft={draft} micStatus={micStatus} scrollRef={chatScroll}
          onDraft={setDraft} onSend={() => handleSend()} onCancel={handleCancel}
          onMicStart={onMicStart} onMicStop={onMicStop} onMicCancel={onMicCancel} />
        {loaded ? (
          <TableView t={t} cols={cols} rows={pageRows} colWidths={colWidths}
            page={safePage} pageCount={pageCount} pageStart={pageStart} totalRows={rows.length}
            selection={selection} editing={editing} editDraft={editDraft}
            streaming={streaming} status={streaming ? 'running' : status} cellFlag={cellFlag}
            onPageChange={setPage}
            onSelectCell={(row, column) => setSelection({ row, column })}
            onEditCell={(row, col) => {
              const ci = cols.indexOf(col);
              setEditing({ row, col });
              setEditDraft(rows[row] && rows[row][ci] != null ? String(rows[row][ci]) : '');
            }}
            onEditDraft={setEditDraft} onCommitEdit={commitEdit} onCancelEdit={() => setEditing(null)}
            onReorderColumns={(order) => {
              const idx = order.map((c) => cols.indexOf(c));
              pushUndo();
              setCols(order);
              setColWidths(idx.map((i) => colWidths[i]));
              setRows((rs) => rs.map((r) => idx.map((i) => r[i])));
            }} />
        ) : (
          <EmptyPane t={t} onOpen={() => setDialog({ open: true, url: '', error: null, loading: false })} />
        )}
      </div>

      {dialog.open && (
        <OpenUrlDialog t={t} url={dialog.url} error={dialog.error} loading={dialog.loading}
          onUrlChange={(url) => setDialog((d) => ({ ...d, url, error: null }))}
          onPick={(url) => setDialog((d) => ({ ...d, url, error: null }))}
          onSubmit={submitUrl}
          onClose={() => !dialog.loading && setDialog((d) => ({ ...d, open: false }))} />
      )}

      {settingsOpen && (
        <SettingsSheet t={t} onClose={() => setSettingsOpen(false)}
          provider={provider} expandedProvider={expandedProvider}
          primaryModel={primaryModel} secondaryModel={secondaryModel} keys={keys}
          onProviderClick={(p) => {
            setExpandedProvider((cur) => (cur === p ? null : p));
            setProvider(p);
            const def = MODELS.find((m) => m.provider === p);
            const defs = { gemini: ['gemini-3.5-flash', 'gemini-3.5-flash'], openai: ['gpt-5.5', 'gpt-5.4-mini'], anthropic: ['claude-sonnet-4-6', 'claude-sonnet-4-5'] };
            if (def) { setPrimaryModel(defs[p][0]); setSecondaryModel(defs[p][1]); }
          }}
          onKeyChange={(p, v) => setKeys((k) => ({ ...k, [p]: v }))}
          onSelectModel={(role, id) => (role === 'primary' ? setPrimaryModel(id) : setSecondaryModel(id))} />
      )}

      {tutorialOpen && (
        <TutorialSheet t={t} active={tutActive} selected={tutScenario}
          stepNum={tutStep} stepTotal={TUT_STEPS.length} stepText={TUT_STEPS[tutStep - 1]}
          onClose={() => { setTutorialOpen(false); setTutActive(false); setTutStep(1); }}
          onSelect={setTutScenario}
          onPlay={() => { setTutActive(true); setTutStep(1); }}
          onPrev={() => setTutStep((n) => Math.max(1, n - 1))}
          onNext={() => {
            if (tutStep >= TUT_STEPS.length) { setTutorialOpen(false); setTutActive(false); setTutStep(1); }
            else setTutStep((n) => n + 1);
          }} />
      )}

      <Toasts t={t} toasts={toasts} fixed onDismiss={(id) => setToasts((ts) => ts.filter((x) => x.id !== id))} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<InteractiveApp />);
