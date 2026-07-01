// TamedTable — mobile prototype.
// Layout & interaction logic from mobile-html-mock.html (the "Action dock"
// wireframe); visual language, tokens, data and transformation logic from the
// desktop base (tokens.jsx · brand.jsx · components.jsx · prototype.jsx).
//
// Three-region phone: app bar (file + pager) · scrollable frozen-header table ·
// a persistent four-button dock (menu · undo · keyboard · voice). Keyboard and
// voice rise as sheets in place of the dock; undo is one tap, long-press opens
// the history sheet; the ☰ menu slides in from the left.

const { useState, useEffect, useLayoutEffect, useRef, useCallback, Fragment } = React;

// ── icon set (16×16, currentColor stroke — matches ui-kit Icon look) ──────
const M_PATHS = {
  menu: 'M2.5 4.5h11 M2.5 8h11 M2.5 11.5h11',
  undo: 'M5 5 2.5 7.5 5 10 M2.5 7.5h7.5a3.5 3.5 0 1 1 0 7H7',
  redo: 'm11 5 2.5 2.5L11 10 M13.5 7.5H6a3.5 3.5 0 1 0 0 7h3',
  kb: 'M2 4.75h12A1.25 1.25 0 0 1 15.25 6v4A1.25 1.25 0 0 1 14 11.25H2A1.25 1.25 0 0 1 .75 10V6A1.25 1.25 0 0 1 2 4.75Z M3.4 7.4h.01 M5.7 7.4h.01 M8 7.4h.01 M10.3 7.4h.01 M12.6 7.4h.01 M5.2 9.6h5.6',
  mic: 'M8 1.75a2.25 2.25 0 0 0-2.25 2.25v3.25a2.25 2.25 0 0 0 4.5 0V4A2.25 2.25 0 0 0 8 1.75Z M4.5 7.25a3.5 3.5 0 0 0 7 0 M8 10.75V13.5 M5.75 13.5h4.5',
  send: 'm2.5 8 11-5-3 12-3-5-5-2Z',
  play: 'M5 3.4 12.5 8 5 12.6Z',
  stop: 'M5 5h6v6H5z',
  x: 'm4 4 8 8 M12 4l-8 8',
  chevL: 'M10 4 6 8l4 4',
  chevR: 'M6 4l4 4-4 4',
  chevD: 'm4 6 4 4 4-4',
  plus: 'M8 3.5v9 M3.5 8h9',
  clock: 'M8 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z M8 5.3V8l2 1.3',
  file: 'M9 2H4.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5z M9 2v3h3',
  code: 'M6 5 3 8l3 3 M10 5l3 3-3 3',
  link: 'M6.6 9.4a2.4 2.4 0 0 0 3.4 0l2-2a2.4 2.4 0 0 0-3.4-3.4l-.7.7 M9.4 6.6a2.4 2.4 0 0 0-3.4 0l-2 2a2.4 2.4 0 0 0 3.4 3.4l.7-.7',
  spark: 'M8 2.4l1.3 3.4 3.3 1.2-3.3 1.2L8 11.6 6.7 8.2 3.4 7l3.3-1.2z',
  folder: 'M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6a1 1 0 0 1 .7.3l1 1H12.5A1.5 1.5 0 0 1 14 5.8v5.7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5z',
  save: 'M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M5 3v3h5V3 M5 13v-4h6v4',
  gear: 'M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z M8 2v1.5 M8 12.5V14 M2 8h1.5 M12.5 8H14 M3.5 3.5l1.1 1.1 M11.4 11.4l1.1 1.1 M3.5 12.5l1.1-1.1 M11.4 4.6l1.1-1.1',
  moon: 'M13.2 9.4A5.5 5.5 0 0 1 6.6 2.8 5.5 5.5 0 1 0 13.2 9.4Z',
  sun: 'M8 5.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z M8 1.4v1.8 M8 12.8v1.8 M1.4 8h1.8 M12.8 8h1.8 M3.4 3.4l1.3 1.3 M11.3 11.3l1.3 1.3 M3.4 12.6l1.3-1.3 M11.3 4.7l1.3-1.3',
  tour: 'M8 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z M10.3 5.7 9 9 5.7 10.3 7 7z',
  move: 'M8 2.5v11 M2.5 8h11 M6 4.7 8 2.7l2 2 M6 11.3l2 2 2-2 M4.7 6 2.7 8l2 2 M11.3 6l2 2-2 2',
  err: 'M8 2 14 13H2L8 2Z M8 7v3 M8 12v.01',
  ok: 'm3 8 3.5 3.5L13 5',
  upload: 'M8 10V3 M5 6l3-3 3 3 M2.5 11.5v1A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-1',
  check: 'm3 8 3.5 3.5L13 5',
};
const M_FILLED = new Set(['stop', 'play']);

// Every dock-input pane (keyboard · voice · history) renders at this exact
// height so switching between them never changes the sheet size.
const SHEET_H = 300;

// Entrance animations — transform-only (never hide via opacity) so a frozen /
// backgrounded tab still shows fully-visible content. Gated to reduced-motion.
if (typeof document !== 'undefined' && !document.getElementById('mob-kf')) {
  const s = document.createElement('style');
  s.id = 'mob-kf';
  s.textContent = [
    '@keyframes mob-rise-kf { from { transform: translateY(12px); } to { transform: none; } }',
    '@keyframes mob-slideL-kf { from { transform: translateX(-14px); } to { transform: none; } }',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .mob-rise { animation: mob-rise-kf .18s ease-out; }',
    '  .mob-slideL { animation: mob-slideL-kf .18s ease-out; }',
    '}',
  ].join('\n');
  document.head.appendChild(s);
}
function MIcon({ name, size = 20, style, stroke = 1.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"
      fill={M_FILLED.has(name) ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: '0 0 auto', display: 'block', ...style }} aria-hidden="true">
      <path d={M_PATHS[name]} />
    </svg>
  );
}

// ── shared primary action button (sheet "Open" / "Save" CTAs) ─────────────
// In light theme it's Aubergine ink on light text; in dark theme it's the
// accent fill — one definition instead of repeating the spec in every sheet.
function PrimaryButton({ t, onClick, disabled, height = 42, children }) {
  const dark = t.name === 'dark';
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      height, width: '100%', borderRadius: TT_S.radius,
      border: `1px solid ${dark ? t.accent : t.ink}`,
      background: dark ? t.accent : t.ink, color: dark ? t.inkOnAcc : t.inkOnInk,
      fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.md, fontWeight: 600,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: TT_S.px8,
    }}>{children}</button>
  );
}

// ── command matching + transforms (ported from prototype.jsx) ─────────────
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
  if (/(drop|remove|dedup)/.test(lc) && /(duplicate|dupes?)/.test(lc)) return { kind: 'dedupe' };
  if (/title ?case|capitali[sz]/.test(lc)) return { kind: 'titlecase' };
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
function titleCaseM(s) { return String(s || '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1)); }
function sleepM(ms) { return new Promise((res) => setTimeout(res, ms)); }

// ── animated voice waveform ───────────────────────────────────────────────
function Waveform({ color, active }) {
  const bars = 28;
  if (!document.getElementById('tt-wave-kf')) {
    const s = document.createElement('style');
    s.id = 'tt-wave-kf';
    s.textContent = '@keyframes tt-wave-kf{0%,100%{transform:scaleY(.28)}50%{transform:scaleY(1)}}';
    document.head.appendChild(s);
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 30, flex: 1 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{
          flex: 1, height: '100%', borderRadius: 2, background: color, transformOrigin: 'center',
          animation: active ? `tt-wave-kf ${0.7 + (i % 5) * 0.12}s ease-in-out ${(i % 7) * 0.06}s infinite` : 'none',
          transform: active ? undefined : 'scaleY(.3)',
        }} />
      ))}
    </div>
  );
}

// ── frozen-header / frozen-index scrollable table ─────────────────────────
function MobileTable({ t, cols, rows, colWidths, pageStart, streaming, selection, cellFlag, onSelect }) {
  const idxW = 40;
  const headerCell = {
    position: 'sticky', top: 0, zIndex: 2, background: t.surface2, color: t.ink2,
    textAlign: 'left', padding: `0 ${TT_S.px10}px`, height: TT_S.headerH, boxSizing: 'border-box',
    borderBottom: `1.5px solid ${t.line2}`, borderRight: `1px solid ${t.line}`,
    fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none',
  };
  const bodyCell = {
    padding: `0 ${TT_S.px10}px`, height: TT_S.rowH, boxSizing: 'border-box', whiteSpace: 'nowrap',
    borderBottom: `1px solid ${t.line}`, borderRight: `1px solid ${t.line}`, color: t.ink,
    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240,
  };
  return (
    <div data-tour="result" style={{ flex: 1, overflow: 'auto', position: 'relative', WebkitOverflowScrolling: 'touch', background: t.surface }}>
      {streaming && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: TT_S.px8,
          padding: `${TT_S.px6}px ${TT_S.px12}px`, background: t.accentSoft, color: t.ink,
          fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, borderBottom: `1px solid ${t.line}`,
        }}>
          <span className="tt-pulse" style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }} />
          Streaming results…
        </div>
      )}
      <table style={{ borderCollapse: 'collapse', fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr>
            <th style={{
              ...headerCell, left: 0, zIndex: 4, width: idxW, minWidth: idxW, textAlign: 'right',
              color: t.ink4, fontFamily: TT_TYPE.mono, fontWeight: 400,
            }}>#</th>
            {cols.map((col) => (
              <th key={col} style={{ ...headerCell, minWidth: colWidths ? Math.max(72, colWidths[cols.indexOf(col)]) : 96 }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const absRow = pageStart + ri;
            return (
              <tr key={absRow}>
                <td style={{
                  ...bodyCell, position: 'sticky', left: 0, zIndex: 1, width: idxW, minWidth: idxW,
                  textAlign: 'right', color: t.ink4, background: t.surface2,
                }}>{absRow + 1}</td>
                {cols.map((col, ci) => {
                  const flag = cellFlag ? cellFlag(absRow, ci) : undefined;
                  const isSel = selection && selection.row === absRow && selection.column === col;
                  const flashCls = flag === 'flash' || flag === 'flash2' ? 'tt-flash' : undefined;
                  return (
                    <td key={col} className={flashCls} onClick={() => onSelect && onSelect(absRow, col)}
                      style={{
                        ...bodyCell, cursor: 'pointer',
                        background: isSel ? t.accentSoft : flag === 'flash' ? t.cellHi : flag === 'flash2' ? t.cellHi2 : undefined,
                        boxShadow: isSel ? `inset 0 0 0 2px ${t.accent}` : undefined,
                        '--tt-hi': t.cellHi, '--tt-hi2': t.cellHi2,
                      }}>
                      {flag === 'pending'
                        ? <span className="tt-pulse" style={{ color: t.ink4 }}>…</span>
                        : (row[ci] == null || row[ci] === '')
                          ? <span style={{ color: t.ink4 }}>{row[ci] === '' ? '' : 'null'}</span>
                          : String(row[ci])}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div style={{ padding: TT_S.px16, color: t.ink3, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm }}>
          This page has 0 rows.
        </div>
      )}
      {!streaming && rows.length > 0 && (
        <div style={{
          position: 'absolute', left: '50%', top: '46%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pointerEvents: 'none',
          color: t.ink4, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, textAlign: 'center', opacity: 0.0,
        }}>
          <MIcon name="move" size={20} />drag to scroll
        </div>
      )}
    </div>
  );
}

// ── dock (bottom action bar) ──────────────────────────────────────────────
// One fixed design — "Ink Tab": a dark bar with borderless, white,
// thin-stroke icons and labels below (Menu · Undo · History · Type · Speak).
// EVERY icon — the Speak mic included — is the same white as its siblings; no
// glyph is ever tinted with the accent. In LIGHT app theme the bar is Aubergine
// ink; in DARK theme `t.ink` is near-white, so the bar is fixed to True Black.
const TRUE_BLACK = '#0c0c11';

function getDockSpec(t, dark) {
  const fg = dark ? '#ffffff' : 'rgba(255,255,255,.86)';
  return {
    outer: {
      height: 80,
      background: dark ? TRUE_BLACK : t.ink,
      borderTop: dark ? '1px solid rgba(255,255,255,.10)' : `1px solid ${t.ink}`,
    },
    btn: { width: 58, height: 66, borderRadius: 0, background: 'transparent', border: 'none', color: fg },
    labelColor: dark ? 'rgba(255,255,255,.82)' : fg,
    iconSize: 28, iconStroke: 1.15,
  };
}

function DockBtn({ v, a, onAct }) {
  return (
    <button type="button" title={a.label} data-tour={a.key} disabled={a.dis} onClick={() => { if (!a.dis) onAct(); }}
      style={{
        flex: '0 0 auto', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 3,
        cursor: a.dis ? 'default' : 'pointer', opacity: a.dis ? 0.34 : 1, position: 'relative',
        transition: 'opacity .12s, transform .12s', ...v.btn,
      }}>
      <MIcon name={a.icon} size={v.iconSize} stroke={v.iconStroke} />
      <span style={{ fontFamily: TT_TYPE.ui, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.2, lineHeight: 1, color: v.labelColor }}>{a.label}</span>
    </button>
  );
}

function Dock({ t, variant, disabled, canUndo, onMenu, onUndo, onHistory, onKeyboard, onVoice }) {
  const v = variant;
  const actions = [
    { key: 'menu', icon: 'menu', label: 'Menu', on: onMenu, dis: false },
    { key: 'undo', icon: 'undo', label: 'Undo', on: onUndo, dis: disabled || !canUndo },
    { key: 'history', icon: 'clock', label: 'History', on: onHistory, dis: disabled },
    { key: 'type', icon: 'kb', label: 'Type', on: onKeyboard, dis: disabled },
    { key: 'speak', icon: 'mic', label: 'Speak', on: onVoice, dis: disabled },
  ];
  return (
    <div className="mob-rise" style={{
      flex: '0 0 auto', display: 'flex', alignItems: 'center', overflow: 'visible', ...v.outer,
    }}>
      <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {actions.map((a) => <DockBtn key={a.key} v={v} a={a} onAct={a.on} />)}
      </div>
    </div>
  );
}

// ── faux soft keyboard (decorative; physical keyboard drives the field) ────
const KB_ROWS = [
  'qwertyuiop'.split(''),
  'asdfghjkl'.split(''),
  ['⇧', ...'zxcvbnm'.split(''), '⌫'],
];
function SoftKeyboard({ t }) {
  const key = (label, grow) => (
    <span key={label + Math.random()} style={{
      height: 38, flex: grow ? 1.6 : 1, maxWidth: grow ? 'none' : 30, display: 'flex',
      alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: t.surface,
      border: `1px solid ${t.line}`, color: t.ink2, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm,
      boxShadow: `0 1px 0 ${t.line2}`,
    }}>{label}</span>
  );
  return (
    <div style={{
      flex: '0 0 auto', background: t.surface3, padding: '8px 5px 10px', display: 'flex',
      flexDirection: 'column', gap: 7, borderTop: `1px solid ${t.line}`,
    }}>
      {KB_ROWS.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 5, justifyContent: 'center', padding: i === 1 ? '0 14px' : 0 }}>
          {r.map((k) => key(k, k === '⇧' || k === '⌫'))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
        {key('123', true)}
        <span style={{
          height: 38, flex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 6, background: t.surface, border: `1px solid ${t.line}`, color: t.ink3,
          fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs,
        }}>space</span>
        {key('return', true)}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'normalize phone numbers',
  'keep rows with Score ≥ 8',
  'add a Country column',
  'drop duplicate emails',
];

function KeyboardSheet({ t, panelBg, draft, onDraft, onSend, onClose }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  const hasDraft = draft.trim() !== '';
  return (
    <div className="mob-rise" style={{ flex: '0 0 auto', height: SHEET_H, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: panelBg || t.surface, borderTop: `1px solid ${t.line}` }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', gap: TT_S.px6, padding: `${TT_S.px8}px ${TT_S.px10}px 0`, overflowX: 'auto' }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => onDraft(s)} style={{
            flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', height: 28, lineHeight: 1,
            border: `1px solid ${t.line2}`, borderRadius: 16, padding: '0 12px',
            background: t.surface2, color: t.ink2, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs,
            whiteSpace: 'nowrap', cursor: 'pointer',
          }}>{s}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: TT_S.px8, padding: TT_S.px10 }}>
        <button type="button" onClick={onClose} title="Close keyboard" style={{
          width: 40, height: 40, flex: '0 0 auto', boxSizing: 'border-box', borderRadius: 11, border: `1px solid ${t.line2}`,
          background: 'transparent', color: t.ink3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><MIcon name="chevD" size={20} /></button>
        <div data-tour="composer" style={{
          flex: 1, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: TT_S.px8, minHeight: 40,
          border: `1.5px solid ${t.accent}`, borderRadius: 12, padding: '0 4px 0 14px', background: t.surface,
          boxShadow: `0 0 0 3px ${t.ring}`,
        }}>
          <textarea ref={ref} value={draft} rows={1} placeholder="Describe a transformation…"
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent',
              fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, lineHeight: '22px', color: t.ink, maxHeight: 80, padding: 0,
            }} />
          <button type="button" onClick={onSend} disabled={!hasDraft} title="Send" style={{
            width: 28, height: 28, flex: '0 0 auto', borderRadius: '50%', border: 'none', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: hasDraft ? 'pointer' : 'default',
            background: hasDraft ? t.accent : t.surface3, color: hasDraft ? t.inkOnAcc : t.ink4,
          }}><MIcon name="send" size={16} /></button>
        </div>
      </div>
      </div>
      <SoftKeyboard t={t} />
    </div>
  );
}

// ── voice sheet (record → send → transcribe → execute → auto-close) ───────
// While recording, nothing is recognized yet — only a waveform plays. Tapping
// send stops recording and runs recognition; the recognized text appears, the
// request executes, and the panel closes itself.
function VoiceSheet({ t, panelBg, phase, transcript, onSend, onCancel }) {
  const recording = phase === 'recording';
  return (
    <div className="mob-rise" style={{
      flex: '0 0 auto', height: SHEET_H, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      padding: '16px 16px 18px', background: panelBg || t.surface, borderTop: `1px solid ${t.line}`,
    }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: TT_S.px16 }}>
        <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.md, color: t.ink, lineHeight: 1.5, minHeight: 22 }}>
          {recording
            ? <span style={{ color: t.ink4 }}>Listening…</span>
            : transcript
              ? transcript
              : <span style={{ color: t.ink4 }}>…</span>}
        </div>
        <div style={{ color: t.accent }}>
          <Waveform color={recording ? t.accent : t.ink4} active={recording} />
        </div>
        {phase === 'sending' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: TT_S.px8, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, color: t.ink3 }}>
            <span className="tt-spin" style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${t.line2}`, borderTopColor: t.ink2 }} />
            Transcribing & running…
          </div>
        )}
      </div>
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: TT_S.px10, marginTop: TT_S.px12 }}>
        <button type="button" onClick={onCancel} title="Cancel" disabled={phase === 'sending'} style={{
          width: 40, height: 40, borderRadius: 12, border: `1px solid ${t.line2}`, background: 'transparent',
          color: t.ink2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: phase === 'sending' ? 'default' : 'pointer', opacity: phase === 'sending' ? 0.4 : 1,
        }}><MIcon name="x" size={18} /></button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onSend} disabled={phase === 'sending'} title="Send"
          className={recording ? 'tt-rec-ring' : undefined}
          style={{
            width: 52, height: 52, borderRadius: '50%', border: 'none',
            background: phase === 'sending' ? t.surface3 : t.accent, color: phase === 'sending' ? t.ink4 : t.inkOnAcc,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: phase === 'sending' ? 'default' : 'pointer',
            paddingLeft: 3,
            '--tt-rec-55': `color-mix(in srgb, ${t.rec} 55%, transparent)`,
            '--tt-rec-0': `color-mix(in srgb, ${t.rec} 0%, transparent)`,
          }}>
          <MIcon name="play" size={22} />
        </button>
      </div>
    </div>
  );
}

// ── left menu drawer ──────────────────────────────────────────────────────
function MenuItem({ t, icon, label, value, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={onClick} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: TT_S.px12, padding: '11px 18px', width: '100%',
        border: 0, background: hover ? t.surface3 : 'transparent', color: t.ink, cursor: 'pointer',
        fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, textAlign: 'left',
      }}>
      <span style={{ color: t.ink3, display: 'flex' }}><MIcon name={icon} size={18} /></span>
      <span style={{ flex: 1 }}>{label}</span>
      {value && <span style={{ fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.xs, color: t.ink3 }}>{value}</span>}
    </button>
  );
}
function MenuDrawer({ t, dark, loaded, onClose, act }) {
  const sep = <div style={{ height: 1, background: t.line, margin: '7px 0' }} />;
  return (
    <div style={{ display: 'contents' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: t.overlay, zIndex: 40 }} />
      <div className="mob-slideL" style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '80%', maxWidth: 320, zIndex: 41,
        background: t.surface, borderRight: `1px solid ${t.line2}`, boxShadow: t.shadowLg,
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', borderBottom: `1px solid ${t.line}` }}>
          <Lockup size={TT_TYPE.lg} color={t.ink} dark={dark} />
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} title="Close" style={{
            background: 'transparent', border: 0, padding: 4, color: t.ink3, cursor: 'pointer', display: 'flex',
          }}><MIcon name="x" size={18} /></button>
        </div>
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
          <MenuItem t={t} icon="spark" label="Open sample…" onClick={() => act('open-sample')} />
          <MenuItem t={t} icon="folder" label="Open local…" onClick={() => act('open-local')} />
          <MenuItem t={t} icon="link" label="Open URL…" onClick={() => act('open-url')} />
          {sep}
          <MenuItem t={t} icon="save" label="Save data" onClick={() => act('save-data')} />
          <MenuItem t={t} icon="save" label="Save data as…" onClick={() => act('save-data-as')} />
          {sep}
          <MenuItem t={t} icon="file" label="Save recipe…" onClick={() => act('save-recipe')} />
          <MenuItem t={t} icon="code" label="Save recipe as Python…" onClick={() => act('save-python')} />
          {sep}
          <MenuItem t={t} icon={dark ? 'sun' : 'moon'} label="Dark mode" value={dark ? 'on' : 'off'} onClick={() => act('toggle-dark')} />
          <MenuItem t={t} icon="gear" label="Settings…" onClick={() => act('settings')} />
          <MenuItem t={t} icon="tour" label="Tours…" onClick={() => act('tours')} />
        </div>
      </div>
    </div>
  );
}

// ── history bottom sheet (long-press undo) ────────────────────────────────
function relTime(ts, now) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 8) return 'now';
  if (s < 60) return s + 's';
  const m = Math.round(s / 60);
  return m + 'm';
}
function HistorySheet({ t, panelBg, labels, times, cursor, now, onClose, onJump, onUndo, onRedo }) {
  // newest at top
  const order = labels.map((_, i) => i).reverse();
  const navBtn = (icon, label, on, enabled) => (
    <button type="button" onClick={on} disabled={!enabled} title={label} style={{
      height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${t.line2}`, background: 'transparent',
      color: enabled ? t.ink2 : t.ink4, cursor: enabled ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: TT_S.px6,
      fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 500,
    }}><MIcon name={icon} size={16} />{label}</button>
  );
  return (
    <div className="mob-rise" style={{
      flex: '0 0 auto', height: SHEET_H, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      background: panelBg || t.surface, borderTop: `1px solid ${t.line}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: TT_S.px8, padding: '10px 10px 9px', borderBottom: `1px solid ${t.line}` }}>
        <button type="button" onClick={onClose} title="Close history" style={{
          width: 36, height: 36, flex: '0 0 auto', borderRadius: 10, border: `1px solid ${t.line2}`,
          background: 'transparent', color: t.ink3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><MIcon name="chevD" size={20} /></button>
        <span style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, fontWeight: 700, letterSpacing: 0.7, color: t.ink3 }}>HISTORY</span>
        <span style={{ flex: 1 }} />
        {navBtn('undo', 'Undo', onUndo, cursor > 0)}
        {navBtn('redo', 'Redo', onRedo, cursor < labels.length - 1)}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {order.map((i) => {
          const state = i > cursor ? 'undone' : i === cursor ? 'cur' : 'done';
          return (
            <button key={i} type="button" onClick={() => onJump(i)} style={{
              display: 'flex', alignItems: 'center', gap: TT_S.px12, width: '100%', padding: '11px 18px',
              border: 0, borderBottom: `1px solid ${t.line}`, background: state === 'cur' ? t.accentSoft : 'transparent',
              color: state === 'undone' ? t.ink4 : t.ink, cursor: 'pointer', textAlign: 'left',
              fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: state === 'cur' ? 600 : 400,
            }}>
              <span style={{
                width: 11, height: 11, borderRadius: '50%', flex: '0 0 auto',
                border: `1.5px ${state === 'undone' ? 'dashed' : 'solid'} ${state === 'cur' ? t.accent : t.ink4}`,
                background: state === 'cur' ? t.accent : 'transparent',
              }} />
              <span style={{ flex: 1 }}>{labels[i]}</span>
              <span style={{ fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.micro, color: t.ink4 }}>{relTime(times[i], now)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── generic bottom sheet (settings / open-url / tours) ────────────────────
function BottomSheet({ t, title, onClose, children, tall }) {
  return (
    <div style={{ display: 'contents' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: t.overlay, zIndex: 50 }} />
      <div className="mob-rise" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 51, maxHeight: tall ? '88%' : '70%',
        background: t.name === 'dark' ? '#0c0c11' : t.surface, borderTop: `1px solid ${t.line2}`, borderRadius: '16px 16px 0 0',
        boxShadow: t.shadowLg, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${t.line}` }}>
          <span style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.md, fontWeight: 600, color: t.ink }}>{title}</span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} title="Close" style={{
            background: 'transparent', border: 0, padding: 4, color: t.ink3, cursor: 'pointer', display: 'flex',
          }}><MIcon name="x" size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: TT_S.px16 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Open from URL — URL field only (no samples) ───────────────────────────
function OpenUrlBody({ t, onLoad, loading, error, setError }) {
  const [url, setUrl] = useState('');
  const submit = () => {
    const sample = SAMPLE_FILES.find((s) => url === s.url || url.endsWith(s.name));
    if (sample) onLoad(sample.name);
    else setError('Could not fetch the URL — the server did not allow cross-origin requests. (In this prototype, a TamedTable sample URL loads.)');
  };
  const input = {
    width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: `1px solid ${t.line2}`,
    borderRadius: TT_S.radius, background: t.surface2, fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, color: t.ink, outline: 'none',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: TT_S.px14 }}>
      <div>
        <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 600, color: t.ink, marginBottom: TT_S.px4 }}>URL</div>
        <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, lineHeight: 1.5, color: t.ink3, marginBottom: TT_S.px8 }}>
          Paste a link to a .csv or .jsonl file.
        </div>
        <input type="url" value={url} placeholder="https://example.com/data.csv" spellCheck={false} autoFocus
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} style={input} />
      </div>
      {error && (
        <div style={{
          padding: '9px 11px', border: `1px solid ${t.err}`, background: t.errSoft, borderRadius: TT_S.radius,
          color: t.err, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, lineHeight: 1.45, display: 'flex', gap: TT_S.px8,
        }}><MIcon name="err" size={16} /><span style={{ flex: 1 }}>{error}</span></div>
      )}
      <PrimaryButton t={t} onClick={submit} disabled={!url.trim() || loading}>{loading ? 'Opening…' : 'Open'}</PrimaryButton>
    </div>
  );
}

// ── Open sample — pick from the bundled sample set ────────────────────────
function SampleListBody({ t, onOpen }) {
  const [sel, setSel] = useState(SAMPLE_FILES[0].name);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: TT_S.px14 }}>
      <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, lineHeight: 1.5, color: t.ink3 }}>
        Choose a bundled dataset to open.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: TT_S.px6 }}>
        {SAMPLE_FILES.map((s) => {
          const on = s.name === sel;
          return (
            <button key={s.name} type="button" onClick={() => setSel(s.name)} style={{
              display: 'flex', alignItems: 'center', gap: TT_S.px10, padding: '11px 12px', borderRadius: TT_S.radius,
              border: `1.5px solid ${on ? t.accent : t.line2}`, background: on ? t.accentSoft : t.surface2,
              color: t.ink, cursor: 'pointer', textAlign: 'left', width: '100%',
            }}>
              <span style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.micro, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: on ? t.accentInk || t.ink2 : t.ink3, minWidth: 34 }}>{sampleKind(s.name)}</span>
              <span style={{ flex: 1, fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm }}>{s.name}</span>
              {on && <MIcon name="check" size={16} style={{ color: t.accent }} />}
            </button>
          );
        })}
      </div>
      <PrimaryButton t={t} onClick={() => onOpen(sel)}>Open</PrimaryButton>
    </div>
  );
}

// ── Open local — a mock OS file-open dialog ───────────────────────────────
const LOCAL_FILES = [
  { name: 'customers.csv', meta: 'Downloads · 18 KB · today' },
  { name: 'q4-leads.csv', meta: 'Downloads · 42 KB · yesterday' },
  { name: 'orders.jsonl', meta: 'Documents · 7 KB · Mar 14' },
  { name: 'contacts-export.csv', meta: 'Desktop · 96 KB · Mar 9' },
];
function LocalFileBody({ t, onOpen }) {
  const [sel, setSel] = useState(LOCAL_FILES[0].name);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: TT_S.px12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: TT_S.px8, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, color: t.ink3 }}>
        <MIcon name="folder" size={15} /><span>Downloads</span>
      </div>
      <div style={{ border: `1px solid ${t.line2}`, borderRadius: TT_S.radius, background: t.surface2, overflow: 'hidden' }}>
        {LOCAL_FILES.map((f, i) => {
          const on = f.name === sel;
          return (
            <button key={f.name} type="button" onClick={() => setSel(f.name)} onDoubleClick={() => onOpen(f.name)} style={{
              display: 'flex', alignItems: 'center', gap: TT_S.px10, width: '100%', padding: '10px 12px',
              border: 0, borderTop: i === 0 ? 0 : `1px solid ${t.line}`, background: on ? t.accentSoft : 'transparent',
              color: t.ink, cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{ color: on ? t.accent : t.ink3, display: 'flex' }}><MIcon name="file" size={18} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, fontWeight: on ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                <span style={{ display: 'block', fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.micro, color: t.ink4 }}>{f.meta}</span>
              </span>
            </button>
          );
        })}
      </div>
      <PrimaryButton t={t} onClick={() => onOpen(sel)}>Open</PrimaryButton>
    </div>
  );
}

// ── mobile save sheet — filename + destination, then "saves" (toasts) ──────
// On phones there's no OS save dialog; the native pattern is a bottom save
// sheet with an editable filename, then the browser hands the file to the
// device (Downloads / Files share sheet). Here it confirms with a toast.
function SaveSheet({ t, cfg, onSave, onClose }) {
  const [name, setName] = useState(cfg.filename);
  const ext = cfg.ext;
  const valid = name.trim() !== '';
  const input = {
    flex: 1, boxSizing: 'border-box', padding: '10px 11px', border: `1px solid ${t.line2}`,
    borderRadius: TT_S.radius, background: t.surface2, fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, color: t.ink, outline: 'none', minWidth: 0,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: TT_S.px14 }}>
      <div>
        <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 600, color: t.ink, marginBottom: TT_S.px6 }}>File name</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: TT_S.px8 }}>
          <input type="text" value={name} spellCheck={false} autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && valid) onSave(name.trim() + ext); }} style={input} />
          <span style={{ fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, color: t.ink3, flex: '0 0 auto' }}>{ext}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: TT_S.px10, padding: '10px 11px', border: `1px solid ${t.line2}`, borderRadius: TT_S.radius, background: t.surface2 }}>
        <span style={{ color: t.ink3, display: 'flex' }}><MIcon name="folder" size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, color: t.ink }}>On My Phone — Downloads</div>
          <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.micro, color: t.ink4 }}>{cfg.note}</div>
        </div>
      </div>
      <PrimaryButton t={t} onClick={() => valid && onSave(name.trim() + ext)} disabled={!valid} height={44}>
        <MIcon name="save" size={18} />Save
      </PrimaryButton>
    </div>
  );
}

// ── toasts (bottom-center inside the phone) ───────────────────────────────
function MToasts({ t, toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'absolute', left: 12, right: 12, bottom: 78, zIndex: 60, display: 'flex', flexDirection: 'column', gap: TT_S.px8 }}>
      {toasts.map((toast) => {
        const isErr = toast.kind === 'error';
        return (
          <div key={toast.id} className="mob-rise" style={{
            display: 'flex', alignItems: 'flex-start', gap: TT_S.px8, padding: '10px 12px', borderRadius: TT_S.radius,
            background: t.surface, color: t.ink, border: `1px solid ${isErr ? t.err : t.line2}`,
            borderLeft: `3px solid ${isErr ? t.err : t.ok}`, boxShadow: t.shadowLg,
            fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, lineHeight: 1.45,
          }}>
            <span style={{ flex: '0 0 auto', marginTop: 1, color: isErr ? t.err : t.ok }}><MIcon name={isErr ? 'err' : 'ok'} size={16} /></span>
            <div style={{ flex: 1 }}>{toast.message}</div>
            <button type="button" onClick={() => onDismiss(toast.id)} style={{ background: 'transparent', border: 0, padding: 2, color: t.ink3, cursor: 'pointer', display: 'flex' }}>
              <MIcon name="x" size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── status bar + app bar ──────────────────────────────────────────────────
function StatusBar({ t }) {
  return (
    <div style={{ height: 26, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
      <span style={{ fontFamily: TT_TYPE.ui, fontSize: 12, fontWeight: 600, color: t.ink2 }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: t.ink2 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="4.5" width="3" height="6.5" rx="1"/><rect x="9" y="2" width="3" height="9" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1" opacity="0.35"/></svg>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="18" height="10" rx="2.5"/><rect x="2" y="2" width="13" height="7" rx="1.2" fill="currentColor"/><rect x="19.5" y="3.5" width="1.6" height="4" rx="0.8" fill="currentColor"/></svg>
      </div>
    </div>
  );
}
function AppBar({ t, fileName, page, pageCount, onPrev, onNext }) {
  const navBtn = (dir, on) => (
    <button type="button" onClick={on} disabled={!on} title={dir === 'prev' ? 'Previous page' : 'Next page'} style={{
      width: 34, height: 34, borderRadius: 9, border: 0, background: 'transparent', cursor: on ? 'pointer' : 'default',
      color: on ? t.ink2 : t.ink4, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}><MIcon name={dir === 'prev' ? 'chevL' : 'chevR'} size={20} /></button>
  );
  return (
    <div style={{ height: 46, flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: TT_S.px8, padding: '0 10px', borderBottom: `1px solid ${t.line}`, background: t.surface }}>
      {navBtn('prev', page > 1 ? onPrev : null)}
      <div style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <span style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, fontWeight: 600, color: t.ink }}>{fileName}</span>
        <span style={{ fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.xs, color: t.ink3, marginLeft: 6 }}>· {page} of {pageCount}</span>
      </div>
      {navBtn('next', page < pageCount ? onNext : null)}
    </div>
  );
}

// ── empty / first-run state ───────────────────────────────────────────────
function EmptyState({ t, dark, onOpenSample, onOpenLocal, onOpenUrl }) {
  const opt = (icon, label, on) => (
    <button key={label} type="button" onClick={on} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: TT_S.px10, border: `1px solid ${t.line2}`,
      borderRadius: 12, padding: '13px 14px', background: t.surface, color: t.ink, cursor: 'pointer',
      fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, textAlign: 'left',
    }}>
      <span style={{ color: t.ink3, display: 'flex' }}><MIcon name={icon} size={18} /></span>{label}
    </button>
  );
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: TT_S.px16, padding: '26px 22px', background: t.surface }}>
      <Lockup size={28} color={t.ink} dark={dark} twoRow />
      <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.lg, fontWeight: 600, color: t.ink2, textAlign: 'center' }}>What table can I tame?</div>
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: TT_S.px8 }}>
        {opt('spark', 'Open sample…', onOpenSample)}
        {opt('folder', 'Open local…', onOpenLocal)}
        {opt('link', 'Open URL…', onOpenUrl)}
      </div>
    </div>
  );
}

// Fixed device frame — iPhone SE (375 × 667, 16:9-ish).
const DEVICE = { name: 'iPhone SE', w: 375, h: 667 };

// ── guided tours — the marketing "Clean up" tours ─────────────────────────
// Source of truth: spec/test-cases/clean-up.feature (@cat-cleanup). Each tour
// is the Background `load "customers-input.csv"` + one `query "…"` phrase. The
// runtime mirrors @tamedtable/gherkin-tour: a forward-only Driver.js-style
// spotlight — one button (Next → / Done), "X of Y" progress that *includes* the
// terminal stop, Space/→/Enter advance, Esc cancels, overlay-click does nothing,
// and a terminal stop reading `Voilà, "<tour>" is done.`
const TOUR_SAMPLE = 'customers-input.csv';
const CLEANUP_TOURS = [
  { name: 'Normalize the phone numbers', query: 'normalize the phone numbers' },
  { name: 'Make the country names consistent', query: 'make the country names consistent' },
  { name: 'Fix the capitalization of names', query: 'fix the capitalization of names' },
  { name: 'Clean up the birth dates', query: 'clean up the birth dates' },
];
// Only the executable stops survive a parse (load → query); the trailing
// verification collapses into the terminal stop. Instruction text drops the
// Gherkin keyword; a `query` stop reads simply "Run the query".
function tourStops(tour) {
  return [
    { kind: 'load', target: 'menu', instr: `Load "${TOUR_SAMPLE}"` },
    { kind: 'query', target: 'composer', instr: 'Run the query' },
    { kind: 'done', target: 'result', instr: `Voilà, “${tour.name}” is done.` },
  ];
}

// Driver.js-style spotlight: a dimmed backdrop with a cut-out hole around the
// step's target plus a single-button popover. Measures the target inside the
// (CSS-scaled) phone and works in phone-space coordinates.
function TourSpotlight({ t, phoneRef, stop, stepNum, total, onNext }) {
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const phone = phoneRef.current;
      if (!phone) { setBox(null); return; }
      const el = stop.target ? phone.querySelector(`[data-tour="${stop.target}"]`) : null;
      if (!el) { setBox(null); return; }
      const pr = phone.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const scale = pr.width / phone.offsetWidth || 1;
      setBox({ x: (r.left - pr.left) / scale, y: (r.top - pr.top) / scale, w: r.width / scale, h: r.height / scale });
    };
    measure();
    const id = setTimeout(measure, 280); // let a freshly-opened sheet settle
    window.addEventListener('resize', measure);
    return () => { clearTimeout(id); window.removeEventListener('resize', measure); };
  }, [phoneRef, stop.target, stepNum]);

  const PH = 667;
  const below = box && box.y < PH * 0.4;
  const pop = box
    ? (below ? { top: Math.min(PH - 160, box.y + box.h + 12) } : { bottom: Math.max(12, PH - box.y + 12) })
    : { top: '46%' };
  const isDone = stop.kind === 'done';
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70 }}>
      {/* click shield — an accidental overlay click does NOT cancel */}
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, background: box ? 'transparent' : 'rgba(8,6,20,.55)' }} />
      {box && (
        <div style={{
          position: 'absolute', left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12,
          borderRadius: 12, boxShadow: '0 0 0 9999px rgba(8,6,20,.55)', pointerEvents: 'none',
          transition: 'left .2s ease, top .2s ease, width .2s ease, height .2s ease',
        }} />
      )}
      <div className="mob-rise" style={{
        position: 'absolute', left: 12, right: 12, ...pop, zIndex: 71,
        background: t.surface, border: `1px solid ${t.line2}`, borderRadius: 12, boxShadow: t.shadowLg,
        padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: TT_S.px10,
      }}>
        <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, lineHeight: 1.5, color: t.ink }}>{stop.instr}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: TT_S.px10 }}>
          <span style={{ fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.xs, color: t.ink3 }}>{stepNum} of {total}</span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onNext} style={{
            height: 34, padding: '0 16px', borderRadius: 9, border: 'none',
            background: t.name === 'dark' ? t.accent : t.ink, color: t.name === 'dark' ? t.inkOnAcc : t.inkOnInk,
            fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 600, cursor: 'pointer',
          }}>{isDone ? 'Done' : 'Next →'}</button>
        </div>
      </div>
    </div>
  );
}

// ── root ──────────────────────────────────────────────────────────────────
const MOBILE_PAGE = 12;
const THEME_KEY = 'tt-theme-mobile';

function MobileApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  useEffect(() => { try { localStorage.setItem(THEME_KEY, theme); } catch (e) {} }, [theme]);
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const dark = theme === 'dark';

  // responsive scaling of the fixed phone
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800));
  useEffect(() => {
    const on = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // history: snapshots[] of {cols,rows,colWidths}, parallel labels[]/times[], cursor
  const [loaded, setLoaded] = useState(false);
  const [fileName, setFileName] = useState('customers.csv');
  const [snapshots, setSnapshots] = useState([]);
  const [labels, setLabels] = useState([]);
  const [times, setTimes] = useState([]);
  const [cursor, setCursor] = useState(-1);

  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState(null);

  // input + overlays
  const [inputMode, setInputMode] = useState('none'); // none | keyboard | voice
  const [overlay, setOverlay] = useState('none');       // none | menu | history | settings | openurl | tours | save
  const [saveCfg, setSaveCfg] = useState(null);
  const [draft, setDraft] = useState('');
  const [voicePhase, setVoicePhase] = useState('idle');
  const [voiceText, setVoiceText] = useState('');
  const voiceTimers = useRef([]);

  // guided "Clean up" tour driver: { idx, stop } | null
  const [tour, setTour] = useState(null);
  const phoneRef = useRef(null);
  const inTourRef = useRef(false);

  // streaming / AI run
  const [streaming, setStreaming] = useState(false);
  const [live, setLive] = useState(null);
  const [aiRun, setAiRun] = useState(null);

  const [toasts, setToasts] = useState([]);
  const toastId = useRef(1);
  const [dialogErr, setDialogErr] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (inputMode !== 'history') return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [inputMode]);

  const addToast = (kind, message) => {
    if (inTourRef.current) return; // tours replay key-free — no toast is shown
    const id = toastId.current++;
    setToasts((ts) => [...ts, { id, kind, message }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3600);
  };

  const cur = cursor >= 0 ? snapshots[cursor] : null;
  const view = (streaming && live) ? live : cur;
  const cols = view ? view.cols : [];
  const rows = view ? view.rows : [];
  const colWidths = view ? view.colWidths : [];
  const pageCount = Math.max(1, Math.ceil(rows.length / MOBILE_PAGE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * MOBILE_PAGE;
  const pageRows = rows.slice(pageStart, pageStart + MOBILE_PAGE);

  const commit = (state, label) => {
    setSnapshots((s) => { const base = s.slice(0, cursor + 1); return [...base, state]; });
    setLabels((l) => { const base = l.slice(0, cursor + 1); return [...base, label]; });
    setTimes((tm) => { const base = tm.slice(0, cursor + 1); return [...base, Date.now()]; });
    setCursor((c) => c + 1);
  };

  const loadSample = (name) => {
    const state = { cols: SAMPLE_COLS.slice(), rows: SAMPLE_ROWS.map((r) => r.slice()), colWidths: COL_WIDTHS.slice() };
    setSnapshots([state]); setLabels([`Imported ${name}`]); setTimes([Date.now()]); setCursor(0);
    setFileName(name); setLoaded(true); setPage(1); setSelection(null);
    setOverlay('none'); setInputMode('none');
    addToast('info', `Loaded ${name} (20 rows × 6 cols).`);
  };

  const doUndo = () => {
    if (cursor <= 0) return;
    setCursor((c) => c - 1); setPage(1); setSelection(null);
    addToast('info', 'Undid the last transformation.');
  };
  const doRedo = () => {
    if (cursor >= snapshots.length - 1) return;
    setCursor((c) => c + 1); setPage(1); setSelection(null);
    addToast('info', 'Redid the transformation.');
  };
  const jumpTo = (i) => { setCursor(i); setPage(1); setSelection(null); };

  // ── run a transformation ────────────────────────────────────────────────
  const runAiColumn = async (baseRows, baseCols, baseWidths, label, summaryPrefix) => {
    const pi = baseCols.indexOf('Phone');
    const colIdx = baseCols.length;
    const newCols = [...baseCols, 'Country'];
    const newWidths = [...baseWidths, 110];
    const values = baseRows.map((r) => countryOf(r[pi]));
    let curRows = baseRows.map((r) => [...r, null]);
    setLive({ cols: newCols, rows: curRows, colWidths: newWidths });
    setAiRun({ colIdx, filled: 0, total: curRows.length });
    setPage(1);
    for (let i = 0; i < curRows.length; i++) {
      await sleepM(150);
      curRows = curRows.map((r, ri) => (ri === i ? [...r.slice(0, colIdx), values[i]] : r));
      setLive({ cols: newCols, rows: curRows, colWidths: newWidths });
      setAiRun({ colIdx, filled: i + 1, total: curRows.length });
    }
    await sleepM(700);
    setAiRun(null);
    commit({ cols: newCols, rows: curRows, colWidths: newWidths }, label);
    addToast('info', `${summaryPrefix}Added Country — ${curRows.length} cells filled by gemini-3.5-flash.`);
  };

  const runCommand = async (textArg) => {
    const text = (textArg != null ? textArg : draft).trim();
    if (!text || streaming) return;
    setDraft('');
    setInputMode('none');

    if (text === ':undo') { doUndo(); return; }
    if (text === ':redo') { doRedo(); return; }
    if (text === ':save') { addToast('info', `Saved ${fileName}.`); return; }

    if (!loaded) { addToast('error', 'No table is loaded. Open a file or sample first.'); return; }
    const cmd = matchCommand(text);
    if (!cmd) {
      addToast('error', 'Could not map that to a transformation. Try “normalize phone numbers”, “keep rows with Score ≥ 8”, “add a Country column”, or “sort by Name”.');
      return;
    }

    setStreaming(true);
    setSelection(null);
    await sleepM(750);

    const base = snapshots[cursor];
    const bCols = base.cols, bRows = base.rows, bW = base.colWidths;

    if (cmd.kind === 'normalize') {
      const pi = bCols.indexOf('Phone');
      let n = 0;
      const out = bRows.map((r) => { const c = r.slice(); const v = normalizePhone(c[pi]); if (v !== c[pi]) n++; c[pi] = v == null ? '' : v; return c; });
      commit({ cols: bCols, rows: out, colWidths: bW }, 'Normalize Phone → E.164');
      const empties = out.filter((r) => r[pi] === '').length;
      addToast('info', `Normalized ${n} phone numbers to E.164.${empties ? ` ${empties} stayed null.` : ''}`);
    } else if (cmd.kind === 'filter') {
      const si = bCols.indexOf('Score');
      const kept = bRows.filter((r) => parseFloat(r[si]) >= cmd.threshold);
      commit({ cols: bCols, rows: kept, colWidths: bW }, `Keep Score ≥ ${cmd.threshold}`);
      setPage(1);
      addToast('info', `Kept ${kept.length} of ${bRows.length} rows (Score ≥ ${cmd.threshold}).`);
    } else if (cmd.kind === 'ai') {
      await runAiColumn(bRows, bCols, bW, 'Add Country (AI)', '');
    } else if (cmd.kind === 'filter+ai') {
      const si = bCols.indexOf('Score');
      const kept = bRows.filter((r) => parseFloat(r[si]) >= cmd.threshold);
      await runAiColumn(kept, bCols, bW, `Keep Score ≥ ${cmd.threshold} · Add Country`, `Kept ${kept.length} of ${bRows.length} rows. `);
    } else if (cmd.kind === 'dedupe') {
      const ei = bCols.indexOf('Email');
      const seen = new Set();
      const out = bRows.filter((r) => { const k = String(r[ei]).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      commit({ cols: bCols, rows: out, colWidths: bW }, 'Remove duplicate emails');
      addToast('info', `Removed ${bRows.length - out.length} duplicate email${bRows.length - out.length === 1 ? '' : 's'} — ${out.length} rows remain.`);
    } else if (cmd.kind === 'titlecase') {
      const ni = bCols.indexOf('Name');
      const out = bRows.map((r) => { const c = r.slice(); c[ni] = titleCaseM(c[ni]); return c; });
      commit({ cols: bCols, rows: out, colWidths: bW }, 'Title-case Name');
      addToast('info', `Converted ${out.length} names to Title Case.`);
    } else if (cmd.kind === 'sort') {
      const ci = bCols.findIndex((c) => c.toLowerCase() === cmd.column);
      if (ci < 0) {
        addToast('error', `No column named “${cmd.column}”. Columns: ${bCols.join(', ')}.`);
      } else {
        const numeric = bRows.every((r) => r[ci] === '' || !isNaN(parseFloat(r[ci])));
        const sorted = bRows.slice().sort((a, b) => {
          const x = numeric ? parseFloat(a[ci]) || 0 : String(a[ci]);
          const y = numeric ? parseFloat(b[ci]) || 0 : String(b[ci]);
          return (x < y ? -1 : x > y ? 1 : 0) * (cmd.desc ? -1 : 1);
        });
        commit({ cols: bCols, rows: sorted, colWidths: bW }, `Sort by ${bCols[ci]}${cmd.desc ? ' desc' : ''}`);
        addToast('info', `Sorted by ${bCols[ci]}${cmd.desc ? ' (descending)' : ''}.`);
      }
    }
    setLive(null);
    setStreaming(false);
  };

  // ── "Clean up" tour driver (forward-only, gherkin-tour semantics) ─────────
  useEffect(() => { inTourRef.current = !!tour; }, [tour]);
  const startTour = (idx) => { setOverlay('none'); setInputMode('none'); setSelection(null); setTour({ idx, stop: 0 }); };
  const cancelTour = () => { setTour(null); setInputMode('none'); setDraft(''); };
  const advanceTour = () => {
    if (!tour) return;
    const tr = CLEANUP_TOURS[tour.idx];
    if (tour.stop === 0) {            // load-file: run it, then advance
      loadSample(TOUR_SAMPLE);
      setTour({ idx: tour.idx, stop: 1 });
    } else if (tour.stop === 1) {     // prefill-chat: run the query, then advance
      setInputMode('none');
      runCommand(tr.query);
      setTour({ idx: tour.idx, stop: 2 });
    } else {                          // terminal stop: Done
      cancelTour();
    }
  };
  // On the query stop, open the composer and type the phrase so the spotlight
  // lands on a filled chat input (popover reads "Run the query").
  useEffect(() => {
    if (tour && tour.stop === 1) { setInputMode('keyboard'); setDraft(CLEANUP_TOURS[tour.idx].query); }
  }, [tour]);
  // Forward-only keys: Space/→/Enter advance · Esc cancels.
  useEffect(() => {
    if (!tour) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cancelTour(); }
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); advanceTour(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour]);
  // Single-press mic → recording (waveform only; nothing recognized yet). Tap
  // send → recognition runs, recognized text appears, request executes, and the
  // pane closes itself once the run kicks off.
  const RECOGNIZED = 'keep rows with Score ≥ 8, add a Country column from each phone number';
  const recordingRef = useRef(false);
  const clearVoice = () => { voiceTimers.current.forEach(clearTimeout); voiceTimers.current = []; };
  const startVoice = () => {
    if (!loaded || streaming) { if (!loaded) addToast('error', 'Open a table first.'); return; }
    recordingRef.current = true;
    setInputMode('voice'); setVoicePhase('recording'); setVoiceText('');
  };
  const sendVoice = () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setVoicePhase('sending');
    setVoiceText(RECOGNIZED); // recognition happens now, after recording stops
    voiceTimers.current.push(setTimeout(() => {
      setVoicePhase('idle'); setVoiceText('');
      runCommand(RECOGNIZED); // runCommand closes the pane (setInputMode('none'))
    }, 1100));
  };
  const cancelVoice = () => { clearVoice(); recordingRef.current = false; setInputMode('none'); setVoicePhase('idle'); setVoiceText(''); };

  // ── menu actions ────────────────────────────────────────────────────────
  const menuAct = (a) => {
    if (a === 'open-sample') { setOverlay('opensample'); return; }
    if (a === 'open-local') { setOverlay('openlocal'); return; }
    if (a === 'open-url') { setOverlay('openurl'); setDialogErr(null); return; }
    if (a === 'toggle-dark') { setTheme((m) => (m === 'dark' ? 'light' : 'dark')); return; }
    if (a === 'settings') { setOverlay('settings'); return; }
    if (a === 'tours') { setOverlay('tours'); return; }
    setOverlay('none');
    if (a === 'save-data') addToast('info', `Saved ${fileName} (${rows.length} rows × ${cols.length} cols).`);
    else if (a === 'save-data-as') { setSaveCfg({ title: 'Save data as', filename: fileName.replace(/\.\w+$/, '') + '-copy', ext: '.' + (fileName.split('.').pop() || 'csv'), note: `${rows.length} rows × ${cols.length} cols`, kind: 'data' }); setOverlay('save'); }
    else if (a === 'save-recipe') { setSaveCfg({ title: 'Save recipe', filename: fileName.replace(/\.\w+$/, ''), ext: '.recipe', note: `${Math.max(0, cursor)} replayable step${cursor === 1 ? '' : 's'}`, kind: 'recipe' }); setOverlay('save'); }
    else if (a === 'save-python') { setSaveCfg({ title: 'Save recipe as Python', filename: fileName.replace(/\.\w+$/, '') + '-recipe', ext: '.py', note: 'Replayable pandas script', kind: 'python' }); setOverlay('save'); }
  };

  const keyOpen = inputMode === 'keyboard';
  const voiceOpen = inputMode === 'voice';
  const histOpen = inputMode === 'history';

  // phone sizing — fixed iPhone SE logical size, scaled to fit the viewport
  const radius = DEVICE.h < 700 ? 26 : 46;
  const phoneStyle = {
    width: '100%', height: '100%', position: 'relative',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.surface,
    color: t.ink, fontFamily: TT_TYPE.ui,
    border: `1px solid ${dark ? 'rgba(255,255,255,.08)' : 'rgba(40,28,96,.10)'}`,
    borderRadius: radius, boxShadow: dark ? '0 30px 80px rgba(0,0,0,.5)' : '0 30px 80px rgba(40,28,96,.18)',
  };
  const MARGIN = 24;
  const availW = Math.max(160, vw - MARGIN * 2);
  const availH = Math.max(240, vh - MARGIN * 2);
  const scale = Math.min(availW / DEVICE.w, availH / DEVICE.h, 1);
  const dockVariant = getDockSpec(t, dark);
  const panelBg = dark ? TRUE_BLACK : t.surface;

  const cellFlag = aiRun ? (absRow, colIdx) => {
    if (colIdx !== aiRun.colIdx) return undefined;
    if (absRow >= aiRun.filled) return 'pending';
    if (absRow === aiRun.filled - 1) return 'flash';
    return 'flash2';
  } : undefined;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'stretch' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: MARGIN }}>
        <div style={{ width: DEVICE.w * scale, height: DEVICE.h * scale, flex: '0 0 auto' }}>
          <div style={{ width: DEVICE.w, height: DEVICE.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <div style={phoneStyle} ref={phoneRef}>
      <StatusBar t={t} />
      {loaded ? (
        <div style={{ display: 'contents' }}>
          <AppBar t={t} fileName={fileName} page={safePage} pageCount={pageCount}
            onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(pageCount, p + 1))} />
          <MobileTable t={t} cols={cols} rows={pageRows} colWidths={colWidths} pageStart={pageStart}
            streaming={streaming} selection={selection} cellFlag={cellFlag}
            onSelect={(row, column) => setSelection({ row, column })} />
        </div>
      ) : (
        <div style={{ display: 'contents' }}>
          <div style={{ height: 46, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${t.line}`, background: t.surface }}>
            <span style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, fontWeight: 600, color: t.ink3 }}>No file open</span>
          </div>
          <EmptyState t={t} dark={dark}
            onOpenSample={() => setOverlay('opensample')} onOpenLocal={() => setOverlay('openlocal')}
            onOpenUrl={() => { setOverlay('openurl'); setDialogErr(null); }} />
        </div>
      )}

      {/* bottom region: dock OR an input pane (keyboard / voice / history) */}
      {keyOpen ? (
        <KeyboardSheet t={t} panelBg={panelBg} draft={draft} onDraft={setDraft} onSend={() => runCommand()} onClose={() => setInputMode('none')} />
      ) : voiceOpen ? (
        <VoiceSheet t={t} panelBg={panelBg} phase={voicePhase} transcript={voiceText} onSend={sendVoice} onCancel={cancelVoice} />
      ) : histOpen ? (
        <HistorySheet t={t} panelBg={panelBg} labels={labels} times={times} cursor={cursor} now={now}
          onClose={() => setInputMode('none')} onJump={jumpTo} onUndo={doUndo} onRedo={doRedo} />
      ) : (
        <Dock t={t} variant={dockVariant} disabled={!loaded} canUndo={cursor > 0}
          onMenu={() => setOverlay('menu')} onUndo={doUndo}
          onHistory={() => { setNow(Date.now()); setSelection(null); setInputMode('history'); }}
          onKeyboard={() => { setSelection(null); setInputMode('keyboard'); }}
          onVoice={startVoice} />
      )}

      {/* overlays */}
      {overlay === 'menu' && <MenuDrawer t={t} dark={dark} loaded={loaded} onClose={() => setOverlay('none')} act={menuAct} />}
      {overlay === 'opensample' && (
        <BottomSheet t={t} title="Open sample" onClose={() => setOverlay('none')}>
          <SampleListBody t={t} onOpen={(name) => { setOverlay('none'); loadSample(name); }} />
        </BottomSheet>
      )}
      {overlay === 'openlocal' && (
        <BottomSheet t={t} title="Open local file" onClose={() => setOverlay('none')}>
          <LocalFileBody t={t} onOpen={(name) => { setOverlay('none'); loadSample(name); }} />
        </BottomSheet>
      )}
      {overlay === 'settings' && (
        <BottomSheet t={t} title="Settings" tall onClose={() => setOverlay('none')}>
          <ModelChooser t={t} provider="gemini" expandedProvider="gemini"
            primaryModel="gemini-3.5-flash" secondaryModel="gemini-3.5-flash"
            keys={{ gemini: 'AIzaSyD8eXampleKey', openai: '', anthropic: '' }} />
        </BottomSheet>
      )}
      {overlay === 'openurl' && (
        <BottomSheet t={t} title="Open from URL" onClose={() => setOverlay('none')}>
          <OpenUrlBody t={t} loading={false} error={dialogErr} setError={setDialogErr}
            onLoad={(name) => { setOverlay('none'); loadSample(name); }} />
        </BottomSheet>
      )}
      {overlay === 'save' && saveCfg && (
        <BottomSheet t={t} title={saveCfg.title} onClose={() => setOverlay('none')}>
          <SaveSheet t={t} cfg={saveCfg}
            onSave={(finalName) => { setOverlay('none'); addToast('info', `Saved ${finalName} to Downloads.`); }}
            onClose={() => setOverlay('none')} />
        </BottomSheet>
      )}
      {overlay === 'tours' && (
        <BottomSheet t={t} title="Tours" onClose={() => setOverlay('none')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: TT_S.px8 }}>
            <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.micro, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: t.ink3 }}>Clean up</div>
            <p style={{ margin: '0 0 4px', fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, color: t.ink3, lineHeight: 1.5 }}>
              Guided walkthroughs that replay a clean-up on the sample — no API key required.
            </p>
            {CLEANUP_TOURS.map((tr) => (
              <button key={tr.name} type="button" onClick={() => { setOverlay('none'); startTour(CLEANUP_TOURS.indexOf(tr)); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: TT_S.px10, padding: '12px 14px', borderRadius: 12,
                  border: `1px solid ${t.line2}`, background: t.surface2, color: t.ink, cursor: 'pointer',
                  fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, textAlign: 'left',
                }}>
                <span style={{ color: t.ink3, display: 'flex' }}><MIcon name="tour" size={18} /></span>
                <span style={{ flex: 1 }}>{tr.name}</span>
                <MIcon name="chevR" size={16} />
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      <MToasts t={t} toasts={toasts} onDismiss={(id) => setToasts((ts) => ts.filter((x) => x.id !== id))} />
      {tour && (() => {
        const stops = tourStops(CLEANUP_TOURS[tour.idx]);
        return (
          <TourSpotlight t={t} phoneRef={phoneRef} stop={stops[tour.stop]}
            stepNum={tour.stop + 1} total={stops.length} onNext={advanceTour} />
        );
      })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MobileApp />);
