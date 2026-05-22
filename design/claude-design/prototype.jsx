// TamedTable — clickable prototype.
// Real interactive single-screen app. Loads sample data, accepts plain-
// English commands matched against a small canned vocabulary, streams
// changes into the table, supports undo/redo/save/settings, and shows
// real toasts on success and failure.

const { useState: useStateP, useEffect: useEffectP, useRef: useRefP, useMemo: useMemoP, useCallback: useCallbackP } = React;

// ── Initial dataset ─────────────────────────────────────────────────────
const INITIAL_COLS = ['ID', 'Name', 'Email', 'Phone', 'Signup', 'Score'];
const INITIAL_WIDTHS = [60, 178, 232, 162, 138, 110];
const INITIAL_ROWS = [
  ['1024', 'maren whitfield',     'maren.whitfield@hey.com',        '(415) 555-0142',  '2025-11-14', '8.42'],
  ['1025', 'anders köhl',         'anders@kohl.studio',             '415.555.0188',    '2025-11-13', '9.07'],
  ['1026', 'priya raghavan',      'priya.r@northstar.io',           '+1 415 555 0199', '2025-11-13', '7.18'],
  ['1027', 'theo marchetti',      'theo@marchetti.co',              '4155550133',      '2025-11-12', null  ],
  ['1028', 'june park',           'june.park@plinth.app',           '(628) 555-0117',  '2025-11-12', '6.83'],
  ['1029', 'devon aliyev',        'devon@aliyev.dev',               null,              '2025-11-11', '8.01'],
  ['1030', 'saoirse donnelly',    'saoirse.d@craftworks.io',        '628-555-0151',    '2025-11-11', '7.49'],
  ['1031', 'hugo bertrand',       'hugo@bertrand.fr',               '+33 1 55 50 12 34','2025-11-10','9.32'],
  ['1032', 'ines vasquez',        'ines.v@parallax.studio',         '(415) 555-0124',  '2025-11-09', '5.44'],
  ['1033', 'kazimir volkov',      'kaz@volkov.systems',             '415 555 0107',    '2025-11-09', '8.71'],
  ['1034', 'mira ostrowski',      'm.ostrowski@figment.app',        '4155550118',      '2025-11-08', '7.04'],
  ['1035', 'lior avraham',        'lior@avraham.tools',             '(415) 555-0162',  '2025-11-07', '6.12'],
  ['1036', 'cosima renzi',        'cosima@renzi.dev',               '628.555.0144',    '2025-11-07', '8.23'],
  ['1037', 'jules okafor',        'jules.okafor@daybreak.io',       '(415) 555-0173',  '2025-11-06', null  ],
  ['1038', 'esa lindqvist',       'esa@lindqvist.fi',               '+358 40 555 0111','2025-11-06', '9.05'],
  ['1039', 'beatriz salgado',     'beatriz.s@coriander.app',        '415-555-0136',    '2025-11-05', '7.81'],
  // duplicate email (same as #1024) — for the dedupe demo
  ['1040', 'maren w',             'maren.whitfield@hey.com',        '(628) 555-0190',  '2025-11-04', '6.31'],
  ['1041', 'hannah voss',         'hannah@voss.studio',             '4155550182',      '2025-11-04', '8.94'],
  ['1042', 'rin tanaka',          'rin.tanaka@kintsugi.app',        '+81 3 5555 0119', '2025-11-03', '7.62'],
  ['1043', 'mateusz kowalski',    'mateusz@kowalski.pl',            '628 555 0129',    '2025-11-02', '8.11'],
];

// ── Helpers ─────────────────────────────────────────────────────────────
function clone(rows) { return rows.map((r) => r.slice()); }
function normalizePhone(raw) {
  if (raw == null) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 10) return '+1' + digits;          // US local
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits;
}
function titleCase(s) {
  return (s || '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
}

// ── Canned command matcher ──────────────────────────────────────────────
// Returns: { kind, label, detail, run: (rows, cols, push) => Promise<{rows, cols}> }
// `push(line)` streams a single sample-change line into the running panel.
function matchCommand(text) {
  const t = text.trim();
  const lc = t.toLowerCase();

  if (/phone|e\.?164/.test(lc)) return {
    kind: 'transform',
    label: 'Normalize phone numbers',
    summary: (n) => `Normalized ${n.changed} phone numbers; ${n.skipped} blank skipped.`,
    detail: (n) => `column: Phone\napplied: parsed national + country code → E.164\nchanged: ${n.changed} / ${n.total}  ·  skipped (blank): ${n.skipped}\nelapsed: ${n.ms} ms`,
    run: async (rows, cols, push, signal) => {
      const out = clone(rows);
      let changed = 0, skipped = 0;
      for (let i = 0; i < out.length; i++) {
        if (signal.aborted) break;
        const before = out[i][3];
        if (before == null) { skipped++; continue; }
        const after = normalizePhone(before);
        out[i] = [...out[i]];
        out[i][3] = after;
        out[i].__flash = { c: 3, until: Date.now() + 1400 };
        changed++;
        push({ row: i + 1, col: 'Phone', from: before, to: after });
        await sleepP(70 + Math.random() * 60, signal);
      }
      return { rows: out, cols, stats: { changed, skipped, total: out.length } };
    },
  };

  if (/dedup|duplicate|drop.+dup/.test(lc)) return {
    kind: 'rows',
    label: 'Drop duplicate emails',
    summary: (n) => `Removed ${n.removed} duplicate row${n.removed === 1 ? '' : 's'} by email.`,
    detail: (n) => `grouped by Email; kept first occurrence\nremoved rows: ${n.removed}\nelapsed: ${n.ms} ms`,
    run: async (rows, cols, push, signal) => {
      const out = []; const seen = new Set(); let removed = 0;
      for (let i = 0; i < rows.length; i++) {
        if (signal.aborted) break;
        const email = rows[i][2];
        if (email && seen.has(email)) {
          push({ row: i + 1, action: `drop · duplicate email "${email}"` });
          removed++;
          await sleepP(100, signal);
        } else {
          seen.add(email);
          out.push(rows[i]);
        }
      }
      return { rows: out, cols, stats: { removed } };
    },
  };

  if (/sort.+score|score.+desc|by score/.test(lc)) return {
    kind: 'reorder',
    label: 'Sort by Score, descending',
    summary: () => `Sorted by Score, descending. Blanks moved to the bottom.`,
    detail: (n) => `ORDER BY Score DESC NULLS LAST\nelapsed: ${n.ms} ms`,
    run: async (rows, cols, push, signal) => {
      push({ action: 'computing sort key from column Score…' });
      await sleepP(150, signal);
      const out = clone(rows).sort((a, b) => {
        const av = a[5] == null ? -Infinity : parseFloat(a[5]);
        const bv = b[5] == null ? -Infinity : parseFloat(b[5]);
        return bv - av;
      });
      push({ action: 'reordering 20 rows…' });
      await sleepP(150, signal);
      return { rows: out, cols, stats: {} };
    },
  };

  if (/sort.+date|sort.+signup|newest|by date/.test(lc)) return {
    kind: 'reorder',
    label: 'Sort by Signup, newest first',
    summary: () => `Sorted by Signup, newest first.`,
    detail: (n) => `ORDER BY Signup DESC\nelapsed: ${n.ms} ms`,
    run: async (rows, cols, push, signal) => {
      push({ action: 'parsing Signup as ISO dates…' });
      await sleepP(140, signal);
      const out = clone(rows).sort((a, b) => (a[4] < b[4] ? 1 : -1));
      push({ action: 'reordering…' });
      await sleepP(120, signal);
      return { rows: out, cols, stats: {} };
    },
  };

  let topN;
  if ((topN = /keep.+top\s+(\d+)|first\s+(\d+)|top\s+(\d+)/.exec(lc))) return {
    kind: 'rows',
    label: `Keep the top ${topN[1] || topN[2] || topN[3]} rows`,
    summary: (n) => `Kept the top ${n.kept} rows; dropped ${n.dropped}.`,
    detail: (n) => `LIMIT ${n.kept}\nelapsed: ${n.ms} ms`,
    run: async (rows, cols, push, signal) => {
      const N = parseInt(topN[1] || topN[2] || topN[3], 10);
      push({ action: `dropping rows after position ${N}…` });
      await sleepP(180, signal);
      const out = rows.slice(0, N);
      return { rows: out, cols, stats: { kept: out.length, dropped: rows.length - out.length } };
    },
  };

  if (/round|decimal/.test(lc)) return {
    kind: 'transform',
    label: 'Round Score to 1 decimal',
    summary: (n) => `Rounded ${n.changed} scores to 1 decimal.`,
    detail: (n) => `column: Score\napplied: round(value, 1)\nchanged: ${n.changed} / ${n.total}\nelapsed: ${n.ms} ms`,
    run: async (rows, cols, push, signal) => {
      const out = clone(rows); let changed = 0;
      for (let i = 0; i < out.length; i++) {
        if (signal.aborted) break;
        const before = out[i][5];
        if (before == null) continue;
        const after = parseFloat(before).toFixed(1);
        if (after === before) continue;
        out[i] = [...out[i]];
        out[i][5] = after;
        out[i].__flash = { c: 5, until: Date.now() + 1400 };
        push({ row: i + 1, col: 'Score', from: before, to: after });
        changed++;
        await sleepP(50, signal);
      }
      return { rows: out, cols, stats: { changed, total: out.length } };
    },
  };

  if (/capitali[sz]e|title.?case|proper.?case|name/.test(lc) && /name|case/.test(lc)) return {
    kind: 'transform',
    label: 'Title-case Name column',
    summary: (n) => `Title-cased ${n.changed} names.`,
    detail: (n) => `column: Name\napplied: title-case\nchanged: ${n.changed} / ${n.total}\nelapsed: ${n.ms} ms`,
    run: async (rows, cols, push, signal) => {
      const out = clone(rows); let changed = 0;
      for (let i = 0; i < out.length; i++) {
        if (signal.aborted) break;
        const before = out[i][1];
        const after = titleCase(before);
        if (after === before) continue;
        out[i] = [...out[i]];
        out[i][1] = after;
        out[i].__flash = { c: 1, until: Date.now() + 1400 };
        push({ row: i + 1, col: 'Name', from: before, to: after });
        changed++;
        await sleepP(60, signal);
      }
      return { rows: out, cols, stats: { changed, total: out.length } };
    },
  };

  if (/split.+name|first.+last|separate.+name/.test(lc)) return {
    kind: 'schema',
    label: 'Split Name into First, Last',
    summary: () => `Split Name into First and Last columns.`,
    detail: (n) => `column: Name → First, Last\nnew columns: 2\nelapsed: ${n.ms} ms`,
    run: async (rows, cols, push, signal) => {
      push({ action: 'adding column: First' });
      await sleepP(120, signal);
      push({ action: 'adding column: Last' });
      await sleepP(120, signal);
      const newCols = ['ID', 'First', 'Last', 'Email', 'Phone', 'Signup', 'Score'];
      const out = rows.map((r) => {
        const parts = (r[1] || '').split(/\s+/);
        const first = titleCase(parts[0] || '');
        const last  = titleCase(parts.slice(1).join(' '));
        const nr = [r[0], first, last, r[2], r[3], r[4], r[5]];
        nr.__flash = { c: 1, until: Date.now() + 1400 };
        return nr;
      });
      return { rows: out, cols: newCols, stats: {} };
    },
  };

  // Default: failure → toast.
  return null;
}

function sleepP(ms, signal) {
  return new Promise((res, rej) => {
    const id = setTimeout(res, ms);
    if (signal) signal.addEventListener('abort', () => { clearTimeout(id); rej(new Error('abort')); }, { once: true });
  });
}

// ── Small UI primitives (mirrors components.jsx where useful) ──────────
function PBtn({ t, children, kind = 'ghost', disabled, onClick, title, style, active }) {
  const [hover, setHover] = useStateP(false);
  const base = {
    height: 26, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 6,
    border: '1px solid transparent', borderRadius: 5, background: 'transparent',
    color: t.ink2, font: `500 ${TT_TYPE.sm}px/1 ${TT_TYPE.ui}`,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
    transition: 'background .12s, color .12s, border-color .12s',
  };
  const variants = {
    ghost:   { background: hover && !disabled ? t.surface3 : 'transparent', color: hover && !disabled ? t.ink : t.ink2 },
    chrome:  { color: t.ink, background: hover && !disabled ? t.surface3 : 'transparent', borderColor: t.line },
    primary: { background: hover && !disabled ? t.accentHover : t.accent, color: t.inkOnAcc, borderColor: 'transparent', fontWeight: 600 },
    danger:  { color: t.err, borderColor: t.err, background: hover && !disabled ? t.errSoft : 'transparent' },
  };
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...base, ...variants[kind], ...style }}>{children}</button>
  );
}

// ── Top bar ─────────────────────────────────────────────────────────────
function PTopBar({ t, loaded, canUndo, canRedo, dirty, onOpen, onSave, onUndo, onRedo, onSettings }) {
  return (
    <div style={{
      height: 40, flex: '0 0 40px', display: 'flex', alignItems: 'center',
      padding: '0 12px', borderBottom: `1px solid ${t.line}`, background: t.surface, gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 18, height: 18, borderRadius: 4, background: t.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={t.inkOnAcc} strokeWidth="1.4">
            <rect x="1.5" y="2" width="9" height="8" rx="1" />
            <path d="M1.5 5h9 M4.5 2v8" />
          </svg>
        </div>
        <span style={{ font: `600 14px/1 ${TT_TYPE.ui}`, color: t.ink, letterSpacing: -0.1 }}>TamedTable</span>
        {loaded && (
          <span style={{ font: `400 12.5px/1 ${TT_TYPE.mono}`, color: t.ink3, marginLeft: 6 }}>
            · signups_nov.csv{dirty && <span style={{ color: t.accent }}> ●</span>}
          </span>
        )}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <PBtn t={t} onClick={onOpen}>{I.folder} Open</PBtn>
        <PBtn t={t} disabled={!loaded} onClick={onSave}>{I.save} Save</PBtn>
        <span style={{ width: 1, height: 16, background: t.line, margin: '0 6px' }} />
        <PBtn t={t} disabled={!canUndo} onClick={onUndo} title="Undo (⌘Z)">{I.undo} Undo</PBtn>
        <PBtn t={t} disabled={!canRedo} onClick={onRedo} title="Redo (⌘⇧Z)">{I.redo} Redo</PBtn>
        <span style={{ width: 1, height: 16, background: t.line, margin: '0 6px' }} />
        <PBtn t={t} onClick={onSettings}>{I.cog} Settings</PBtn>
      </div>
    </div>
  );
}

// ── Chat sidebar (interactive) ─────────────────────────────────────────
function PChatSidebar({ t, loaded, history, running, runningProgress, input, setInput, onSend, onStop, onOpenFile }) {
  const scrollRef = useRefP(null);
  useEffectP(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history.length, running, runningProgress.length]);

  return (
    <div style={{
      width: 360, flex: '0 0 360px', display: 'flex', flexDirection: 'column',
      background: t.surface2, borderRight: `1px solid ${t.line}`, position: 'relative',
    }}>
      <div style={{
        height: 30, padding: '0 12px', display: 'flex', alignItems: 'center',
        font: `600 11.5px/1 ${TT_TYPE.ui}`, color: t.ink3,
        letterSpacing: 0.6, textTransform: 'uppercase', borderBottom: `1px solid ${t.line}`,
      }}>
        Requests
        <span style={{ flex: 1 }} />
        {loaded && (
          <span style={{ font: `400 11.5px/1 ${TT_TYPE.mono}`, color: t.ink3, textTransform: 'none', letterSpacing: 0 }}>
            {history.filter(h => h.kind !== 'error').length} done{history.filter(h => h.kind === 'error').length ? ` · ${history.filter(h => h.kind === 'error').length} failed` : ''}{running ? ' · 1 running' : ''}
          </span>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 6px' }}>
        {!loaded && (
          <div style={{ color: t.ink3, font: `400 12.5px/1.6 ${TT_TYPE.ui}`, padding: '6px 4px' }}>
            <div style={{ color: t.ink2, marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Load a table to begin.</div>
            Drop a CSV onto the table area, or click <em style={{ color: t.ink2, fontStyle: 'normal' }}>Open</em>. Then describe the change you want — in plain English.
            <div style={{ marginTop: 14 }}>
              <PBtn t={t} kind="chrome" onClick={onOpenFile}>{I.folder} Open sample file</PBtn>
            </div>
          </div>
        )}

        {history.map((h, i) => (
          <PChatTurn key={i} t={t} turn={h} />
        ))}

        {running && <PProgress t={t} label={running.label} lines={runningProgress} />}
      </div>

      <PInput
        t={t}
        loaded={loaded}
        running={!!running}
        value={input}
        setValue={setInput}
        onSend={onSend}
        onStop={onStop}
      />
    </div>
  );
}

function PChatTurn({ t, turn }) {
  const [open, setOpen] = useStateP(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <div style={{
          maxWidth: '88%', background: t.accentSoft, color: t.ink, borderRadius: 8,
          padding: '6px 10px', font: `400 13px/1.5 ${TT_TYPE.ui}`,
          border: `1px solid ${t.line}`,
        }}>{turn.input}</div>
      </div>
      {turn.kind === 'error' ? (
        <div style={{
          color: t.err, font: `400 13px/1.5 ${TT_TYPE.ui}`,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ flex: '0 0 auto', marginTop: 3, color: t.err }}>{I.err}</span>
          <span>{turn.summary}</span>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, color: t.ink2,
            font: `400 13px/1.5 ${TT_TYPE.ui}`,
          }}>
            <span style={{ flex: '0 0 auto', marginTop: 5, width: 6, height: 6, borderRadius: 3, background: t.ok }} />
            <div style={{ flex: 1 }}>{turn.summary}</div>
          </div>
          {turn.detail && (
            <>
              <button onClick={() => setOpen((o) => !o)} style={{
                marginTop: 4, marginLeft: 14, background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                color: t.ink3, font: `400 11.5px/1.4 ${TT_TYPE.ui}`,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ display: 'inline-flex', transition: 'transform .15s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>{I.chev}</span>
                details
              </button>
              {open && (
                <pre style={{
                  margin: '6px 0 0 14px', padding: '8px 10px', background: t.surface3,
                  color: t.ink3, font: `400 11.5px/1.55 ${TT_TYPE.mono}`,
                  borderRadius: 5, border: `1px solid ${t.line}`, whiteSpace: 'pre-wrap',
                }}>{turn.detail}</pre>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function PProgress({ t, label, lines }) {
  const recent = lines.slice(-6);
  return (
    <div style={{ marginBottom: 14, borderLeft: `2px solid ${t.accent}`, paddingLeft: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        font: `500 12.5px/1.4 ${TT_TYPE.ui}`, color: t.ink, marginBottom: 6,
      }}>
        <span className="tt-pulse" style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }} />
        {label}…
        <span style={{ flex: 1 }} />
        <span style={{ font: `400 11.5px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>{lines.length}</span>
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {recent.map((l, i) => (
          <div key={i} style={{
            font: `400 11.5px/1.5 ${TT_TYPE.mono}`,
            color: i === recent.length - 1 ? t.ink2 : t.ink3,
            opacity: 0.45 + (i / Math.max(1, recent.length - 1)) * 0.55,
          }}>
            {l.from != null
              ? `row ${l.row} · ${l.col} · ${truncate(l.from, 18)} → ${truncate(l.to, 18)}`
              : l.action || `row ${l.row}`}
          </div>
        ))}
      </div>
    </div>
  );
}
function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function PInput({ t, loaded, running, value, setValue, onSend, onStop }) {
  const ref = useRefP(null);
  function onKey(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSend(); }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  }
  return (
    <div style={{ borderTop: `1px solid ${t.line}`, padding: 10, background: t.surface2 }}>
      <div style={{
        background: t.surface, border: `1.5px solid ${value || (ref.current === document.activeElement) ? t.ring : t.line2}`,
        borderRadius: 7, padding: '8px 8px 6px 10px',
        display: 'flex', alignItems: 'flex-end', gap: 8,
        opacity: loaded ? 1 : 0.7, transition: 'border-color .15s',
      }}>
        <textarea
          ref={ref}
          disabled={!loaded || running}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder={loaded
            ? `normalize phone numbers · drop duplicate emails · sort by date, newest first`
            : `open a file to start`}
          rows={1}
          style={{
            flex: 1, minHeight: 38, resize: 'none', border: 0, outline: 'none', background: 'transparent',
            font: `400 13px/1.5 ${TT_TYPE.ui}`, color: t.ink, padding: '2px 0',
          }}
        />
        {running ? (
          <button onClick={onStop} style={{
            height: 30, width: 30, borderRadius: 6, border: `1px solid ${t.err}`,
            background: 'transparent', color: t.err, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Stop">{I.stop}</button>
        ) : (
          <button onClick={onSend} disabled={!loaded || !value.trim()} style={{
            height: 30, width: 30, borderRadius: 6, border: 'none',
            background: value.trim() ? t.accent : t.surface3,
            color: value.trim() ? t.inkOnAcc : t.ink3,
            cursor: value.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Send (⌘↵)">{I.send}</button>
        )}
      </div>
      <div style={{
        marginTop: 5, display: 'flex', justifyContent: 'space-between',
        font: `400 10.5px/1 ${TT_TYPE.ui}`, color: t.ink4, letterSpacing: 0.3,
      }}>
        <span>⌘↵ to send · ⇧↵ for newline</span>
        <span style={{ font: `400 10.5px/1 ${TT_TYPE.mono}` }}>gpt-4o</span>
      </div>
    </div>
  );
}

// ── Table view (interactive) ───────────────────────────────────────────
function PTable({ t, rows, cols, colWidths, selectedRow, setSelectedRow, editing, setEditing, onCommitEdit, dirty, running }) {
  const wrap = useRefP(null);
  const [page, setPage] = useStateP(1);
  const TOTAL_PAGES = 230;
  const PAGE_SIZE = 20;
  const totalRows = TOTAL_PAGES * PAGE_SIZE;
  const firstRow = (page - 1) * PAGE_SIZE + 1;
  const lastRow  = Math.min(page * PAGE_SIZE, totalRows);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.surface, position: 'relative', minWidth: 0 }}>
      <div style={{
        height: 28, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${t.line}`, background: t.surface2,
        font: `400 11.5px/1 ${TT_TYPE.mono}`, color: t.ink3,
      }}>
        <span style={{ color: t.ink2 }}>{rows.length} rows × {cols.length} columns</span>
        <span style={{ color: t.ink4 }}>·</span>
        <span>filter: <span style={{ color: t.ink2 }}>none</span></span>
        <span style={{ flex: 1 }} />
        <span>signups_nov.csv{dirty && <span style={{ color: t.accent }}> · unsaved</span>}</span>
      </div>

      <div ref={wrap} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {/* header row */}
        <div style={{
          display: 'flex', height: 32, background: t.surface2,
          borderBottom: `1px solid ${t.line2}`, position: 'sticky', top: 0, zIndex: 1,
        }}>
          {cols.map((c, i) => (
            <div key={c+i} style={{
              width: colWidths[i] || 120, flex: `0 0 ${colWidths[i] || 120}px`, position: 'relative',
              display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6,
              font: `600 12.5px/1 ${TT_TYPE.ui}`, color: t.ink2,
              borderRight: `1px solid ${t.line}`,
            }}>
              <span>{c}</span>
              <div style={{ position: 'absolute', right: -3, top: 4, bottom: 4, width: 6, cursor: 'col-resize' }} />
            </div>
          ))}
          <div style={{ flex: 1 }} />
        </div>

        {/* body */}
        {rows.map((row, ri) => {
          const isSelected = selectedRow === ri;
          const flashCol = row.__flash && row.__flash.until > Date.now() ? row.__flash.c : -1;
          return (
            <div key={row[0] + '-' + ri} onClick={() => setSelectedRow(ri)}
                 style={{
                   display: 'flex', height: 28,
                   background: isSelected ? t.accentSoft : 'transparent',
                   borderBottom: `1px solid ${t.line}`,
                   cursor: 'default',
                 }}>
              {row.slice(0, cols.length).map((cell, ci) => {
                const isBlank = cell == null;
                const isFlashing = ci === flashCol;
                const isMono = (cols[ci] === 'Email' || cols[ci] === 'Phone' || cols[ci] === 'Signup' || cols[ci] === 'ID' || cols[ci] === 'Score');
                const isRightAlign = (cols[ci] === 'ID' || cols[ci] === 'Score');
                const isEditing = editing && editing.r === ri && editing.c === ci;
                return (
                  <div key={ci}
                       className={isFlashing ? 'tt-flash' : ''}
                       onDoubleClick={() => !running && setEditing({ r: ri, c: ci, value: cell == null ? '' : String(cell) })}
                       style={{
                         ['--hi']: t.cellHi,
                         width: colWidths[ci] || 120, flex: `0 0 ${colWidths[ci] || 120}px`,
                         padding: '0 10px', display: 'flex', alignItems: 'center',
                         borderRight: `1px solid ${t.line}`,
                         font: `400 12.5px/1 ${isMono ? TT_TYPE.mono : TT_TYPE.ui}`,
                         color: isBlank ? t.ink4 : t.ink,
                         justifyContent: isRightAlign ? 'flex-end' : 'flex-start',
                         fontVariantNumeric: 'tabular-nums',
                         position: 'relative',
                         ...(isEditing ? { background: t.surface, boxShadow: `inset 0 0 0 2px ${t.accent}`, zIndex: 1, padding: 0 } : {}),
                       }}>
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onBlur={() => onCommitEdit()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); onCommitEdit(); }
                          if (e.key === 'Escape') { setEditing(null); }
                        }}
                        style={{
                          width: '100%', height: '100%', border: 0, outline: 'none',
                          background: 'transparent', padding: '0 10px',
                          font: `400 12.5px/1 ${isMono ? TT_TYPE.mono : TT_TYPE.ui}`,
                          color: t.ink, textAlign: isRightAlign ? 'right' : 'left',
                        }}
                      />
                    ) : isBlank ? (
                      <span style={{ color: t.ink4 }}>—</span>
                    ) : (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{cell}</span>
                    )}
                  </div>
                );
              })}
              <div style={{ flex: 1 }} />
            </div>
          );
        })}

        {rows.length === 0 && (
          <div style={{
            padding: 60, textAlign: 'center', color: t.ink3,
            font: `400 13px/1.5 ${TT_TYPE.ui}`,
          }}>
            No rows. Your last request removed them all.
          </div>
        )}
      </div>

      {/* pagination bar */}
      <div style={{
        height: 40, flex: '0 0 40px', display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 10px 0 14px', borderTop: `1px solid ${t.line}`, background: t.surface2,
      }}>
        <span style={{ font: `400 11.5px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>
          <span style={{ color: t.ink2 }}>{firstRow.toLocaleString()}–{lastRow.toLocaleString()}</span> of {totalRows.toLocaleString()} rows
        </span>
        <span style={{ flex: 1 }} />
        <Pagination t={t} current={page} total={TOTAL_PAGES} onChange={setPage} />
      </div>

      {/* status footer */}
      <div style={{
        height: 24, flex: '0 0 24px', display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 14px', borderTop: `1px solid ${t.line}`, background: t.surface2,
        font: `400 11.5px/1 ${TT_TYPE.mono}`, color: t.ink3,
      }}>
        {selectedRow != null ? <span>row {selectedRow + 1}</span> : <span>no selection</span>}
        <span style={{ color: t.ink4 }}>·</span>
        <span>UTF-8</span>
        <span style={{ flex: 1 }} />
        {running ? <span style={{ color: t.accent }}>● running</span>
                 : <span>{dirty ? 'unsaved changes' : 'saved'}</span>}
      </div>
    </div>
  );
}

// ── Empty pane (drop target) ───────────────────────────────────────────
function PEmpty({ t, onOpen }) {
  const [over, setOver] = useStateP(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onOpen(); }}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: over ? t.accentSoft : t.surface,
        transition: 'background .15s', position: 'relative', minWidth: 0,
      }}>
      <div style={{
        width: 460, padding: 28, borderRadius: 10,
        border: `1.5px dashed ${over ? t.accent : t.line2}`,
        background: over ? t.surface : t.surface2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14,
        transition: 'border-color .15s, background .15s',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: t.accentSoft,
          color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 14V3 M7 7l4-4 4 4 M4 16v1.5A1.5 1.5 0 0 0 5.5 19h11a1.5 1.5 0 0 0 1.5-1.5V16" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ font: `600 16px/1.3 ${TT_TYPE.ui}`, color: t.ink, letterSpacing: -0.2 }}>
            Drop a CSV here to begin
          </div>
          <div style={{ font: `400 12.5px/1.5 ${TT_TYPE.ui}`, color: t.ink2 }}>
            or click to load the sample file. TSV and XLSX also work.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <PBtn t={t} kind="primary" onClick={onOpen}>{I.folder} Load sample (20 rows)</PBtn>
        </div>
        <div style={{
          marginTop: 6, font: `400 11.5px/1.5 ${TT_TYPE.mono}`, color: t.ink3,
        }}>
          Tip: once loaded, try<br/>
          <span style={{ color: t.ink2 }}>"normalize phone numbers"</span>,
          <span style={{ color: t.ink2 }}> "drop duplicate emails"</span>,
          <span style={{ color: t.ink2 }}> "sort by date, newest first"</span>
        </div>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────
function PToast({ t, kind, children, onClose }) {
  useEffectP(() => {
    const id = setTimeout(onClose, kind === 'error' ? 6000 : 3000);
    return () => clearTimeout(id);
  }, [kind, onClose]);
  const isErr = kind === 'error';
  return (
    <div style={{
      position: 'absolute', right: 16, bottom: 18, zIndex: 20,
      minWidth: 280, maxWidth: 380,
      background: t.surface, color: t.ink,
      border: `1px solid ${isErr ? t.err : t.line2}`,
      borderLeft: `3px solid ${isErr ? t.err : t.ok}`,
      borderRadius: 8, padding: '10px 12px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
      boxShadow: t.shadowLg,
      font: `400 12.5px/1.5 ${TT_TYPE.ui}`,
      animation: 'tt-toast-in .22s cubic-bezier(.2,.7,.3,1)',
    }}>
      <span style={{ color: isErr ? t.err : t.ok, marginTop: 1 }}>{isErr ? I.err : I.ok}</span>
      <div style={{ flex: 1 }}>{children}</div>
      <button onClick={onClose} style={{
        background: 'transparent', border: 0, padding: 2, color: t.ink3, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
      }}>{I.x}</button>
    </div>
  );
}

// ── Settings sheet ─────────────────────────────────────────────────────
function PSettings({ t, onClose, theme, setTheme }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 25, background: t.overlay,
        animation: 'tt-fade-in .15s ease-out',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 380, zIndex: 30,
        background: t.surface, borderLeft: `1px solid ${t.line2}`,
        boxShadow: t.shadowLg, display: 'flex', flexDirection: 'column',
        animation: 'tt-slide-in .22s cubic-bezier(.2,.7,.3,1)',
      }}>
        <div style={{
          height: 40, padding: '0 14px', display: 'flex', alignItems: 'center',
          borderBottom: `1px solid ${t.line}`,
        }}>
          <span style={{ font: `600 14px/1 ${TT_TYPE.ui}`, color: t.ink }}>Settings</span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: t.ink3, cursor: 'pointer', padding: 4 }}>{I.x}</button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
          <div>
            <div style={{ font: `600 12.5px/1.4 ${TT_TYPE.ui}`, color: t.ink, marginBottom: 4 }}>API key</div>
            <div style={{ font: `400 11.5px/1.55 ${TT_TYPE.ui}`, color: t.ink3, marginBottom: 8 }}>
              Required to make requests. Stored in this browser tab only.
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: `1px solid ${t.line2}`, borderRadius: 6, padding: '6px 8px',
              background: t.surface2,
            }}>
              <span style={{ font: `400 12.5px/1 ${TT_TYPE.mono}`, color: t.ink, flex: 1 }}>
                sk-•••••••••••••••••••••••••••••a7c2
              </span>
              <button style={{ background: 'transparent', border: 0, color: t.ink3, cursor: 'pointer', padding: 2 }}>{I.eye}</button>
            </div>
          </div>
          <div>
            <div style={{ font: `600 12.5px/1.4 ${TT_TYPE.ui}`, color: t.ink, marginBottom: 6 }}>Theme</div>
            <div style={{
              display: 'flex', gap: 4, padding: 3, background: t.surface3, borderRadius: 7,
            }}>
              {['light', 'dark'].map((k) => (
                <button key={k} onClick={() => setTheme(k)} style={{
                  flex: 1, height: 28, border: 0, borderRadius: 5, cursor: 'pointer',
                  background: theme === k ? t.surface : 'transparent',
                  color: theme === k ? t.ink : t.ink2,
                  font: `500 12.5px/1 ${TT_TYPE.ui}`, textTransform: 'capitalize',
                  boxShadow: theme === k ? t.shadow : 'none',
                }}>{k}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ font: `600 12.5px/1.4 ${TT_TYPE.ui}`, color: t.ink, marginBottom: 6 }}>Model</div>
            {[
              ['gpt-4o',         'Default. Strong reasoning, ~2s / 20 rows.', true],
              ['gpt-4o-mini',    'Faster, cheaper. Best for simple sorts and filters.', false],
              ['claude-sonnet',  'Long context. Best for big tables.', false],
            ].map(([name, sub, on]) => (
              <label key={name} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 8px',
                borderRadius: 5, cursor: 'pointer',
                background: on ? t.accentSoft : 'transparent',
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 8, marginTop: 2,
                  border: `1.5px solid ${on ? t.accent : t.line2}`,
                  background: on ? t.accent : 'transparent',
                  boxShadow: on ? `inset 0 0 0 2.5px ${t.surface}` : 'none',
                  flex: '0 0 auto',
                }} />
                <div>
                  <div style={{ font: `500 12.5px/1.3 ${TT_TYPE.mono}`, color: t.ink }}>{name}</div>
                  <div style={{ font: `400 11.5px/1.4 ${TT_TYPE.ui}`, color: t.ink3, marginTop: 1 }}>{sub}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root app ───────────────────────────────────────────────────────────
function InteractiveApp() {
  const [theme, setTheme] = useStateP(() => localStorage.getItem('tt-theme') || 'light');
  useEffectP(() => { localStorage.setItem('tt-theme', theme); }, [theme]);
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;

  // table state
  const [rows, setRows] = useStateP([]);
  const [cols, setCols] = useStateP(INITIAL_COLS);
  const [colWidths] = useStateP(INITIAL_WIDTHS);
  const [savedSnapshot, setSavedSnapshot] = useStateP(null); // last save's row signature
  const [history, setHistory] = useStateP([]);  // chat turns
  const [undoStack, setUndoStack] = useStateP([]); // [{rows, cols}]
  const [redoStack, setRedoStack] = useStateP([]);
  const [selectedRow, setSelectedRow] = useStateP(null);
  const [editing, setEditing] = useStateP(null);

  // request flow
  const [input, setInput] = useStateP('');
  const [running, setRunning] = useStateP(null);
  const [runningLines, setRunningLines] = useStateP([]);
  const abortRef = useRefP(null);

  // ui
  const [toast, setToast] = useStateP(null);
  const [settingsOpen, setSettingsOpen] = useStateP(false);

  const loaded = rows.length > 0 || cols.length !== INITIAL_COLS.length || (history.length > 0 && rows.length === 0);
  const dirty = loaded && (savedSnapshot !== JSON.stringify({ rows, cols }));

  const pushHistory = (turn) => setHistory((h) => [...h, turn]);

  function pushUndo() {
    setUndoStack((s) => [...s.slice(-30), { rows, cols }]);
    setRedoStack([]);
  }
  function onUndo() {
    if (undoStack.length === 0) return;
    const top = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, { rows, cols }]);
    setUndoStack((s) => s.slice(0, -1));
    setRows(top.rows); setCols(top.cols);
    setToast({ kind: 'ok', msg: 'Undid last change.' });
  }
  function onRedo() {
    if (redoStack.length === 0) return;
    const top = redoStack[redoStack.length - 1];
    setUndoStack((s) => [...s, { rows, cols }]);
    setRedoStack((r) => r.slice(0, -1));
    setRows(top.rows); setCols(top.cols);
  }

  function loadSample() {
    pushUndo();
    setRows(INITIAL_ROWS); setCols(INITIAL_COLS);
    setHistory([{
      input: 'load signups_nov.csv',
      kind: 'ok',
      summary: <span>Loaded <strong style={{ color: t.ink, fontWeight: 600 }}>20 rows</strong> across 6 columns.</span>,
      detail: `source: signups_nov.csv (20 rows · 6 columns · 4.1 KB)\nencoding: utf-8 · delimiter: ","\nelapsed: 38 ms`,
    }]);
    setSavedSnapshot(JSON.stringify({ rows: INITIAL_ROWS, cols: INITIAL_COLS }));
  }

  function onSave() {
    setSavedSnapshot(JSON.stringify({ rows, cols }));
    setToast({ kind: 'ok', msg: <>Saved to <span style={{ fontFamily: TT_TYPE.mono }}>signups_nov.csv</span></> });
  }

  async function onSend() {
    const text = input.trim();
    if (!text || running) return;
    const cmd = matchCommand(text);
    if (!cmd) {
      pushHistory({ input: text, kind: 'error', summary: "Couldn't apply that change — try rephrasing it." });
      setToast({ kind: 'error', msg: "Couldn't apply that change — try rephrasing it." });
      setInput('');
      return;
    }
    setInput('');
    setRunningLines([]);
    setRunning({ label: cmd.label });
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const start = Date.now();
    const push = (line) => setRunningLines((arr) => [...arr, line]);
    try {
      const result = await cmd.run(rows, cols, push, ctrl.signal);
      const ms = Date.now() - start;
      pushUndo();
      setRows(result.rows);
      setCols(result.cols);
      const stats = { ...(result.stats || {}), ms };
      pushHistory({
        input: text, kind: 'ok',
        summary: cmd.summary ? cmd.summary(stats) : 'Done.',
        detail: cmd.detail ? cmd.detail(stats) : null,
      });
    } catch (e) {
      pushHistory({ input: text, kind: 'error', summary: 'Stopped.' });
    } finally {
      setRunning(null);
      setRunningLines([]);
      abortRef.current = null;
    }
  }

  function onStop() {
    if (abortRef.current) abortRef.current.abort();
  }

  function onCommitEdit() {
    if (!editing) return;
    const { r, c, value } = editing;
    pushUndo();
    setRows((rs) => {
      const out = rs.map((row, i) => {
        if (i !== r) return row;
        const nr = [...row]; nr[c] = value === '' ? null : value; return nr;
      });
      return out;
    });
    setEditing(null);
  }

  // ── Flash GC (so __flash markers expire) ──────────────────────────────
  useEffectP(() => {
    const id = setInterval(() => setRows((rs) => rs.slice()), 600);
    return () => clearInterval(id);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffectP(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); onUndo(); }
      else if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); onRedo(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (loaded) onSave(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.ink, fontFamily: TT_TYPE.ui, overflow: 'hidden',
      position: 'relative',
    }}>
      <PTopBar t={t}
        loaded={loaded}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        dirty={dirty}
        onOpen={loadSample}
        onSave={onSave}
        onUndo={onUndo}
        onRedo={onRedo}
        onSettings={() => setSettingsOpen((x) => !x)}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <PChatSidebar t={t}
          loaded={loaded}
          history={history}
          running={running}
          runningProgress={runningLines}
          input={input} setInput={setInput}
          onSend={onSend} onStop={onStop}
          onOpenFile={loadSample}
        />
        <div style={{ width: 1, background: t.line }} />
        {!loaded ? (
          <PEmpty t={t} onOpen={loadSample} />
        ) : (
          <PTable t={t}
            rows={rows} cols={cols} colWidths={colWidths}
            selectedRow={selectedRow} setSelectedRow={setSelectedRow}
            editing={editing} setEditing={setEditing}
            onCommitEdit={onCommitEdit}
            dirty={dirty}
            running={!!running}
          />
        )}
        {settingsOpen && <PSettings t={t} onClose={() => setSettingsOpen(false)} theme={theme} setTheme={setTheme} />}
      </div>
      {toast && <PToast t={t} kind={toast.kind} onClose={() => setToast(null)}>{toast.msg}</PToast>}
    </div>
  );
}

// inject prototype-only animations
if (typeof document !== 'undefined' && !document.getElementById('tt-proto-css')) {
  const s = document.createElement('style'); s.id = 'tt-proto-css';
  s.textContent = `
    @keyframes tt-toast-in { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes tt-slide-in { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes tt-fade-in  { from { opacity: 0; } to { opacity: 1; } }
    textarea::placeholder { color: inherit; opacity: .55; }
  `;
  document.head.appendChild(s);
}

ReactDOM.createRoot(document.getElementById('root')).render(<InteractiveApp />);
